import * as THREE from 'three';
import { ProceduralTexturePack } from '../textures';
import { CargoLoadItem, OrientedBoxCollider } from '../types';

export interface YardPropsBuildResult {
  group: THREE.Group;
  colliders: OrientedBoxCollider[];
  cargoItems: CargoLoadItem[];
  dropZone: {
    centerX: number;
    centerZ: number;
    halfW: number;
    halfD: number;
    slots: Array<{ x: number; z: number; rotY: number }>;
  };
  dropZoneBeaconMat: THREE.MeshStandardMaterial;
}

type CarBodyType = 'sedan' | 'hatchback' | 'pickup' | 'van';

interface DismantledCarSpec {
  x: number;
  z: number;
  rotY: number;
  type: CarBodyType;
  color: number;
  rustColor: number;
  onBlocks: boolean;
  missingWheels: boolean[]; // [FL, FR, RL, RR]
  hoodOpen: boolean;
  missingHood: boolean;
  missingLeftDoor: boolean;
  missingTrunk: boolean;
}

export function createYardProps(textures: ProceduralTexturePack): YardPropsBuildResult {
  const group = new THREE.Group();
  const colliders: OrientedBoxCollider[] = [];
  const cargoItems: CargoLoadItem[] = [];

  // Shared materials
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x2a2e33,
    roughness: 0.65,
    metalness: 0.68,
    flatShading: true,
  });
  const rustMat = new THREE.MeshStandardMaterial({
    color: 0x7b4227,
    roughness: 0.92,
    metalness: 0.25,
    flatShading: true,
  });
  const engineMetalMat = new THREE.MeshStandardMaterial({
    color: 0x727a82,
    roughness: 0.45,
    metalness: 0.8,
    flatShading: true,
  });
  const cinderblockMat = new THREE.MeshStandardMaterial({
    color: 0x868a8f,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1b1d20,
    roughness: 0.94,
    metalness: 0.04,
    flatShading: true,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xa2aab3,
    roughness: 0.35,
    metalness: 0.8,
    flatShading: true,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x3b3530,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.woodPallet,
    roughness: 0.85,
    metalness: 0.04,
  });

  // =========================================================================
  // 1. FOUR 20-FOOT SHIPPING CONTAINERS (6.06m x 2.44m x 2.59m)
  // =========================================================================
  const buildShippingContainer = (
    x: number,
    z: number,
    rotY: number,
    baseHex: string,
    accentHex: string,
    code: string,
    doorsOpen: boolean,
  ) => {
    const cg = new THREE.Group();
    cg.position.set(x, 0, z);
    cg.rotation.y = rotY;

    const L = 6.06;
    const W = 2.44;
    const H = 2.59;

    const sideTex = textures.createContainerSide(baseHex, accentHex, code);
    const wallMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.62,
      metalness: 0.38,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseHex).multiplyScalar(0.76),
      roughness: 0.55,
      metalness: 0.52,
      flatShading: true,
    });
    const lockMat = new THREE.MeshStandardMaterial({
      color: 0xb6c0c9,
      roughness: 0.32,
      metalness: 0.86,
    });

    if (!doorsOpen) {
      // Closed container box with corner castings
      const body = new THREE.Mesh(new THREE.BoxGeometry(L - 0.12, H - 0.1, W - 0.08), wallMat);
      body.position.set(0, H * 0.5, 0);
      body.castShadow = true;
      body.receiveShadow = true;
      cg.add(body);
    } else {
      // Hollow container with open +X end doors & interior shelves
      const floor = new THREE.Mesh(new THREE.BoxGeometry(L - 0.08, 0.14, W - 0.08), woodMat);
      floor.position.set(0, 0.07, 0);
      floor.receiveShadow = true;
      cg.add(floor);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(L - 0.08, 0.12, W - 0.08), wallMat);
      roof.position.set(0, H - 0.06, 0);
      roof.castShadow = true;
      roof.receiveShadow = true;
      cg.add(roof);

      const sideWall1 = new THREE.Mesh(new THREE.BoxGeometry(L - 0.08, H - 0.2, 0.1), wallMat);
      sideWall1.position.set(0, H * 0.5, W * 0.5 - 0.05);
      sideWall1.castShadow = true;
      sideWall1.receiveShadow = true;
      cg.add(sideWall1);

      const sideWall2 = new THREE.Mesh(new THREE.BoxGeometry(L - 0.08, H - 0.2, 0.1), wallMat);
      sideWall2.position.set(0, H * 0.5, -W * 0.5 + 0.05);
      sideWall2.castShadow = true;
      sideWall2.receiveShadow = true;
      cg.add(sideWall2);

      const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, H - 0.2, W - 0.12), wallMat);
      backWall.position.set(-L * 0.5 + 0.05, H * 0.5, 0);
      backWall.castShadow = true;
      cg.add(backWall);

      // Interior storage shelf rack + spare parts boxes
      const shelfMat = darkMetalMat;
      for (const sy of [0.85, 1.65]) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.06, 0.72), shelfMat);
        shelf.position.set(-0.6, sy, -W * 0.5 + 0.48);
        cg.add(shelf);
      }
      const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.52), woodMat);
      crate1.position.set(-1.1, 1.1, -W * 0.5 + 0.48);
      cg.add(crate1);
      const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.48), rustMat);
      crate2.position.set(0.2, 1.08, -W * 0.5 + 0.48);
      cg.add(crate2);

      // Open double doors at +X end
      for (const side of [-1, 1]) {
        const doorPivot = new THREE.Group();
        doorPivot.position.set(L * 0.5 - 0.04, 0, side * (W * 0.5 - 0.06));
        doorPivot.rotation.y = side * 2.15; // swung wide open!

        const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, H - 0.22, W * 0.5 - 0.08), frameMat);
        doorLeaf.position.set(0, H * 0.5, -side * (W * 0.25 - 0.04));
        doorLeaf.castShadow = true;
        doorPivot.add(doorLeaf);

        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, H - 0.3, 6), lockMat);
        bar.position.set(0.06, H * 0.5, -side * (W * 0.36));
        doorPivot.add(bar);

        cg.add(doorPivot);
      }
    }

    // 4 Corner structural posts + top/bottom edge rails + ISO corner castings
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, H, 0.16), frameMat);
        post.position.set(sx * (L * 0.5 - 0.08), H * 0.5, sz * (W * 0.5 - 0.08));
        post.castShadow = true;
        cg.add(post);

        for (const cy of [0.09, H - 0.09]) {
          const casting = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.2), darkMetalMat);
          casting.position.set(sx * (L * 0.5 - 0.08), cy, sz * (W * 0.5 - 0.08));
          cg.add(casting);
        }
      }
    }

    // Locking bars on closed doors (+X face)
    if (!doorsOpen) {
      for (const bz of [-0.62, -0.22, 0.22, 0.62]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, H - 0.25, 6), lockMat);
        rod.position.set(L * 0.5 - 0.02, H * 0.5, bz);
        cg.add(rod);
      }
    }

    group.add(cg);

    colliders.push({
      x,
      z,
      halfW: L * 0.5,
      halfD: W * 0.5,
      rotY,
    });
  };

  // Place the 4 20-foot shipping containers
  buildShippingContainer(-19.5, -17.5, 0, '#2c587c', '#e2e8f0', 'SCRP-201', false);
  buildShippingContainer(-10.5, -17.5, 0, '#963a2c', '#fde68a', 'SCRP-204', false);
  buildShippingContainer(16.2, -16.5, -Math.PI / 2, '#c58b28', '#f8fafc', 'YARD-208', true);
  buildShippingContainer(22.2, -16.5, -Math.PI / 2, '#4a5f42', '#e2e8f0', 'YARD-212', false);

  // =========================================================================
  // 2. LOADING / DROP-OFF ZONE (near East containers)
  // =========================================================================
  const dropCenter = { x: 10.6, z: -8.2 };
  const dropHalfW = 3.1;
  const dropHalfD = 2.6;

  const padConcrete = new THREE.Mesh(
    new THREE.BoxGeometry(dropHalfW * 2, 0.04, dropHalfD * 2),
    new THREE.MeshStandardMaterial({ color: 0x565a60, roughness: 0.9, metalness: 0.04 }),
  );
  padConcrete.position.set(dropCenter.x, 0.015, dropCenter.z);
  padConcrete.receiveShadow = true;
  group.add(padConcrete);

  const hazBorderMat = new THREE.MeshStandardMaterial({
    map: textures.hazardStripes,
    roughness: 0.6,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  // 4 border strips
  const stripThick = 0.26;
  const addStrip = (sx: number, sz: number, w: number, d: number) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), hazBorderMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(sx, 0.042, sz);
    group.add(s);
  };
  addStrip(dropCenter.x, dropCenter.z - dropHalfD + stripThick * 0.5, dropHalfW * 2, stripThick);
  addStrip(dropCenter.x, dropCenter.z + dropHalfD - stripThick * 0.5, dropHalfW * 2, stripThick);
  addStrip(dropCenter.x - dropHalfW + stripThick * 0.5, dropCenter.z, stripThick, dropHalfD * 2);
  addStrip(dropCenter.x + dropHalfW - stripThick * 0.5, dropCenter.z, stripThick, dropHalfD * 2);

  // Loading bay beacon pole on the corner
  const bayPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.1, 8), darkMetalMat);
  bayPost.position.set(dropCenter.x + dropHalfW + 0.35, 1.55, dropCenter.z - dropHalfD - 0.2);
  bayPost.castShadow = true;
  group.add(bayPost);

  const dropZoneBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.3,
  });
  const bayBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), dropZoneBeaconMat);
  bayBeacon.position.set(dropCenter.x + dropHalfW + 0.35, 3.22, dropCenter.z - dropHalfD - 0.2);
  group.add(bayBeacon);

  const dropSlots = [
    { x: dropCenter.x - 1.7, z: dropCenter.z - 1.1, rotY: 0 },
    { x: dropCenter.x + 0.0, z: dropCenter.z - 1.1, rotY: 0 },
    { x: dropCenter.x + 1.7, z: dropCenter.z - 1.1, rotY: 0 },
    { x: dropCenter.x - 1.7, z: dropCenter.z + 1.1, rotY: 0 },
    { x: dropCenter.x + 0.0, z: dropCenter.z + 1.1, rotY: 0 },
    { x: dropCenter.x + 1.7, z: dropCenter.z + 1.1, rotY: 0 },
  ];

  // =========================================================================
  // 3. DISMANTLED CARS GENERATOR (Multi-part low poly cars in salvage states)
  // =========================================================================
  const buildDismantledCar = (spec: DismantledCarSpec) => {
    const car = new THREE.Group();
    car.position.set(spec.x, 0, spec.z);
    car.rotation.y = spec.rotY;

    const paintMat = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: 0.68,
      metalness: 0.28,
      flatShading: true,
    });
    const panelAltMat = new THREE.MeshStandardMaterial({
      color: spec.rustColor,
      roughness: 0.85,
      metalness: 0.2,
      flatShading: true,
    });

    const isVan = spec.type === 'van';
    const isPickup = spec.type === 'pickup';
    const isHatch = spec.type === 'hatchback';
    const length = isVan ? 4.3 : isPickup ? 4.35 : isHatch ? 3.65 : 4.05;
    const width = 1.74;
    const groundOffset = spec.onBlocks ? 0.36 : 0.22;

    // Cinderblocks under chassis if resting on blocks
    if (spec.onBlocks) {
      for (const bx of [-0.62, 0.62]) {
        for (const bz of [-1.15, 1.15]) {
          const block = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.42), cinderblockMat);
          block.position.set(bx, 0.16, bz);
          block.castShadow = true;
          block.receiveShadow = true;
          car.add(block);
        }
      }
    }

    // Chassis / underbody frame
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(width - 0.12, 0.18, length - 0.16), darkMetalMat);
    chassis.position.set(0, groundOffset + 0.08, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    car.add(chassis);

    // Lower body tub
    const lowerTub = new THREE.Mesh(new THREE.BoxGeometry(width, 0.48, length), paintMat);
    lowerTub.position.set(0, groundOffset + 0.36, 0);
    lowerTub.castShadow = true;
    lowerTub.receiveShadow = true;
    car.add(lowerTub);

    // Front grille + bumper
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.18, 0.18), darkMetalMat);
    frontBumper.position.set(0, groundOffset + 0.24, length * 0.5 + 0.03);
    car.add(frontBumper);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.06), darkMetalMat);
    grille.position.set(0, groundOffset + 0.42, length * 0.5 + 0.01);
    car.add(grille);

    // Exposed engine bay (visible if hood is open or missing!)
    const engineBay = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.26, 0.95), darkMetalMat);
    engineBay.position.set(0, groundOffset + 0.48, length * 0.5 - 0.62);
    car.add(engineBay);

    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.58), engineMetalMat);
    engineBlock.position.set(0, groundOffset + 0.62, length * 0.5 - 0.64);
    engineBlock.castShadow = true;
    car.add(engineBlock);

    const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.32, 0.08), rustMat);
    radiator.position.set(0, groundOffset + 0.56, length * 0.5 - 0.18);
    car.add(radiator);

    // Hood (absent, tilted open, or closed)
    if (!spec.missingHood) {
      const hoodPivot = new THREE.Group();
      hoodPivot.position.set(0, groundOffset + 0.61, length * 0.5 - 1.14);
      if (spec.hoodOpen) {
        hoodPivot.rotation.x = -0.78;
      }
      const hoodMesh = new THREE.Mesh(new THREE.BoxGeometry(width - 0.12, 0.06, 1.06), spec.hoodOpen ? panelAltMat : paintMat);
      hoodMesh.position.set(0, 0, 0.53);
      hoodMesh.castShadow = true;
      hoodPivot.add(hoodMesh);
      car.add(hoodPivot);
    }

    // Cabin / Roof Pillars (open hollow cabin with seats visible inside!)
    const cabinLength = isVan ? 2.8 : isPickup ? 1.15 : isHatch ? 1.85 : 1.75;
    const cabinCenterZ = isVan ? -0.45 : isPickup ? 0.15 : -0.25;
    const roofY = groundOffset + 1.12;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(width - 0.18, 0.08, cabinLength), paintMat);
    roof.position.set(0, roofY, cabinCenterZ);
    roof.castShadow = true;
    car.add(roof);

    // 4 Corner Cabin Pillars (hollow glassless salvaged look)
    for (const px of [-1, 1]) {
      const frontPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.1), paintMat);
      frontPillar.position.set(px * (width * 0.5 - 0.12), groundOffset + 0.84, cabinCenterZ + cabinLength * 0.5 - 0.08);
      frontPillar.rotation.x = -0.32;
      car.add(frontPillar);

      const rearPillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.56, 0.12), paintMat);
      rearPillar.position.set(px * (width * 0.5 - 0.12), groundOffset + 0.84, cabinCenterZ - cabinLength * 0.5 + 0.08);
      rearPillar.rotation.x = isVan ? 0.05 : 0.28;
      car.add(rearPillar);
    }

    // Interior seats visible through missing windows
    for (const sx of [-0.38, 0.38]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.44, 0.42), seatMat);
      seat.position.set(sx, groundOffset + 0.72, cabinCenterZ + 0.15);
      car.add(seat);
    }

    // Mismatched or missing left door for salvage authenticity
    if (!spec.missingLeftDoor) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.92), panelAltMat);
      door.position.set(-width * 0.5 - 0.01, groundOffset + 0.38, cabinCenterZ + 0.15);
      car.add(door);
    }

    // Pickup bed walls if pickup
    if (isPickup) {
      for (const side of [-1, 1]) {
        const bedSide = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 1.55), paintMat);
        bedSide.position.set(side * (width * 0.5 - 0.06), groundOffset + 0.72, -1.25);
        bedSide.castShadow = true;
        car.add(bedSide);
      }
    }

    // Wheels or exposed brake hubs
    const wheelOffsets = [
      { x: -width * 0.5 + 0.04, z: length * 0.5 - 0.72 },
      { x: width * 0.5 - 0.04, z: length * 0.5 - 0.72 },
      { x: -width * 0.5 + 0.04, z: -length * 0.5 + 0.75 },
      { x: width * 0.5 - 0.04, z: -length * 0.5 + 0.75 },
    ];
    wheelOffsets.forEach((wo, idx) => {
      if (spec.missingWheels[idx]) {
        // Exposed brake rotor/drum
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10), rustMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(wo.x * 0.92, groundOffset + 0.08, wo.z);
        car.add(hub);
      } else {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(wo.x, 0.32, wo.z);
        tire.castShadow = true;
        car.add(tire);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.23, 8), rimMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(wo.x, 0.32, wo.z);
        car.add(rim);
      }
    });

    group.add(car);
    colliders.push({
      x: spec.x,
      z: spec.z,
      halfW: width * 0.52,
      halfD: length * 0.52,
      rotY: spec.rotY,
    });
  };

  // 16 Dismantled Cars across the salvage yard (wide driving aisles maintained!)
  const carSpecs: DismantledCarSpec[] = [
    // West Salvage Row (4 cars)
    { x: -22.5, z: -9.5, rotY: Math.PI / 2 + 0.08, type: 'sedan', color: 0x3b6078, rustColor: 0x7b4227, onBlocks: true, missingWheels: [true, true, false, true], hoodOpen: true, missingHood: false, missingLeftDoor: true, missingTrunk: false },
    { x: -22.2, z: -3.5, rotY: Math.PI / 2 - 0.06, type: 'pickup', color: 0x8b3a30, rustColor: 0x5c646b, onBlocks: false, missingWheels: [false, true, false, false], hoodOpen: false, missingHood: true, missingLeftDoor: false, missingTrunk: false },
    { x: -22.6, z: 2.8, rotY: Math.PI / 2 + 0.05, type: 'hatchback', color: 0xb68b2e, rustColor: 0x7b4227, onBlocks: true, missingWheels: [true, true, true, true], hoodOpen: false, missingHood: true, missingLeftDoor: true, missingTrunk: true },
    { x: -22.0, z: 9.2, rotY: Math.PI / 2 - 0.1, type: 'van', color: 0xc2c5c8, rustColor: 0x8d4c2c, onBlocks: true, missingWheels: [false, false, true, true], hoodOpen: true, missingHood: false, missingLeftDoor: false, missingTrunk: false },

    // South-West Corner (2 cars)
    { x: -19.5, z: 17.5, rotY: 0.22, type: 'sedan', color: 0x456b49, rustColor: 0x7b4227, onBlocks: true, missingWheels: [true, false, true, true], hoodOpen: false, missingHood: true, missingLeftDoor: false, missingTrunk: false },
    { x: -13.5, z: 17.8, rotY: -0.14, type: 'hatchback', color: 0x625a72, rustColor: 0x8f4e2a, onBlocks: false, missingWheels: [false, true, true, false], hoodOpen: true, missingHood: false, missingLeftDoor: true, missingTrunk: false },

    // Central-North Island (2 cars)
    { x: -1.5, z: -9.5, rotY: 0.14, type: 'sedan', color: 0x994238, rustColor: 0x686e75, onBlocks: true, missingWheels: [true, true, false, false], hoodOpen: true, missingHood: false, missingLeftDoor: false, missingTrunk: true },
    { x: -1.2, z: -4.8, rotY: -0.16, type: 'pickup', color: 0x3b4e68, rustColor: 0x7b4227, onBlocks: true, missingWheels: [false, true, true, true], hoodOpen: false, missingHood: true, missingLeftDoor: true, missingTrunk: false },

    // Central-South Island (3 cars)
    { x: -8.6, z: 2.0, rotY: 1.48, type: 'van', color: 0x8a7d65, rustColor: 0x7b4227, onBlocks: false, missingWheels: [true, false, false, false], hoodOpen: true, missingHood: false, missingLeftDoor: false, missingTrunk: false },
    { x: -8.2, z: 7.2, rotY: 1.66, type: 'sedan', color: 0x4b7772, rustColor: 0x924a28, onBlocks: true, missingWheels: [true, true, true, false], hoodOpen: false, missingHood: true, missingLeftDoor: true, missingTrunk: false },
    { x: -2.4, z: 4.5, rotY: -1.54, type: 'hatchback', color: 0xa64e36, rustColor: 0x63696f, onBlocks: true, missingWheels: [false, true, true, true], hoodOpen: true, missingHood: false, missingLeftDoor: false, missingTrunk: false },

    // East Salvage Row (5 cars)
    { x: 22.2, z: -5.5, rotY: -1.46, type: 'sedan', color: 0x5c6873, rustColor: 0x7b4227, onBlocks: true, missingWheels: [true, false, true, true], hoodOpen: false, missingHood: true, missingLeftDoor: false, missingTrunk: false },
    { x: 22.0, z: -0.5, rotY: -1.62, type: 'hatchback', color: 0x3f6b54, rustColor: 0x85492b, onBlocks: false, missingWheels: [false, false, true, false], hoodOpen: true, missingHood: false, missingLeftDoor: true, missingTrunk: false },
    { x: 22.4, z: 4.8, rotY: -1.52, type: 'pickup', color: 0xb08434, rustColor: 0x7b4227, onBlocks: true, missingWheels: [true, true, false, true], hoodOpen: false, missingHood: true, missingLeftDoor: false, missingTrunk: false },
    { x: 21.8, z: 10.2, rotY: -1.68, type: 'sedan', color: 0x704248, rustColor: 0x5c6268, onBlocks: true, missingWheels: [true, true, true, true], hoodOpen: true, missingHood: false, missingLeftDoor: true, missingTrunk: false },
    { x: 14.0, z: 17.2, rotY: 0.12, type: 'van', color: 0x4e6680, rustColor: 0x7b4227, onBlocks: false, missingWheels: [true, false, false, true], hoodOpen: false, missingHood: true, missingLeftDoor: false, missingTrunk: false },
  ];

  carSpecs.forEach(buildDismantledCar);

  // =========================================================================
  // 4. SALVAGE YARD OFFICE BOOTH & MISCELLANEOUS PROPS
  // =========================================================================
  const buildOfficeBooth = (x: number, z: number) => {
    const bg = new THREE.Group();
    bg.position.set(x, 0, z);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x626b75, roughness: 0.72, metalness: 0.35, flatShading: true });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55, metalness: 0.25, flatShading: true });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.55 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.16, 3.4), cinderblockMat);
    base.position.set(0, 0.08, 0);
    bg.add(base);

    const shell = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.55, 3.1), wallMat);
    shell.position.set(0, 1.42, 0);
    shell.castShadow = true;
    shell.receiveShadow = true;
    bg.add(shell);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.95, 0.16, 3.55), trimMat);
    roof.position.set(0, 2.75, 0);
    roof.rotation.x = 0.04;
    roof.castShadow = true;
    bg.add(roof);

    // Dispatcher window facing yard (-X and -Z)
    const winFront = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.95, 0.08), glassMat);
    winFront.position.set(-0.8, 1.65, -1.56);
    bg.add(winFront);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.0, 0.08), darkMetalMat);
    door.position.set(1.1, 1.15, -1.56);
    bg.add(door);

    group.add(bg);
    colliders.push({ x, z, halfW: 2.4, halfD: 1.75, rotY: 0 });
  };
  buildOfficeBooth(21.8, 17.2);

  // Tire stacks & oil drums around yard edges
  const addTireStack = (x: number, z: number, count: number) => {
    const tg = new THREE.Group();
    tg.position.set(x, 0, z);
    for (let i = 0; i < count; i++) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 7, 12), tireMat);
      tire.rotation.x = Math.PI / 2;
      tire.position.set((i % 2) * 0.03, 0.12 + i * 0.22, 0);
      tire.castShadow = true;
      tg.add(tire);
    }
    group.add(tg);
    colliders.push({ x, z, halfW: 0.5, halfD: 0.5, rotY: 0 });
  };

  addTireStack(-25.8, -14.0, 4);
  addTireStack(-25.2, -13.0, 3);
  addTireStack(17.5, 17.5, 4);
  addTireStack(-5.2, -17.5, 5);
  addTireStack(25.6, 12.8, 4);

  const addOilDrums = (x: number, z: number) => {
    const dg = new THREE.Group();
    dg.position.set(x, 0, z);
    const drumColors = [0x1d4ed8, 0xb91c1c, 0xca8a04];
    const offsets = [
      { dx: -0.35, dz: 0 },
      { dx: 0.35, dz: 0.15 },
      { dx: 0.0, dz: -0.55 },
    ];
    offsets.forEach((o, idx) => {
      const dMat = new THREE.MeshStandardMaterial({
        color: drumColors[idx % drumColors.length],
        roughness: 0.55,
        metalness: 0.45,
        flatShading: true,
      });
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.88, 10), dMat);
      drum.position.set(o.dx, 0.44, o.dz);
      drum.castShadow = true;
      dg.add(drum);
    });
    group.add(dg);
    colliders.push({ x, z, halfW: 0.8, halfD: 0.75, rotY: 0 });
  };

  addOilDrums(-25.5, 17.8);
  addOilDrums(25.8, -10.5);
  addOilDrums(-5.5, -14.8);

  // =========================================================================
  // 5. SIX INTERACTIVE PALLETIZED AUTO-PARTS LOADS
  // =========================================================================
  const createPalletBase = (): THREE.Group => {
    const pg = new THREE.Group();
    // 3 bottom stringers (leaving clear open fork channels between them!)
    for (const sx of [-0.46, 0, 0.46]) {
      const runner = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 1.16), woodMat);
      runner.position.set(sx, 0.06, 0);
      runner.castShadow = true;
      pg.add(runner);
    }
    // Top deck boards
    for (let i = -2; i <= 2; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.04, 0.18), woodMat);
      plank.position.set(0, 0.14, i * 0.23);
      plank.castShadow = true;
      plank.receiveShadow = true;
      pg.add(plank);
    }
    return pg;
  };

  const makeCargoItem = (
    id: string,
    title: string,
    homeX: number,
    homeZ: number,
    homeRotY: number,
    slotIndex: number,
    builder: (cargoGroup: THREE.Group) => void,
  ) => {
    const g = createPalletBase();
    builder(g);
    g.position.set(homeX, 0, homeZ);
    g.rotation.y = homeRotY;
    group.add(g);

    cargoItems.push({
      id,
      title,
      group: g,
      homeX,
      homeZ,
      homeRotY,
      halfW: 0.62,
      halfD: 0.62,
      state: 'ground',
      carryOffsetZ: 0.68,
      slotIndex,
    });
  };

  // Load 1: V8 Engine Block
  makeCargoItem('v8-engine', 'Двигатель V8 на поддоне', -17.5, -9.2, 0.2, 0, (g) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.72), engineMetalMat);
    block.position.set(0, 0.4, 0);
    block.castShadow = true;
    g.add(block);
    const valveL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.64), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45, metalness: 0.4, flatShading: true }));
    valveL.position.set(-0.22, 0.66, 0);
    valveL.rotation.z = 0.35;
    g.add(valveL);
    const valveR = valveL.clone();
    valveR.position.x = 0.22;
    valveR.rotation.z = -0.35;
    g.add(valveR);
    const airFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10), darkMetalMat);
    airFilter.position.set(0, 0.76, 0);
    g.add(airFilter);
  });

  // Load 2: Gearbox & Driveshaft
  makeCargoItem('gearbox', 'Коробка передач (КПП)', -17.5, 2.8, -0.3, 1, (g) => {
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 0.42, 10), engineMetalMat);
    bell.rotation.x = Math.PI / 2;
    bell.position.set(0, 0.38, 0.18);
    bell.castShadow = true;
    g.add(bell);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 8), darkMetalMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0.36, -0.22);
    g.add(tail);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), rustMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0, 0.22, -0.32);
    g.add(shaft);
  });

  // Load 3: Stack of Tires & Alloy Rims
  makeCargoItem('wheels', 'Стопка колёс и дисков', -13.5, 13.0, 0.45, 2, (g) => {
    for (let i = 0; i < 3; i++) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.21, 14), tireMat);
      tire.position.set(0, 0.26 + i * 0.22, 0);
      tire.castShadow = true;
      g.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 8), rimMat);
      rim.position.set(0, 0.26 + i * 0.22, 0);
      g.add(rim);
    }
  });

  // Load 4: Wooden Parts Crate
  makeCargoItem('crate', 'Ящик с запчастями', 2.4, -5.5, 0.15, 3, (g) => {
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xb38756, roughness: 0.85, metalness: 0.02, flatShading: true });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.92), crateMat);
    box.position.set(0, 0.52, 0);
    box.castShadow = true;
    g.add(box);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.95), darkMetalMat);
    strap.position.set(0, 0.52, 0);
    g.add(strap);
  });

  // Load 5: Salvaged Doors & Fenders Bundle
  makeCargoItem('panels', 'Кузовные двери и крылья', 3.4, 6.2, -0.4, 4, (g) => {
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.62, 0.12), new THREE.MeshStandardMaterial({ color: 0x3b6078, roughness: 0.6, metalness: 0.3, flatShading: true }));
    p1.position.set(0, 0.48, -0.18);
    p1.rotation.x = 0.12;
    p1.castShadow = true;
    g.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.62, 0.12), new THREE.MeshStandardMaterial({ color: 0xa64e36, roughness: 0.65, metalness: 0.3, flatShading: true }));
    p2.position.set(0, 0.48, 0.14);
    p2.rotation.x = -0.1;
    p2.castShadow = true;
    g.add(p2);
  });

  // Load 6: Scrap Copper Radiators & Exhausts
  makeCargoItem('radiators', 'Радиаторы и выхлоп', 17.0, 4.8, 0.3, 5, (g) => {
    const rad1 = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.52, 0.14), new THREE.MeshStandardMaterial({ color: 0x9c6137, roughness: 0.5, metalness: 0.65, flatShading: true }));
    rad1.position.set(0, 0.44, -0.12);
    rad1.castShadow = true;
    g.add(rad1);
    const rad2 = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.48, 0.14), engineMetalMat);
    rad2.position.set(0, 0.42, 0.14);
    rad2.castShadow = true;
    g.add(rad2);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.96, 8), rustMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 0.22, 0.34);
    g.add(pipe);
  });

  return {
    group,
    colliders,
    cargoItems,
    dropZone: {
      centerX: dropCenter.x,
      centerZ: dropCenter.z,
      halfW: dropHalfW,
      halfD: dropHalfD,
      slots: dropSlots,
    },
    dropZoneBeaconMat,
  };
}
