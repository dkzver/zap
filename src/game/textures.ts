import * as THREE from 'three';

export interface ProceduralTexturePack {
  chainLink: THREE.CanvasTexture;
  yardGround: THREE.CanvasTexture;
  asphaltRoad: THREE.CanvasTexture;
  hazardStripes: THREE.CanvasTexture;
  woodPallet: THREE.CanvasTexture;
  createContainerSide: (baseColor: string, accentColor: string, code: string) => THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  const created: THREE.Texture[] = [];

  const register = (tex: THREE.CanvasTexture, isColor = true): THREE.CanvasTexture => {
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    created.push(tex);
    return tex;
  };

  // 1. Chain-link diamond fence mesh (transparent PNG-like canvas)
  const fenceCanvas = document.createElement('canvas');
  fenceCanvas.width = 256;
  fenceCanvas.height = 256;
  const fctx = fenceCanvas.getContext('2d')!;
  fctx.clearRect(0, 0, 256, 256);

  const cell = 32;
  fctx.lineWidth = 4.2;
  fctx.lineCap = 'round';
  for (let y = -cell; y <= 256 + cell; y += cell) {
    for (let x = -cell; x <= 256 + cell; x += cell) {
      fctx.strokeStyle = '#9aa5b1';
      fctx.beginPath();
      fctx.moveTo(x, y + cell * 0.5);
      fctx.lineTo(x + cell * 0.5, y);
      fctx.lineTo(x + cell, y + cell * 0.5);
      fctx.lineTo(x + cell * 0.5, y + cell);
      fctx.closePath();
      fctx.stroke();

      // Highlight wire twist
      fctx.strokeStyle = '#d3dce6';
      fctx.lineWidth = 1.6;
      fctx.beginPath();
      fctx.moveTo(x + 2, y + cell * 0.5);
      fctx.lineTo(x + cell * 0.5, y + 2);
      fctx.stroke();
      fctx.lineWidth = 4.2;
    }
  }
  const chainLink = register(new THREE.CanvasTexture(fenceCanvas), true);
  chainLink.wrapS = THREE.RepeatWrapping;
  chainLink.wrapT = THREE.RepeatWrapping;
  chainLink.repeat.set(6, 2.2);

  // 2. Salvage Yard Ground (compacted gravel, dust, subtle oil spots)
  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = 512;
  groundCanvas.height = 512;
  const gctx = groundCanvas.getContext('2d')!;
  gctx.fillStyle = '#6c665c';
  gctx.fillRect(0, 0, 512, 512);

  // Deterministic pseudo-random gravel speckles
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 6500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 1 + rand() * 3.2;
    const v = Math.floor(82 + rand() * 48);
    gctx.fillStyle = `rgb(${v + 4}, ${v}, ${v - 8})`;
    gctx.fillRect(x, y, r, r);
  }

  // Subtle oil & rust stains
  for (let i = 0; i < 14; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const rad = 12 + rand() * 28;
    const grad = gctx.createRadialGradient(x, y, 2, x, y, rad);
    grad.addColorStop(0, 'rgba(38, 34, 30, 0.35)');
    grad.addColorStop(1, 'rgba(38, 34, 30, 0)');
    gctx.fillStyle = grad;
    gctx.beginPath();
    gctx.arc(x, y, rad, 0, Math.PI * 2);
    gctx.fill();
  }
  const yardGround = register(new THREE.CanvasTexture(groundCanvas), true);
  yardGround.wrapS = THREE.RepeatWrapping;
  yardGround.wrapT = THREE.RepeatWrapping;
  yardGround.repeat.set(9, 7);

  // 3. Asphalt Road texture with dashed centerline
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 256;
  const rctx = roadCanvas.getContext('2d')!;
  rctx.fillStyle = '#31353b';
  rctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 3800; i++) {
    const x = rand() * 512;
    const y = rand() * 256;
    const s = 1 + rand() * 2;
    const lum = Math.floor(38 + rand() * 32);
    rctx.fillStyle = `rgb(${lum}, ${lum + 2}, ${lum + 5})`;
    rctx.fillRect(x, y, s, s);
  }
  // Edge lines
  rctx.fillStyle = '#d4d8dd';
  rctx.fillRect(0, 14, 512, 6);
  rctx.fillRect(0, 236, 512, 6);
  // Dashed center line
  rctx.fillStyle = '#e5b93c';
  for (let x = 20; x < 512; x += 96) {
    rctx.fillRect(x, 124, 54, 8);
  }
  const asphaltRoad = register(new THREE.CanvasTexture(roadCanvas), true);
  asphaltRoad.wrapS = THREE.RepeatWrapping;
  asphaltRoad.wrapT = THREE.ClampToEdgeWrapping;
  asphaltRoad.repeat.set(22, 1);

  // 4. Hazard yellow-black stripes
  const hazCanvas = document.createElement('canvas');
  hazCanvas.width = 256;
  hazCanvas.height = 256;
  const hctx = hazCanvas.getContext('2d')!;
  hctx.fillStyle = '#eab308';
  hctx.fillRect(0, 0, 256, 256);
  hctx.fillStyle = '#18181b';
  for (let i = -256; i < 512; i += 48) {
    hctx.beginPath();
    hctx.moveTo(i, 0);
    hctx.lineTo(i + 24, 0);
    hctx.lineTo(i - 232, 256);
    hctx.lineTo(i - 256, 256);
    hctx.closePath();
    hctx.fill();
  }
  const hazardStripes = register(new THREE.CanvasTexture(hazCanvas), true);
  hazardStripes.wrapS = THREE.RepeatWrapping;
  hazardStripes.wrapT = THREE.RepeatWrapping;
  hazardStripes.repeat.set(3, 1);

  // 5. Wood pallet texture
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wctx = woodCanvas.getContext('2d')!;
  wctx.fillStyle = '#9c7349';
  wctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    wctx.fillStyle = y % 64 === 0 ? '#a87d51' : '#8c643c';
    wctx.fillRect(0, y, 256, 28);
    wctx.fillStyle = '#5c3f24';
    wctx.fillRect(0, y + 28, 256, 4);
  }
  const woodPallet = register(new THREE.CanvasTexture(woodCanvas), true);
  woodPallet.wrapS = THREE.RepeatWrapping;
  woodPallet.wrapT = THREE.RepeatWrapping;

  // 6. Shipping Container Corrugated Wall Texture Factory
  const createContainerSide = (baseColor: string, accentColor: string, code: string) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 256);

    // Corrugated vertical ribs
    for (let x = 0; x < 512; x += 16) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x, 10, 6, 236);
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.fillRect(x + 7, 10, 4, 236);
    }

    // Bottom grime / rust streaks
    const rustGrad = ctx.createLinearGradient(0, 175, 0, 256);
    rustGrad.addColorStop(0, 'rgba(90, 44, 22, 0)');
    rustGrad.addColorStop(1, 'rgba(72, 34, 18, 0.55)');
    ctx.fillStyle = rustGrad;
    ctx.fillRect(0, 175, 512, 81);

    // Top & bottom structural rail tint
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, 512, 12);
    ctx.fillRect(0, 244, 512, 12);

    // Stencil cargo plate
    ctx.fillStyle = accentColor;
    ctx.fillRect(340, 38, 136, 56);
    ctx.fillStyle = '#18181b';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(code, 352, 63);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('20FT · SCRAP', 352, 83);

    const tex = register(new THREE.CanvasTexture(c), true);
    return tex;
  };

  return {
    chainLink,
    yardGround,
    asphaltRoad,
    hazardStripes,
    woodPallet,
    createContainerSide,
    dispose: () => {
      created.forEach((t) => t.dispose());
    },
  };
}
