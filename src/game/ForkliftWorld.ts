import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { YardAudioEngine } from './audio';
import { createEnvironment } from './models/environment';
import { createForkliftModel, ForkliftRig } from './models/forklift';
import { createYardProps } from './models/yardProps';
import { createProceduralTextures, ProceduralTexturePack } from './textures';
import {
  CameraMode,
  CargoLoadItem,
  ControlInputs,
  ForkliftTelemetry,
  OrientedBoxCollider,
} from './types';

// Module-scope reusable math objects (Zero GC in render loop)
const _v1 = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();

export interface ForkliftWorldCallbacks {
  onTelemetry: (data: ForkliftTelemetry) => void;
  onEventToast: (message: string) => void;
  onContextLost: () => void;
}

export class ForkliftWorld {
  private container: HTMLElement;
  private callbacks: ForkliftWorldCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private orbitControls: OrbitControls;
  private isSoftwareGl: boolean;

  private textures: ProceduralTexturePack;
  private forklift: ForkliftRig;
  private colliders: OrientedBoxCollider[] = [];
  private cargoItems: CargoLoadItem[] = [];
  private dropZone!: {
    centerX: number;
    centerZ: number;
    halfW: number;
    halfD: number;
    slots: Array<{ x: number; z: number; rotY: number }>;
  };
  private dropZoneBeaconMat!: THREE.MeshStandardMaterial;
  private audio = new YardAudioEngine();

  // Dust particle pool behind rear wheels
  private dustPoints: THREE.Points;
  private dustPositions: Float32Array;
  private dustLife: Float32Array;
  private dustCursor = 0;

  // Vehicle physics state
  private posX = 0;
  private posZ = 17.0;
  private yaw = Math.PI; // Facing -Z (into the salvage yard)
  private speed = 0; // m/s
  private steerAngle = 0; // rad
  private forkHeight = 0.14; // meters
  private headlightsOn = true;
  private cameraMode: CameraMode = 'chase';
  private carriedCargo: CargoLoadItem | null = null;
  private deliveredCount = 0;
  private pickupCooldown = 0;
  private bumpSoundCooldown = 0;

  // Input states
  private keys: Record<string, boolean> = {};
  private uiInputs: ControlInputs = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    forkUp: false,
    forkDown: false,
  };

  // Loop & lifecycle
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private lastTelemetryTime = 0;
  private camSmoothPos = new THREE.Vector3(0, 6, 25);
  private camSmoothLook = new THREE.Vector3(0, 1.2, 14);

  constructor(container: HTMLElement, callbacks: ForkliftWorldCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Software WebGL probe (renderer string only)
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Renderer setup
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. Scene, Sky, Atmospheric Fog & Environment Map
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xaec8dc);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0xaec8dc, 0.0046);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Camera & OrbitControls (for orbit inspection mode)
    this.camera = new THREE.PerspectiveCamera(56, width / height, 0.2, 420);
    this.camera.position.copy(this.camSmoothPos);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = !this.isSoftwareGl;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.orbitControls.minDistance = 4;
    this.orbitControls.maxDistance = 58;
    this.orbitControls.enabled = false;

    // 5. Three-Point Outdoor Daylight Rig (Warm Sun + Cool Sky/Ground + Mountain Rim)
    const hemiLight = new THREE.HemisphereLight(0x9bd0ff, 0x5c5346, 0.85);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff0d2, 2.25);
    sunLight.position.set(36, 48, 32);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 6;
    sunLight.shadow.camera.far = 140;
    const d = 38;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.025;
    this.scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xc2dcf5, 0.55);
    rimLight.position.set(-28, 22, -45);
    this.scene.add(rimLight);

    // 6. Procedural Textures & 3D World Assembly
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    const env = createEnvironment(this.textures);
    this.scene.add(env.group);
    this.colliders.push(...env.colliders);

    const props = createYardProps(this.textures);
    this.scene.add(props.group);
    this.colliders.push(...props.colliders);
    this.cargoItems = props.cargoItems;
    this.dropZone = props.dropZone;
    this.dropZoneBeaconMat = props.dropZoneBeaconMat;

    // 7. Player Forklift
    this.forklift = createForkliftModel(this.textures);
    this.forklift.root.position.set(this.posX, 0, this.posZ);
    this.forklift.root.rotation.y = this.yaw;
    this.forklift.setHeadlights(this.headlightsOn);
    this.scene.add(this.forklift.root);

    // 8. Gravel dust puff particle pool
    const dustCount = 48;
    this.dustPositions = new Float32Array(dustCount * 3);
    this.dustLife = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      this.dustPositions[i * 3 + 1] = -10;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xa69d8e,
      size: 0.38,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.dustPoints.frustumCulled = false;
    this.scene.add(this.dustPoints);

    // Pre-warm shaders on GPU devices
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 9. Event Listeners
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerUnlock);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);

    this.emitTelemetry(true);
    this.tick();
  }

  private handlePointerUnlock = () => {
    this.audio.unlock();
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.callbacks.onContextLost();
  };

  private handleResize = () => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.audio.unlock();
    this.keys[e.code] = true;

    if (e.code === 'KeyC') {
      this.cycleCameraMode();
    } else if (e.code === 'KeyL') {
      this.toggleHeadlights();
    } else if (e.code === 'KeyH') {
      this.triggerHorn();
    } else if (e.code === 'KeyF') {
      this.dropCarriedCargoInPlace();
    } else if (e.code === 'KeyR') {
      this.resetForkliftPosition();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  public setUiInput(key: keyof ControlInputs, active: boolean): void {
    this.audio.unlock();
    this.uiInputs[key] = active;
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.orbitControls.enabled = mode === 'orbit';
    if (mode === 'orbit') {
      this.orbitControls.target.set(this.posX, 1.4, this.posZ);
      this.camera.position.set(this.posX + 9, 7.5, this.posZ + 11);
      this.orbitControls.update();
    }
    this.emitTelemetry(true);
  }

  public cycleCameraMode(): void {
    const order: CameraMode[] = ['chase', 'close', 'cabin', 'orbit'];
    const next = order[(order.indexOf(this.cameraMode) + 1) % order.length];
    this.setCameraMode(next);
  }

  public toggleHeadlights(): void {
    this.headlightsOn = !this.headlightsOn;
    this.forklift.setHeadlights(this.headlightsOn);
    this.emitTelemetry(true);
  }

  public triggerHorn(): void {
    this.audio.playHorn();
  }

  public setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  public resetForkliftPosition(): void {
    this.posX = 0;
    this.posZ = 17.0;
    this.yaw = Math.PI;
    this.speed = 0;
    this.steerAngle = 0;
    this.forklift.root.position.set(this.posX, 0, this.posZ);
    this.forklift.root.rotation.y = this.yaw;
    this.callbacks.onEventToast('Погрузчик возвращён ко въезду');
    this.emitTelemetry(true);
  }

  public resetAllCargo(): void {
    this.carriedCargo = null;
    this.deliveredCount = 0;
    this.cargoItems.forEach((item) => {
      item.state = 'ground';
      item.group.position.set(item.homeX, 0, item.homeZ);
      item.group.rotation.set(0, item.homeRotY, 0);
    });
    this.resetForkliftPosition();
    this.callbacks.onEventToast('Смена начата заново');
    this.emitTelemetry(true);
  }

  public dropCarriedCargoInPlace(): void {
    if (!this.carriedCargo) return;
    const item = this.carriedCargo;
    if (this.isInsideDropZone(item.group.position.x, item.group.position.z)) {
      this.completeDelivery(item);
      return;
    }
    item.state = 'ground';
    item.group.position.y = 0;
    item.group.rotation.set(0, this.yaw, 0);
    this.carriedCargo = null;
    this.pickupCooldown = 0.7;
    this.audio.playPickup();
    this.callbacks.onEventToast(`Опущено: ${item.title}`);
    this.emitTelemetry(true);
  }

  private isInsideDropZone(x: number, z: number): boolean {
    return (
      Math.abs(x - this.dropZone.centerX) <= this.dropZone.halfW + 0.35 &&
      Math.abs(z - this.dropZone.centerZ) <= this.dropZone.halfD + 0.35
    );
  }

  private completeDelivery(item: CargoLoadItem): void {
    const slot = this.dropZone.slots[item.slotIndex % this.dropZone.slots.length];
    item.state = 'delivered';
    item.group.position.set(slot.x, 0.04, slot.z);
    item.group.rotation.set(0, slot.rotY, 0);
    this.carriedCargo = null;
    this.deliveredCount = this.cargoItems.filter((c) => c.state === 'delivered').length;
    this.pickupCooldown = 0.5;
    this.audio.playDelivery();
    if (this.deliveredCount === this.cargoItems.length) {
      this.callbacks.onEventToast('Все грузы доставлены в зону погрузки!');
    } else {
      this.callbacks.onEventToast(`Доставлено (${this.deliveredCount}/${this.cargoItems.length}): ${item.title}`);
    }
    this.emitTelemetry(true);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;

    this.updatePhysics(dt, elapsed);
    this.updateCargoInteraction();
    this.updateDust(dt);
    this.updateCamera(dt);

    // Subtle beacon spin & drop-zone indicator pulse
    this.forklift.beaconPivot.rotation.y += dt * 7.5;
    this.dropZoneBeaconMat.emissiveIntensity = this.carriedCargo
      ? 1.1 + Math.sin(elapsed * 5.0) * 0.65
      : 0.55;

    this.renderer.render(this.scene, this.camera);
    this.emitTelemetry(false);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private updatePhysics(dt: number, elapsed: number): void {
    if (this.pickupCooldown > 0) this.pickupCooldown -= dt;
    if (this.bumpSoundCooldown > 0) this.bumpSoundCooldown -= dt;

    const forwardInput =
      this.keys['KeyW'] || this.keys['ArrowUp'] || this.uiInputs.forward ? 1 : 0;
    const backwardInput =
      this.keys['KeyS'] || this.keys['ArrowDown'] || this.uiInputs.backward ? 1 : 0;
    const leftInput =
      this.keys['KeyA'] || this.keys['ArrowLeft'] || this.uiInputs.left ? 1 : 0;
    const rightInput =
      this.keys['KeyD'] || this.keys['ArrowRight'] || this.uiInputs.right ? 1 : 0;
    const forkUpInput =
      this.keys['KeyE'] || this.keys['Space'] || this.uiInputs.forkUp ? 1 : 0;
    const forkDownInput =
      this.keys['KeyQ'] || this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.uiInputs.forkDown ? 1 : 0;

    // 1. Fork lift / lower
    const forkDelta = forkUpInput - forkDownInput;
    if (forkDelta !== 0) {
      this.forkHeight = THREE.MathUtils.clamp(this.forkHeight + forkDelta * 1.15 * dt, 0.08, 2.65);
      this.forklift.setForkHeight(this.forkHeight);
    }

    // 2. Longitudinal acceleration & braking
    const throttle = forwardInput - backwardInput;
    const maxForwardSpeed = 7.4; // ~26.6 km/h realistic yard forklift top speed
    const maxReverseSpeed = 4.8;

    if (throttle > 0) {
      this.speed += (this.speed < 0 ? 15.0 : 8.5) * dt;
    } else if (throttle < 0) {
      this.speed -= (this.speed > 0 ? 15.0 : 6.8) * dt;
    } else {
      // Smooth rolling drag
      this.speed = THREE.MathUtils.damp(this.speed, 0, 5.2, dt);
      if (Math.abs(this.speed) < 0.03) this.speed = 0;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, -maxReverseSpeed, maxForwardSpeed);

    // 3. Rear-wheel steering (+X is left when yaw=0 facing +Z, so left = +steer)
    const targetSteer = (leftInput - rightInput) * 0.54;
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, targetSteer, 9.5, dt);

    // Visual rear wheel turn (tail swings opposite)
    this.forklift.rearLeftPivot.rotation.y = -this.steerAngle;
    this.forklift.rearRightPivot.rotation.y = -this.steerAngle;

    // Turning rate proportional to speed (with gentle pivot feel)
    const wheelbase = 1.48;
    if (Math.abs(this.speed) > 0.05) {
      const turnRate = (this.speed / wheelbase) * Math.tan(this.steerAngle) * 0.92;
      this.yaw += turnRate * dt;
    }

    // Integrate XY position
    const dirX = Math.sin(this.yaw);
    const dirZ = Math.cos(this.yaw);
    const prevX = this.posX;
    const prevZ = this.posZ;
    this.posX += dirX * this.speed * dt;
    this.posZ += dirZ * this.speed * dt;

    // 4. Resolve OBB collisions using two spheres along forklift body
    const collided = this.resolveCollisions();
    if (collided) {
      const movedDist = Math.hypot(this.posX - prevX, this.posZ - prevZ);
      if (Math.abs(this.speed) > 2.1 && this.bumpSoundCooldown <= 0) {
        this.audio.playBump();
        this.bumpSoundCooldown = 0.45;
      }
      if (movedDist < 0.002) {
        this.speed *= 0.3;
      } else {
        this.speed *= 0.72;
      }
    }

    // Apply transform & spin wheels
    this.forklift.root.position.set(this.posX, 0, this.posZ);
    this.forklift.root.rotation.y = this.yaw;

    // Subtle chassis pitch on acceleration/braking
    const pitchTarget = -throttle * 0.014;
    this.forklift.root.rotation.x = THREE.MathUtils.damp(this.forklift.root.rotation.x, pitchTarget, 8, dt);

    const frontRot = (this.speed * dt) / 0.34;
    const rearRot = (this.speed * dt) / 0.26;
    this.forklift.wheelMeshes[0].rotation.x += frontRot;
    this.forklift.wheelMeshes[1].rotation.x += frontRot;
    this.forklift.wheelMeshes[2].rotation.x += rearRot;
    this.forklift.wheelMeshes[3].rotation.x += rearRot;

    const reversing = this.speed < -0.15 || (throttle < 0 && this.speed <= 0.1);
    this.forklift.setReversing(reversing);

    // Emit gravel dust when driving briskly
    if (Math.abs(this.speed) > 2.2 && Math.random() < 0.45) {
      const idx = this.dustCursor;
      this.dustCursor = (this.dustCursor + 1) % this.dustLife.length;
      const side = (Math.random() - 0.5) * 0.9;
      this.dustPositions[idx * 3] = this.posX - dirX * 1.1 + dirZ * side;
      this.dustPositions[idx * 3 + 1] = 0.16;
      this.dustPositions[idx * 3 + 2] = this.posZ - dirZ * 1.1 - dirX * side;
      this.dustLife[idx] = 0.65;
    }

    // Update audio engine
    this.audio.update(this.speed / maxForwardSpeed, reversing, forkDelta !== 0, elapsed);
  }

  private resolveCollisions(): boolean {
    let hit = false;
    const dirX = Math.sin(this.yaw);
    const dirZ = Math.cos(this.yaw);

    // Two body spheres: main chassis (-0.25) and front mast/forks (+0.95)
    const checks = [
      { offset: -0.25, radius: 0.78 },
      { offset: 0.95, radius: 0.68 },
    ];

    for (const c of checks) {
      let cx = this.posX + dirX * c.offset;
      let cz = this.posZ + dirZ * c.offset;

      for (let i = 0; i < this.colliders.length; i++) {
        const box = this.colliders[i];
        const dx = cx - box.x;
        const dz = cz - box.z;
        const cos = Math.cos(-box.rotY);
        const sin = Math.sin(-box.rotY);

        // Transform sphere center to box local XZ
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;

        const clampedX = THREE.MathUtils.clamp(lx, -box.halfW, box.halfW);
        const clampedZ = THREE.MathUtils.clamp(lz, -box.halfD, box.halfD);

        const diffX = lx - clampedX;
        const diffZ = lz - clampedZ;
        const distSq = diffX * diffX + diffZ * diffZ;

        if (distSq < c.radius * c.radius) {
          hit = true;
          let pushLx = 0;
          let pushLz = 0;

          if (distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const overlap = c.radius - dist;
            pushLx = (diffX / dist) * overlap;
            pushLz = (diffZ / dist) * overlap;
          } else {
            // Center inside box: push out along nearest edge
            const penX = box.halfW - Math.abs(lx) + c.radius;
            const penZ = box.halfD - Math.abs(lz) + c.radius;
            if (penX < penZ) {
              pushLx = lx >= 0 ? penX : -penX;
            } else {
              pushLz = lz >= 0 ? penZ : -penZ;
            }
          }

          // Rotate push back to world space
          const wCos = Math.cos(box.rotY);
          const wSin = Math.sin(box.rotY);
          const pushWx = pushLx * wCos - pushLz * wSin;
          const pushWz = pushLx * wSin + pushLz * wCos;

          this.posX += pushWx;
          this.posZ += pushWz;
          cx += pushWx;
          cz += pushWz;
        }
      }
    }
    return hit;
  }

  private updateCargoInteraction(): void {
    // Get fork tip world position
    this.forklift.root.updateMatrixWorld(true);
    this.forklift.forkTipMarker.getWorldPosition(_v1);

    if (!this.carriedCargo && this.pickupCooldown <= 0 && this.forkHeight <= 0.34) {
      for (const item of this.cargoItems) {
        if (item.state !== 'ground') continue;
        const dist = Math.hypot(_v1.x - item.group.position.x, _v1.z - item.group.position.z);
        if (dist < 1.05) {
          item.state = 'carried';
          this.carriedCargo = item;
          this.audio.playPickup();
          this.callbacks.onEventToast(`Поднято: ${item.title}. Отвезите в зону погрузки!`);
          this.emitTelemetry(true);
          break;
        }
      }
    }

    if (this.carriedCargo) {
      const item = this.carriedCargo;
      const dirX = Math.sin(this.yaw);
      const dirZ = Math.cos(this.yaw);
      const cx = this.posX + dirX * 1.72;
      const cz = this.posZ + dirZ * 1.72;

      item.group.position.set(cx, this.forkHeight + 0.04, cz);
      item.group.rotation.set(0, this.yaw, 0);

      // Deliver automatically when lowered inside Loading Drop Zone
      if (this.forkHeight <= 0.24 && this.isInsideDropZone(cx, cz)) {
        this.completeDelivery(item);
      }
    }
  }

  private updateDust(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.dustLife.length; i++) {
      if (this.dustLife[i] > 0) {
        this.dustLife[i] -= dt;
        this.dustPositions[i * 3 + 1] += dt * 0.65;
        if (this.dustLife[i] <= 0) {
          this.dustPositions[i * 3 + 1] = -10;
        }
        dirty = true;
      }
    }
    if (dirty) {
      this.dustPoints.geometry.attributes.position.needsUpdate = true;
    }
  }

  private updateCamera(dt: number): void {
    if (this.cameraMode === 'orbit') {
      this.orbitControls.update();
      return;
    }

    const dirX = Math.sin(this.yaw);
    const dirZ = Math.cos(this.yaw);

    if (this.cameraMode === 'cabin') {
      // Operator eye inside roll cage looking forward over forks
      _camTargetPos.set(this.posX - dirX * 0.14, 1.82, this.posZ - dirZ * 0.14);
      _camTargetLook.set(this.posX + dirX * 9.0, 1.25 + this.forkHeight * 0.15, this.posZ + dirZ * 9.0);
      this.camera.position.copy(_camTargetPos);
      this.camera.lookAt(_camTargetLook);
      return;
    }

    const dist = this.cameraMode === 'close' ? 4.8 : 7.6;
    const height = this.cameraMode === 'close' ? 2.65 : 4.1;
    const lookAhead = this.cameraMode === 'close' ? 2.4 : 2.8;

    _camTargetPos.set(this.posX - dirX * dist, height, this.posZ - dirZ * dist);
    _camTargetLook.set(this.posX + dirX * lookAhead, 1.15, this.posZ + dirZ * lookAhead);

    // Prevent camera from dipping below ground
    _camTargetPos.y = Math.max(1.2, _camTargetPos.y);

    const dampFactor = 6.5;
    this.camSmoothPos.x = THREE.MathUtils.damp(this.camSmoothPos.x, _camTargetPos.x, dampFactor, dt);
    this.camSmoothPos.y = THREE.MathUtils.damp(this.camSmoothPos.y, _camTargetPos.y, dampFactor, dt);
    this.camSmoothPos.z = THREE.MathUtils.damp(this.camSmoothPos.z, _camTargetPos.z, dampFactor, dt);

    this.camSmoothLook.x = THREE.MathUtils.damp(this.camSmoothLook.x, _camTargetLook.x, 8.5, dt);
    this.camSmoothLook.y = THREE.MathUtils.damp(this.camSmoothLook.y, _camTargetLook.y, 8.5, dt);
    this.camSmoothLook.z = THREE.MathUtils.damp(this.camSmoothLook.z, _camTargetLook.z, 8.5, dt);

    this.camera.position.copy(this.camSmoothPos);
    this.camera.lookAt(this.camSmoothLook);
  }

  private emitTelemetry(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastTelemetryTime < 90) return;
    this.lastTelemetryTime = now;

    const nearDropZone = this.carriedCargo
      ? this.isInsideDropZone(this.carriedCargo.group.position.x, this.carriedCargo.group.position.z)
      : false;

    this.callbacks.onTelemetry({
      speedKmh: Math.round(Math.abs(this.speed) * 3.6),
      forkHeightMeters: Number(this.forkHeight.toFixed(2)),
      carryingTitle: this.carriedCargo ? this.carriedCargo.title : null,
      deliveredCount: this.deliveredCount,
      totalCargoCount: this.cargoItems.length,
      headlightsOn: this.headlightsOn,
      reverseActive: this.speed < -0.15,
      cameraMode: this.cameraMode,
      shiftCompleted: this.deliveredCount >= this.cargoItems.length,
      nearDropZone,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerUnlock);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.orbitControls.dispose();
    this.textures.dispose();
    this.audio.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
