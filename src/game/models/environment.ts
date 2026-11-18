import * as THREE from 'three';
import { ProceduralTexturePack } from '../textures';
import { OrientedBoxCollider } from '../types';

export interface EnvironmentBuildResult {
  group: THREE.Group;
  colliders: OrientedBoxCollider[];
}

// Deterministic pseudo-random helper so the forest & mountain look identical on every load
function makeRng(seedStart: number): () => number {
  let seed = seedStart;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function createEnvironment(textures: ProceduralTexturePack): EnvironmentBuildResult {
  const group = new THREE.Group();
  const colliders: OrientedBoxCollider[] = [];
  const rand = makeRng(7331);

  // 1. Expansive Outer Meadow / Forest Ground (no void edges)
  const outerGroundMat = new THREE.MeshStandardMaterial({
    color: 0x465839,
    roughness: 0.96,
    metalness: 0.0,
    flatShading: true,
  });
  const outerGround = new THREE.Mesh(new THREE.PlaneGeometry(680, 680), outerGroundMat);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.02;
  outerGround.receiveShadow = true;
  group.add(outerGround);

  // 2. Salvage Yard Ground Pad (56m x 46m compacted gravel & oil stains)
  const yardGroundMat = new THREE.MeshStandardMaterial({
    map: textures.yardGround,
    roughness: 0.92,
    metalness: 0.02,
  });
  const yardGround = new THREE.Mesh(new THREE.PlaneGeometry(56, 46), yardGroundMat);
  yardGround.rotation.x = -Math.PI / 2;
  yardGround.position.y = 0.0;
  yardGround.receiveShadow = true;
  group.add(yardGround);

  // Concrete apron leading from gate (+Z=23) to the road (+Z=27.5)
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x7b7e82,
    roughness: 0.88,
    metalness: 0.04,
  });
  const apron = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.04, 6.2), apronMat);
  apron.position.set(0, 0.005, 25.0);
  apron.receiveShadow = true;
  group.add(apron);

  // 3. Asphalt Road outside the front fence (runs East-West along X at Z = 32.5)
  const roadShoulderMat = new THREE.MeshStandardMaterial({
    color: 0x676258,
    roughness: 0.95,
    metalness: 0.0,
  });
  const roadShoulder = new THREE.Mesh(new THREE.BoxGeometry(480, 0.03, 12.6), roadShoulderMat);
  roadShoulder.position.set(0, 0.005, 32.5);
  roadShoulder.receiveShadow = true;
  group.add(roadShoulder);

  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.asphaltRoad,
    roughness: 0.84,
    metalness: 0.04,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(480, 9.2), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.025, 32.5);
  road.receiveShadow = true;
  group.add(road);

  // Road guardrails & kilometer posts on the far side of the road
  const railMetalMat = new THREE.MeshStandardMaterial({
    color: 0x9aa3ad,
    roughness: 0.42,
    metalness: 0.72,
    flatShading: true,
  });
  const guardrailBeam = new THREE.Mesh(new THREE.BoxGeometry(220, 0.22, 0.08), railMetalMat);
  guardrailBeam.position.set(0, 0.68, 37.8);
  guardrailBeam.castShadow = true;
  group.add(guardrailBeam);

  for (let x = -108; x <= 108; x += 6) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), railMetalMat);
    post.position.set(x, 0.42, 37.85);
    post.castShadow = true;
    group.add(post);
  }

  // Roadside yard signboard near entrance
  const signPostMat = new THREE.MeshStandardMaterial({ color: 0x525861, roughness: 0.5, metalness: 0.7 });
  const signLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), signPostMat);
  signLeft.position.set(7.6, 1.6, 25.4);
  signLeft.castShadow = true;
  group.add(signLeft);
  const signRight = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), signPostMat);
  signRight.position.set(10.6, 1.6, 25.4);
  signRight.castShadow = true;
  group.add(signRight);

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 192;
  const sctx = signCanvas.getContext('2d')!;
  sctx.fillStyle = '#1e293b';
  sctx.fillRect(0, 0, 512, 192);
  sctx.strokeStyle = '#f59e0b';
  sctx.lineWidth = 10;
  sctx.strokeRect(10, 10, 492, 172);
  sctx.fillStyle = '#f8fafc';
  sctx.font = 'bold 46px sans-serif';
  sctx.textAlign = 'center';
  sctx.fillText('АВТОРАЗБОРКА', 256, 86);
  sctx.fillStyle = '#fbbf24';
  sctx.font = 'bold 28px monospace';
  sctx.fillText('ПРИЁМ · ЗАПЧАСТИ · ЛОМ', 256, 140);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  signTex.anisotropy = 4;

  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(3.3, 1.25, 0.1),
    [
      signPostMat,
      signPostMat,
      signPostMat,
      signPostMat,
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 }),
      signPostMat,
    ],
  );
  signBoard.position.set(9.1, 2.55, 25.4);
  signBoard.castShadow = true;
  group.add(signBoard);

  // 4. Chain-Link Metal Fence around Yard (X in [-28, 28], Z in [-23, 23])
  // Gate opening on South side: X in [-5, 5] at Z = +23
  const fenceMeshMat = new THREE.MeshStandardMaterial({
    map: textures.chainLink,
    transparent: true,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
    roughness: 0.45,
    metalness: 0.72,
  });
  const fenceMetalMat = new THREE.MeshStandardMaterial({
    color: 0x8c96a3,
    roughness: 0.4,
    metalness: 0.82,
    flatShading: true,
  });
  const footingMat = new THREE.MeshStandardMaterial({
    color: 0x71757a,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });

  const fenceHeight = 2.65;
  const addFenceRun = (x1: number, z1: number, x2: number, z2: number, addBarbedArms = true) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const midX = (x1 + x2) * 0.5;
    const midZ = (z1 + z2) * 0.5;

    // Chain link fabric panel
    const panelTex = textures.chainLink.clone();
    panelTex.needsUpdate = true;
    panelTex.repeat.set(Math.max(1, Math.round(len / 2.2)), 2.2);
    const panelMat = fenceMeshMat.clone();
    panelMat.map = panelTex;

    const panel = new THREE.Mesh(new THREE.PlaneGeometry(len, fenceHeight), panelMat);
    panel.position.set(midX, fenceHeight * 0.5 + 0.05, midZ);
    panel.rotation.y = angle + Math.PI / 2;
    group.add(panel);

    // Top horizontal rail
    const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, len, 6), fenceMetalMat);
    topRail.position.set(midX, fenceHeight + 0.05, midZ);
    topRail.rotation.z = Math.PI / 2;
    topRail.rotation.y = Math.atan2(-dz, dx);
    topRail.castShadow = true;
    group.add(topRail);

    // Bottom tension rail
    const botRail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), fenceMetalMat);
    botRail.position.set(midX, 0.14, midZ);
    botRail.rotation.z = Math.PI / 2;
    botRail.rotation.y = Math.atan2(-dz, dx);
    group.add(botRail);

    // Posts every ~3.5m
    const segments = Math.max(1, Math.round(len / 3.5));
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const px = x1 + dx * t;
      const pz = z1 + dz * t;

      const footing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.18, 6), footingMat);
      footing.position.set(px, 0.09, pz);
      group.add(footing);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, fenceHeight + 0.15, 7), fenceMetalMat);
      post.position.set(px, (fenceHeight + 0.15) * 0.5, pz);
      post.castShadow = true;
      group.add(post);

      if (addBarbedArms) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.04), fenceMetalMat);
        arm.position.set(px, fenceHeight + 0.25, pz);
        arm.rotation.z = 0.45;
        group.add(arm);
      }
    }

    // Add perimeter collider
    const rotY = Math.atan2(dx, dz);
    colliders.push({
      x: midX,
      z: midZ,
      halfW: 0.28,
      halfD: len * 0.5,
      rotY,
    });
  };

  // North, West, East, South-Left, South-Right fence runs
  addFenceRun(-28, -23, 28, -23);
  addFenceRun(-28, -23, -28, 23);
  addFenceRun(28, -23, 28, 23);
  addFenceRun(-28, 23, -5.2, 23);
  addFenceRun(5.2, 23, 28, 23);

  // Open Double Chain-Link Gate Wings (swung outward/inward to keep 10m drive opening clear)
  const buildGateWing = (hingeX: number, hingeZ: number, openAngle: number, width: number) => {
    const wg = new THREE.Group();
    wg.position.set(hingeX, 0, hingeZ);
    wg.rotation.y = openAngle;

    const frameTop = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, width, 6), fenceMetalMat);
    frameTop.rotation.z = Math.PI / 2;
    frameTop.position.set(width * 0.5, fenceHeight, 0);
    wg.add(frameTop);

    const frameBot = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, width, 6), fenceMetalMat);
    frameBot.rotation.z = Math.PI / 2;
    frameBot.position.set(width * 0.5, 0.16, 0);
    wg.add(frameBot);

    const endBar = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, fenceHeight, 6), fenceMetalMat);
    endBar.position.set(width, fenceHeight * 0.5 + 0.05, 0);
    endBar.castShadow = true;
    wg.add(endBar);

    const gTex = textures.chainLink.clone();
    gTex.needsUpdate = true;
    gTex.repeat.set(2.2, 2.2);
    const gMat = fenceMeshMat.clone();
    gMat.map = gTex;
    const meshPanel = new THREE.Mesh(new THREE.PlaneGeometry(width, fenceHeight - 0.18), gMat);
    meshPanel.position.set(width * 0.5, fenceHeight * 0.5 + 0.08, 0);
    wg.add(meshPanel);

    group.add(wg);
  };
  // Hinged open ~105 degrees inward/outward
  buildGateWing(-5.2, 23, -Math.PI * 0.58, 4.8);
  buildGateWing(5.2, 23, Math.PI + Math.PI * 0.58, 4.8);

  // Invisible boundary collider across the gate opening so player stays inside/on apron without driving to infinity
  colliders.push({ x: 0, z: 27.6, halfW: 6.5, halfD: 0.35, rotY: 0 });
  colliders.push({ x: -5.4, z: 25.3, halfW: 0.3, halfD: 2.5, rotY: 0 });
  colliders.push({ x: 5.4, z: 25.3, halfW: 0.3, halfD: 2.5, rotY: 0 });

  // 5. Tall Faceted Low-Poly Mountain ("Высокая гора") behind the yard & forest
  const buildMountainRange = () => {
    const mGeo = new THREE.PlaneGeometry(340, 220, 56, 40);
    mGeo.rotateX(-Math.PI / 2);

    const pos = mGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      // Distance from main peak (-14, -46 in local mountain coords) and secondary peak (56, -24)
      const dMain = Math.hypot((vx + 12) / 1.15, (vz + 20) / 0.85);
      const dWest = Math.hypot((vx + 72) / 0.95, (vz + 5) / 0.85);
      const dEast = Math.hypot((vx - 68) / 1.05, (vz + 12) / 0.9);

      // Ridged noise for crisp faceted alpine cliffs
      const ridge1 = Math.abs(Math.sin(vx * 0.065 + vz * 0.04) * Math.cos(vz * 0.075 - vx * 0.03));
      const ridge2 = Math.sin(vx * 0.14 - vz * 0.11) * 2.8;

      const hMain = Math.max(0, 66 - dMain * 0.82) * (0.78 + ridge1 * 0.38);
      const hWest = Math.max(0, 42 - dWest * 0.72) * (0.8 + ridge1 * 0.3);
      const hEast = Math.max(0, 46 - dEast * 0.74) * (0.8 + ridge1 * 0.3);

      let y = Math.max(hMain, hWest, hEast);
      if (y > 2) {
        y += ridge2 * Math.min(1, y / 18);
      }
      // Smoothly clamp front edge near forest line
      const frontFade = THREE.MathUtils.smoothstep(vz, 95, 50);
      y *= frontFade;

      // Subtle deterministic jitter on XZ for crisp irregular low-poly facets
      const jitterX = (Math.sin(i * 12.9898) * 0.5) * 1.4;
      const jitterZ = (Math.cos(i * 78.233) * 0.5) * 1.4;
      pos.setXYZ(i, vx + jitterX, Math.max(-0.5, y - 0.5), vz + jitterZ);

      // Vertex colors: forest moss -> granite cliff -> alpine slate -> snow peak
      if (y > 43) {
        c.setHex(0xeef4f8); // Snow cap
      } else if (y > 36) {
        c.setHex(0xb4bec7); // Frosted rock transition
      } else if (y > 16) {
        c.setHex(0x666e77); // Granite rock face
      } else if (y > 6) {
        c.setHex(0x52624a); // Foothill pine-moss slope
      } else {
        c.setHex(0x465839); // Meadow base
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    mGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    mGeo.computeVertexNormals();

    const mMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.04,
      flatShading: true,
    });
    const mountainMesh = new THREE.Mesh(mGeo, mMat);
    mountainMesh.position.set(0, 0, -108);
    mountainMesh.receiveShadow = true;
    mountainMesh.castShadow = true;
    group.add(mountainMesh);
  };
  buildMountainRange();

  // 6. Coniferous Pine Forest ("Хвойный лес") using InstancedMesh
  const treePositions: Array<{ x: number; y: number; z: number; scale: number; tint: number }> = [];
  for (let i = 0; i < 420; i++) {
    const x = (rand() - 0.5) * 260;
    const z = -95 + rand() * 175;

    // Exclude salvage yard + 4.5m perimeter clearing
    if (x > -33.5 && x < 33.5 && z > -28.5 && z < 28.5) continue;
    // Exclude asphalt road corridor & shoulders
    if (z > 24.5 && z < 41.0) continue;
    // Exclude high rocky cliffs of mountain peak
    if (z < -62 && Math.abs(x + 12) < 52) continue;

    // Foothill elevation boost near mountain
    let baseY = 0;
    if (z < -36) {
      baseY = Math.max(0, (-36 - z) * 0.12);
    }

    treePositions.push({
      x,
      y: baseY,
      z,
      scale: 0.85 + rand() * 0.72,
      tint: rand(),
    });
  }

  const treeCount = treePositions.length;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 2.2, 6);
  trunkGeo.translate(0, 1.1, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5c402c,
    roughness: 0.94,
    metalness: 0.0,
    flatShading: true,
  });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  trunkInst.castShadow = true;
  trunkInst.receiveShadow = true;

  // 3 stacked conical tiers per pine tree (merged into 3 InstancedMeshes for color variation)
  const cone1Geo = new THREE.ConeGeometry(1.85, 3.0, 7);
  cone1Geo.translate(0, 3.1, 0);
  const cone2Geo = new THREE.ConeGeometry(1.45, 2.6, 7);
  cone2Geo.translate(0, 4.6, 0);
  const cone3Geo = new THREE.ConeGeometry(0.95, 2.2, 7);
  cone3Geo.translate(0, 6.0, 0);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.0,
    flatShading: true,
  });

  const cone1Inst = new THREE.InstancedMesh(cone1Geo, foliageMat, treeCount);
  const cone2Inst = new THREE.InstancedMesh(cone2Geo, foliageMat, treeCount);
  const cone3Inst = new THREE.InstancedMesh(cone3Geo, foliageMat, treeCount);
  [cone1Inst, cone2Inst, cone3Inst].forEach((inst) => {
    inst.castShadow = true;
    inst.receiveShadow = true;
  });

  const dummy = new THREE.Object3D();
  const pinePalette = [new THREE.Color(0x284b34), new THREE.Color(0x31593c), new THREE.Color(0x213f2b), new THREE.Color(0x396342)];
  const tintColor = new THREE.Color();

  treePositions.forEach((tp, idx) => {
    dummy.position.set(tp.x, tp.y, tp.z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.setScalar(tp.scale);
    dummy.updateMatrix();

    trunkInst.setMatrixAt(idx, dummy.matrix);
    cone1Inst.setMatrixAt(idx, dummy.matrix);
    cone2Inst.setMatrixAt(idx, dummy.matrix);
    cone3Inst.setMatrixAt(idx, dummy.matrix);

    const base = pinePalette[Math.floor(tp.tint * pinePalette.length) % pinePalette.length];
    tintColor.copy(base).offsetHSL(0, 0, (tp.tint - 0.5) * 0.05);
    cone1Inst.setColorAt(idx, tintColor);
    cone2Inst.setColorAt(idx, tintColor);
    cone3Inst.setColorAt(idx, tintColor);
  });

  [trunkInst, cone1Inst, cone2Inst, cone3Inst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });

  // 7. Scattered Low-Poly Boulders outside fence & near mountain foothills
  const rockGeo = new THREE.DodecahedronGeometry(1.1, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x6f757c,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
  const rockCount = 48;
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  for (let i = 0; i < rockCount; i++) {
    let rx = (rand() - 0.5) * 140;
    let rz = -62 + rand() * 95;
    if (rx > -32 && rx < 32 && rz > -26 && rz < 40) {
      rx = rx < 0 ? -36 - rand() * 20 : 36 + rand() * 20;
    }
    dummy.position.set(rx, 0.35, rz);
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    dummy.scale.set(0.7 + rand() * 1.6, 0.45 + rand() * 0.9, 0.7 + rand() * 1.5);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
  }
  rockInst.instanceMatrix.needsUpdate = true;
  rockInst.computeBoundingSphere();
  group.add(rockInst);

  return { group, colliders };
}
