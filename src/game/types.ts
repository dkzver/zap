import * as THREE from 'three';

export type CameraMode = 'chase' | 'close' | 'cabin' | 'orbit';

export interface ForkliftTelemetry {
  speedKmh: number;
  forkHeightMeters: number;
  carryingTitle: string | null;
  deliveredCount: number;
  totalCargoCount: number;
  headlightsOn: boolean;
  reverseActive: boolean;
  cameraMode: CameraMode;
  shiftCompleted: boolean;
  nearDropZone: boolean;
}

export interface OrientedBoxCollider {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  rotY: number;
}

export interface CargoLoadItem {
  id: string;
  title: string;
  group: THREE.Group;
  homeX: number;
  homeZ: number;
  homeRotY: number;
  halfW: number;
  halfD: number;
  state: 'ground' | 'carried' | 'delivered';
  /** Offset relative to fork carriage when carried */
  carryOffsetZ: number;
  /** Target slot position in loading zone when delivered */
  slotIndex: number;
}

export interface ControlInputs {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  forkUp: boolean;
  forkDown: boolean;
}
