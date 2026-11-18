import * as THREE from 'three';
import { ProceduralTexturePack } from '../textures';

export interface ForkliftRig {
  root: THREE.Group;
  rearLeftPivot: THREE.Group;
  rearRightPivot: THREE.Group;
  wheelMeshes: THREE.Object3D[];
  innerMast: THREE.Group;
  carriage: THREE.Group;
  mastTiltGroup: THREE.Group;
  beaconPivot: THREE.Group;
  beaconLightMesh: THREE.Mesh;
  headlightSpots: THREE.SpotLight[];
  headlightBulbs: THREE.Mesh[];
  tailLightBulbs: THREE.Mesh[];
  contactShadow: THREE.Mesh;
  /** World-space fork tip check point helper */
  forkTipMarker: THREE.Object3D;
  setForkHeight: (meters: number) => void;
  setHeadlights: (on: boolean) => void;
  setReversing: (reversing: boolean) => void;
}

export function createForkliftModel(textures: ProceduralTexturePack): ForkliftRig {
  const root = new THREE.Group();

  // Materials (varied roughness & metalness >= 0.25 contrast)
  const yellowPaintMat = new THREE.MeshStandardMaterial({
    color: 0xe89c14,
    roughness: 0.42,
    metalness: 0.18,
    flatShading: true,
  });
  const darkChassisMat = new THREE.MeshStandardMaterial({
    color: 0x22262b,
    roughness: 0.72,
    metalness: 0.35,
    flatShading: true,
  });
  const castIronMat = new THREE.MeshStandardMaterial({
    color: 0x333840,
    roughness: 0.58,
    metalness: 0.7,
    flatShading: true,
  });
  const steelForkMat = new THREE.MeshStandardMaterial({
    color: 0x8d97a4,
    roughness: 0.32,
    metalness: 0.85,
    flatShading: true,
  });
  const chromeRodMat = new THREE.MeshStandardMaterial({
    color: 0xdbe4ee,
    roughness: 0.16,
    metalness: 0.94,
  });
  const tireRubberMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c1f,
    roughness: 0.92,
    metalness: 0.04,
    flatShading: true,
  });
  const wheelRimMat = new THREE.MeshStandardMaterial({
    color: 0xd6931a,
    roughness: 0.45,
    metalness: 0.45,
    flatShading: true,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    map: textures.hazardStripes,
    roughness: 0.55,
    metalness: 0.1,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x2a2725,
    roughness: 0.88,
    metalness: 0.05,
    flatShading: true,
  });

  // Soft radial contact shadow under forklift
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 12, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.65, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 3.6),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.78,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.025, 0.05);
  root.add(contactShadow);

  // 1. Primary Chassis & Counterweight (+Z = front/forks, -Z = rear counterweight)
  const lowerFrame = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 2.08), darkChassisMat);
  lowerFrame.position.set(0, 0.41, -0.04);
  lowerFrame.castShadow = true;
  lowerFrame.receiveShadow = true;
  root.add(lowerFrame);

  // Chamfered yellow engine hood / body shell
  const bodyShell = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.42, 1.48), yellowPaintMat);
  bodyShell.position.set(0, 0.72, -0.34);
  bodyShell.castShadow = true;
  bodyShell.receiveShadow = true;
  root.add(bodyShell);

  // Tapered heavy counterweight at rear
  const counterweight = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.68, 0.56), yellowPaintMat);
  counterweight.position.set(0, 0.62, -0.94);
  counterweight.castShadow = true;
  counterweight.receiveShadow = true;
  root.add(counterweight);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.18, 0.08), hazardMat);
  rearBumper.position.set(0, 0.38, -1.21);
  rearBumper.castShadow = true;
  root.add(rearBumper);

  // Front fenders & step plates
  for (const side of [-1, 1]) {
    const frontFender = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.72), darkChassisMat);
    frontFender.position.set(side * 0.58, 0.64, 0.54);
    frontFender.castShadow = true;
    root.add(frontFender);

    const sideStep = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.58), castIronMat);
    sideStep.position.set(side * 0.62, 0.38, 0.02);
    sideStep.castShadow = true;
    root.add(sideStep);
  }

  // Exhaust stack on rear left
  const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.85, 8), castIronMat);
  exhaustPipe.position.set(-0.44, 1.24, -0.92);
  exhaustPipe.castShadow = true;
  root.add(exhaustPipe);
  const exhaustTip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.12, 8), chromeRodMat);
  exhaustTip.position.set(-0.44, 1.69, -0.95);
  exhaustTip.rotation.x = -0.35;
  root.add(exhaustTip);

  // 2. Wheels (Front = large drive wheels, Rear = smaller steerable wheels)
  const wheelMeshes: THREE.Object3D[] = [];
  const makeWheel = (radius: number, width: number): THREE.Group => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 14), tireRubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    tire.receiveShadow = true;
    wg.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width + 0.02, 10), wheelRimMat);
    rim.rotation.z = Math.PI / 2;
    wg.add(rim);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width + 0.05, 8), castIronMat);
    hub.rotation.z = Math.PI / 2;
    wg.add(hub);
    return wg;
  };

  // Front drive axle (radius 0.34)
  for (const side of [-1, 1]) {
    const fw = makeWheel(0.34, 0.24);
    fw.position.set(side * 0.56, 0.34, 0.64);
    root.add(fw);
    wheelMeshes.push(fw);
  }

  // Rear steer axle (radius 0.26)
  const rearLeftPivot = new THREE.Group();
  rearLeftPivot.position.set(-0.52, 0.26, -0.78);
  const rlWheel = makeWheel(0.26, 0.19);
  rearLeftPivot.add(rlWheel);
  root.add(rearLeftPivot);
  wheelMeshes.push(rlWheel);

  const rearRightPivot = new THREE.Group();
  rearRightPivot.position.set(0.52, 0.26, -0.78);
  const rrWheel = makeWheel(0.26, 0.19);
  rearRightPivot.add(rrWheel);
  root.add(rearRightPivot);
  wheelMeshes.push(rrWheel);

  // 3. Operator Cabin, Seat, Controls & Overhead Guard
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.44), seatMat);
  seatBase.position.set(0, 0.98, -0.14);
  seatBase.castShadow = true;
  root.add(seatBase);

  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.11), seatMat);
  seatBack.position.set(0, 1.24, -0.34);
  seatBack.rotation.x = -0.15;
  seatBack.castShadow = true;
  root.add(seatBack);

  // Steering column + wheel + hydraulic levers
  const dashTower = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.22), darkChassisMat);
  dashTower.position.set(0, 1.08, 0.42);
  dashTower.rotation.x = -0.22;
  dashTower.castShadow = true;
  root.add(dashTower);

  const steeringCol = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.35, 8), castIronMat);
  steeringCol.position.set(0, 1.32, 0.34);
  steeringCol.rotation.x = -0.52;
  root.add(steeringCol);

  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.024, 6, 12), tireRubberMat);
  steeringWheel.position.set(0, 1.46, 0.25);
  steeringWheel.rotation.x = Math.PI / 2 - 0.52;
  root.add(steeringWheel);

  // Hydraulic control levers
  for (let i = 0; i < 2; i++) {
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), chromeRodMat);
    lever.position.set(0.22 + i * 0.07, 1.28, 0.36);
    lever.rotation.x = 0.15;
    root.add(lever);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), tireRubberMat);
    knob.position.set(0.22 + i * 0.07, 1.39, 0.38);
    root.add(knob);
  }

  // Roll cage pillars
  const frontPillarGeo = new THREE.CylinderGeometry(0.034, 0.034, 1.38, 6);
  for (const side of [-1, 1]) {
    const fPillar = new THREE.Mesh(frontPillarGeo, darkChassisMat);
    fPillar.position.set(side * 0.52, 1.48, 0.56);
    fPillar.rotation.x = -0.18;
    fPillar.castShadow = true;
    root.add(fPillar);

    const rPillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.24, 0.08), darkChassisMat);
    rPillar.position.set(side * 0.52, 1.46, -0.58);
    rPillar.castShadow = true;
    root.add(rPillar);
  }

  // Overhead protective roof frame + slatted guard bars
  const roofFrame = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.07, 1.12), darkChassisMat);
  roofFrame.position.set(0, 2.08, -0.06);
  roofFrame.castShadow = true;
  root.add(roofFrame);

  for (let i = -2; i <= 2; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 1.04), castIronMat);
    slat.position.set(i * 0.19, 2.11, -0.06);
    root.add(slat);
  }

  // Amber safety beacon on roof
  const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.05, 8), darkChassisMat);
  beaconBase.position.set(0, 2.14, -0.45);
  root.add(beaconBase);

  const beaconPivot = new THREE.Group();
  beaconPivot.position.set(0, 2.21, -0.45);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff8800,
    emissive: 0xff6600,
    emissiveIntensity: 1.2,
    roughness: 0.25,
    metalness: 0.1,
  });
  const beaconLightMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.12, 8), beaconMat);
  beaconPivot.add(beaconLightMesh);
  root.add(beaconPivot);

  // Work Headlights + Taillights
  const headlightBulbs: THREE.Mesh[] = [];
  const headlightSpots: THREE.SpotLight[] = [];
  const tailLightBulbs: THREE.Mesh[] = [];

  for (const side of [-1, 1]) {
    const lampHousing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.11), darkChassisMat);
    lampHousing.position.set(side * 0.44, 1.66, 0.48);
    root.add(lampHousing);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      emissive: 0xffe49e,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.03), bulbMat);
    bulb.position.set(side * 0.44, 1.66, 0.54);
    root.add(bulb);
    headlightBulbs.push(bulb);

    const spot = new THREE.SpotLight(0xfff1c9, 3.2, 26, Math.PI / 5, 0.45, 1.5);
    spot.position.set(side * 0.44, 1.66, 0.55);
    spot.target.position.set(side * 0.44, 0.1, 9.0);
    spot.castShadow = false;
    root.add(spot);
    root.add(spot.target);
    headlightSpots.push(spot);

    // Rear tail/reverse lamps
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.04), tailMat);
    tail.position.set(side * 0.44, 0.78, -1.22);
    root.add(tail);
    tailLightBulbs.push(tail);
  }

  // 4. Articulated Mast & Forks (+Z side)
  const mastTiltGroup = new THREE.Group();
  mastTiltGroup.position.set(0, 0.24, 1.02);
  mastTiltGroup.rotation.x = -0.025; // slight safe backward tilt
  root.add(mastTiltGroup);

  // Outer mast channels
  for (const side of [-1, 1]) {
    const outerRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.08, 0.12), darkChassisMat);
    outerRail.position.set(side * 0.36, 1.04, 0);
    outerRail.castShadow = true;
    mastTiltGroup.add(outerRail);
  }
  const outerCrossTop = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.1, 0.1), darkChassisMat);
  outerCrossTop.position.set(0, 2.05, 0);
  mastTiltGroup.add(outerCrossTop);

  // Center hydraulic lift cylinder
  const liftCylinderBase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.55, 8), castIronMat);
  liftCylinderBase.position.set(0, 0.84, 0.01);
  mastTiltGroup.add(liftCylinderBase);

  // Inner telescoping mast
  const innerMast = new THREE.Group();
  mastTiltGroup.add(innerMast);

  for (const side of [-1, 1]) {
    const innerRail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 1.98, 0.09), castIronMat);
    innerRail.position.set(side * 0.29, 1.06, 0.03);
    innerRail.castShadow = true;
    innerMast.add(innerRail);
  }
  const innerCross = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.09, 0.08), castIronMat);
  innerCross.position.set(0, 2.02, 0.03);
  innerMast.add(innerCross);

  const chromePiston = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.45, 8), chromeRodMat);
  chromePiston.position.set(0, 1.25, 0.01);
  innerMast.add(chromePiston);

  // Fork carriage & load backrest
  const carriage = new THREE.Group();
  mastTiltGroup.add(carriage);

  const carriagePlate = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.28, 0.06), darkChassisMat);
  carriagePlate.position.set(0, 0.14, 0.11);
  carriagePlate.castShadow = true;
  carriage.add(carriagePlate);

  // Load backrest bars
  for (let i = -2; i <= 2; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.62, 0.035), darkChassisMat);
    bar.position.set(i * 0.21, 0.56, 0.1);
    bar.castShadow = true;
    carriage.add(bar);
  }
  const backrestTop = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.045, 0.045), darkChassisMat);
  backrestTop.position.set(0, 0.87, 0.1);
  carriage.add(backrestTop);

  // Left and right tapered forks
  for (const side of [-1, 1]) {
    const forkVertical = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.05), steelForkMat);
    forkVertical.position.set(side * 0.26, 0.08, 0.16);
    forkVertical.castShadow = true;
    carriage.add(forkVertical);

    const forkBlade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 1.08), steelForkMat);
    forkBlade.position.set(side * 0.26, -0.07, 0.7);
    forkBlade.castShadow = true;
    forkBlade.receiveShadow = true;
    carriage.add(forkBlade);
  }

  const forkTipMarker = new THREE.Object3D();
  forkTipMarker.position.set(0, -0.05, 0.72);
  carriage.add(forkTipMarker);

  const setForkHeight = (meters: number) => {
    const clamped = THREE.MathUtils.clamp(meters, 0.08, 2.65);
    // Lower half lifts carriage inside mast; upper half telescopes innerMast too
    const carriageY = clamped - 0.14;
    carriage.position.y = carriageY;
    const mastLift = Math.max(0, clamped - 1.35);
    innerMast.position.y = mastLift;
  };
  setForkHeight(0.12);

  const setHeadlights = (on: boolean) => {
    headlightSpots.forEach((s) => {
      s.intensity = on ? 3.2 : 0;
    });
    headlightBulbs.forEach((b) => {
      const mat = b.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = on ? 2.0 : 0.05;
    });
  };

  const setReversing = (reversing: boolean) => {
    tailLightBulbs.forEach((b) => {
      const mat = b.material as THREE.MeshStandardMaterial;
      mat.color.setHex(reversing ? 0xffffff : 0xef4444);
      mat.emissive.setHex(reversing ? 0xffe8a3 : 0x991b1b);
      mat.emissiveIntensity = reversing ? 1.8 : 0.6;
    });
  };

  return {
    root,
    rearLeftPivot,
    rearRightPivot,
    wheelMeshes,
    innerMast,
    carriage,
    mastTiltGroup,
    beaconPivot,
    beaconLightMesh,
    headlightSpots,
    headlightBulbs,
    tailLightBulbs,
    contactShadow,
    forkTipMarker,
    setForkHeight,
    setHeadlights,
    setReversing,
  };
}
