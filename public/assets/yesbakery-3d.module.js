import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/OutputPass.js';

// ============ SETUP ============
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xede0c8);
scene.fog = new THREE.Fog(0xede0c8, 9, 24);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3.5, 7);
camera.lookAt(0, 0.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// PMREM environment for realistic reflections
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;

// ============ POST PROCESSING ============
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
composer.setSize(window.innerWidth, window.innerHeight);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom for the oven glow and warm highlights
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.45,  // strength (will boost during oven phase)
  0.6,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);

// Depth of field
const bokehPass = new BokehPass(scene, camera, {
  focus: 5.0,
  aperture: 0.0012,
  maxblur: 0.008,
});
composer.addPass(bokehPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// ============ PROCEDURAL PBR TEXTURE GENERATORS ============
// We generate full PBR sets (color + normal + roughness) procedurally
// for offline reliability. These are high-quality and tile-able.

function makeNoiseValue(x, y, octaves = 4, persistence = 0.5) {
  let total = 0;
  let amp = 1;
  let freq = 1;
  let max = 0;
  for (let o = 0; o < octaves; o++) {
    const sx = Math.sin(x * freq * 0.05 + o * 13.7);
    const sy = Math.cos(y * freq * 0.05 + o * 7.3);
    total += (Math.sin(sx * 12 + sy * 9 + o * 17) * 0.5 + 0.5) * amp;
    max += amp;
    amp *= persistence;
    freq *= 2;
  }
  return total / max;
}

function makeColorTexture(size, fill) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  fill(ctx, size);
  return c;
}

function heightToNormal(heightCanvas, strength = 1.5) {
  const size = heightCanvas.width;
  const hctx = heightCanvas.getContext('2d');
  const hData = hctx.getImageData(0, 0, size, size).data;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = nCanvas.height = size;
  const nctx = nCanvas.getContext('2d');
  const nImg = nctx.createImageData(size, size);

  const get = (x, y) => {
    x = ((x % size) + size) % size;
    y = ((y % size) + size) % size;
    return hData[(y * size + x) * 4] / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = get(x - 1, y - 1);
      const t  = get(x,     y - 1);
      const tr = get(x + 1, y - 1);
      const l  = get(x - 1, y);
      const r  = get(x + 1, y);
      const bl = get(x - 1, y + 1);
      const b  = get(x,     y + 1);
      const br = get(x + 1, y + 1);

      const dX = (tr + 2*r + br) - (tl + 2*l + bl);
      const dY = (bl + 2*b + br) - (tl + 2*t + tr);
      const dZ = 1.0 / strength;

      const len = Math.sqrt(dX*dX + dY*dY + dZ*dZ);
      const nx = dX / len;
      const ny = dY / len;
      const nz = dZ / len;

      const i = (y * size + x) * 4;
      nImg.data[i]     = (nx * 0.5 + 0.5) * 255;
      nImg.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      nImg.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      nImg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nImg, 0, 0);
  return nCanvas;
}

function makeRoughnessTexture(size, generator) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = Math.max(0, Math.min(1, generator(x, y, size))) * 255;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function canvasToTexture(canvas, repeat = 1, isColor = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

// ===== WOOD PBR =====
function makeWoodPBR(size = 1024) {
  // Color map
  const colorCanvas = makeColorTexture(size, (ctx, s) => {
    ctx.fillStyle = '#7a4e22';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 280; i++) {
      const y = Math.random() * s;
      const thickness = 0.4 + Math.random() * 2.8;
      const dark = Math.random() * 0.4;
      ctx.strokeStyle = `rgba(${50 - dark*30}, ${30 - dark*20}, ${15}, ${0.25 + Math.random() * 0.45})`;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 4) {
        const wave = Math.sin(x * 0.025 + i) * 4 + Math.sin(x * 0.007 + i * 2) * 9;
        ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
    // knots
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 10 + Math.random() * 18;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(35, 18, 7, 0.95)');
      grad.addColorStop(0.7, 'rgba(45, 25, 10, 0.5)');
      grad.addColorStop(1, 'rgba(45, 25, 10, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Height map (for normal generation)
  const heightCanvas = makeColorTexture(size, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 200; i++) {
      const y = Math.random() * s;
      ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? 60 : 180}, ${Math.random() > 0.5 ? 60 : 180}, ${Math.random() > 0.5 ? 60 : 180}, 0.6)`;
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 4) {
        const wave = Math.sin(x * 0.025 + i) * 4 + Math.sin(x * 0.007 + i * 2) * 9;
        ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  });

  const normalCanvas = heightToNormal(heightCanvas, 2.0);

  // Roughness: slightly varied around 0.75
  const roughCanvas = makeRoughnessTexture(size, (x, y) => {
    return 0.65 + makeNoiseValue(x, y, 4) * 0.2;
  });

  return {
    color: canvasToTexture(colorCanvas, 1, true),
    normal: canvasToTexture(normalCanvas, 1, false),
    roughness: canvasToTexture(roughCanvas, 1, false),
  };
}

// ===== BREAD CRUST PBR =====
function makeBreadCrustPBR(size = 1024) {
  const colorCanvas = makeColorTexture(size, (ctx, s) => {
    const grad = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/1.4);
    grad.addColorStop(0, '#dba055');
    grad.addColorStop(0.4, '#c08240');
    grad.addColorStop(0.8, '#965a22');
    grad.addColorStop(1, '#6b3a14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    // dense flour speckle
    for (let i = 0; i < 12000; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = Math.random() * 1.6;
      if (Math.random() > 0.65) {
        ctx.fillStyle = `rgba(255, 240, 210, ${0.2 + Math.random() * 0.4})`;
      } else {
        ctx.fillStyle = `rgba(50, 22, 8, ${0.25 + Math.random() * 0.45})`;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // blistered spots (caramelized bubbles)
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 4 + Math.random() * 12;
      const g2 = ctx.createRadialGradient(x, y, 0, x, y, r);
      g2.addColorStop(0, 'rgba(70, 35, 12, 0.7)');
      g2.addColorStop(0.7, 'rgba(70, 35, 12, 0.2)');
      g2.addColorStop(1, 'rgba(70, 35, 12, 0)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // flour-dusted patches
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 30 + Math.random() * 80;
      const g3 = ctx.createRadialGradient(x, y, 0, x, y, r);
      g3.addColorStop(0, 'rgba(255, 245, 220, 0.35)');
      g3.addColorStop(1, 'rgba(255, 245, 220, 0)');
      ctx.fillStyle = g3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Height map: bumpy crust with blisters
  const heightCanvas = makeColorTexture(size, (ctx, s) => {
    ctx.fillStyle = '#606060';
    ctx.fillRect(0, 0, s, s);
    // base bumpiness
    const img = ctx.getImageData(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = makeNoiseValue(x, y, 5, 0.55);
        const v = 60 + n * 100;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      }
    }
    ctx.putImageData(img, 0, 0);
    // blisters as bright bumps
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 3 + Math.random() * 10;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const normalCanvas = heightToNormal(heightCanvas, 3.0);

  const roughCanvas = makeRoughnessTexture(size, (x, y) => {
    return 0.78 + makeNoiseValue(x, y, 4) * 0.15;
  });

  return {
    color: canvasToTexture(colorCanvas, 1, true),
    normal: canvasToTexture(normalCanvas, 1, false),
    roughness: canvasToTexture(roughCanvas, 1, false),
  };
}

// ===== DOUGH PBR =====
function makeDoughPBR(size = 512) {
  const colorCanvas = makeColorTexture(size, (ctx, s) => {
    ctx.fillStyle = '#e8d3a8';
    ctx.fillRect(0, 0, s, s);
    const img = ctx.getImageData(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = makeNoiseValue(x, y, 5);
        const shift = (n - 0.5) * 0.18;
        const i = (y * s + x) * 4;
        img.data[i]     = Math.max(0, Math.min(255, 232 + shift * 80));
        img.data[i + 1] = Math.max(0, Math.min(255, 211 + shift * 70));
        img.data[i + 2] = Math.max(0, Math.min(255, 168 + shift * 60));
      }
    }
    ctx.putImageData(img, 0, 0);
    // flour speckle
    for (let i = 0; i < 1500; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      ctx.fillStyle = `rgba(255, 245, 220, ${0.2 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const heightCanvas = makeColorTexture(size, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const v = makeNoiseValue(x, y, 5) * 200 + 30;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

  const normalCanvas = heightToNormal(heightCanvas, 1.0);

  return {
    color: canvasToTexture(colorCanvas, 2, true),
    normal: canvasToTexture(normalCanvas, 2, false),
  };
}

// ===== BURLAP / FLOUR BAG PBR =====
function makeBurlapPBR(size = 512) {
  const colorCanvas = makeColorTexture(size, (ctx, s) => {
    ctx.fillStyle = '#e8dbbd';
    ctx.fillRect(0, 0, s, s);
    // weave pattern
    for (let y = 0; y < s; y += 3) {
      for (let x = 0; x < s; x += 3) {
        const v = (x + y) % 6 < 3 ? 1 : 0;
        ctx.fillStyle = v ? `rgba(180, 160, 120, ${0.15 + Math.random() * 0.2})` : `rgba(220, 200, 170, ${0.1 + Math.random() * 0.2})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
    // some fiber noise
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = `rgba(${100 + Math.random() * 100}, ${80 + Math.random() * 80}, ${40 + Math.random() * 60}, ${Math.random() * 0.3})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
    }
  });

  const heightCanvas = makeColorTexture(size, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 3) {
      for (let x = 0; x < s; x += 3) {
        const v = (x + y) % 6 < 3 ? 200 : 80;
        ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
  });

  const normalCanvas = heightToNormal(heightCanvas, 1.5);

  return {
    color: canvasToTexture(colorCanvas, 3, true),
    normal: canvasToTexture(normalCanvas, 3, false),
  };
}

// ===== CAST IRON PBR =====
function makeCastIronPBR(size = 512) {
  const colorCanvas = makeColorTexture(size, (ctx, s) => {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, s, s);
    const img = ctx.getImageData(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = makeNoiseValue(x, y, 6);
        const v = 18 + n * 25;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      }
    }
    ctx.putImageData(img, 0, 0);
    // pitting / wear
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = `rgba(${30 + Math.random() * 40}, ${20 + Math.random() * 30}, ${15 + Math.random() * 20}, ${0.3 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, Math.random() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const heightCanvas = makeColorTexture(size, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const v = makeNoiseValue(x, y, 6) * 120 + 80;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

  const normalCanvas = heightToNormal(heightCanvas, 0.8);

  const roughCanvas = makeRoughnessTexture(size, (x, y) => {
    return 0.45 + makeNoiseValue(x, y, 4) * 0.25;
  });

  return {
    color: canvasToTexture(colorCanvas, 2, true),
    normal: canvasToTexture(normalCanvas, 2, false),
    roughness: canvasToTexture(roughCanvas, 2, false),
  };
}

// Generate all PBR materials
const woodPBR = makeWoodPBR(1024);
const breadPBR = makeBreadCrustPBR(1024);
const doughPBR = makeDoughPBR(512);
const burlapPBR = makeBurlapPBR(512);
const ironPBR = makeCastIronPBR(512);

// ============ LIGHTING ============
const ambient = new THREE.AmbientLight(0xfff1d8, 0.3);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff0c4, 2.2);
keyLight.position.set(-5, 7, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -7;
keyLight.shadow.camera.right = 7;
keyLight.shadow.camera.top = 7;
keyLight.shadow.camera.bottom = -7;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 25;
keyLight.shadow.bias = -0.0003;
keyLight.shadow.normalBias = 0.02;
keyLight.shadow.radius = 4;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.4);
fillLight.position.set(4, 3, -2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffe4b8, 0.6);
rimLight.position.set(0, 2, -5);
scene.add(rimLight);

const ovenGlow = new THREE.PointLight(0xff5a1a, 0, 8, 1.5);
ovenGlow.position.set(0, 0.8, 0);
scene.add(ovenGlow);

// ============ TABLE ============
const tableGroup = new THREE.Group();
scene.add(tableGroup);

const tableMat = new THREE.MeshStandardMaterial({
  map: woodPBR.color,
  normalMap: woodPBR.normal,
  normalScale: new THREE.Vector2(0.8, 0.8),
  roughnessMap: woodPBR.roughness,
  roughness: 0.9,
  metalness: 0,
});

const tableTop = new THREE.Mesh(new THREE.BoxGeometry(8, 0.18, 5), tableMat);
tableTop.position.y = 0;
tableTop.receiveShadow = true;
tableTop.castShadow = true;
tableGroup.add(tableTop);

for (let i = -3; i <= 3; i += 2) {
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.181, 5),
    new THREE.MeshStandardMaterial({ color: 0x2a1808, roughness: 0.95 })
  );
  seam.position.set(i, 0.005, 0);
  tableGroup.add(seam);
}

[[-3.5, -2], [3.5, -2], [-3.5, 2], [3.5, 2]].forEach(([x, z]) => {
  const leg = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 2, 0.25),
    new THREE.MeshStandardMaterial({
      map: woodPBR.color,
      normalMap: woodPBR.normal,
      roughness: 0.9,
    })
  );
  leg.position.set(x, -1, z);
  leg.castShadow = true;
  tableGroup.add(leg);
});

// flour dust on table
const flourDustCanvas = makeColorTexture(256, (ctx, s) => {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.5})`;
    ctx.beginPath();
    ctx.arc(Math.random() * s, Math.random() * s, Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
});
const flourDustTex = canvasToTexture(flourDustCanvas, 1, false);

const flourDustMat = new THREE.MeshStandardMaterial({
  color: 0xfff5e0,
  transparent: true,
  opacity: 0.3,
  roughness: 1,
  alphaMap: flourDustTex,
});
const flourDust = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), flourDustMat);
flourDust.rotation.x = -Math.PI / 2;
flourDust.position.y = 0.092;
flourDust.position.z = 0.5;
tableGroup.add(flourDust);

// ============ INGREDIENTS ============
const ingredients = new THREE.Group();
scene.add(ingredients);

// ===== Helper: floating ingredient labels (sprite-based, always face camera) =====
function makeLabelSprite(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  // cream paper background with rounded corners
  const r = 14;
  ctx.fillStyle = '#f5ead8';
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(canvas.width - r, 0);
  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r);
  ctx.lineTo(canvas.width, canvas.height - r);
  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
  ctx.lineTo(r, canvas.height);
  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // double border
  ctx.strokeStyle = '#8a5320';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

  // decorative dots top
  ctx.fillStyle = '#8a5320';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(120 + i * 40, 38, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // title
  ctx.fillStyle = '#7a4818';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 + 4);

  // subtitle
  if (subtitle) {
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillStyle = '#9a6535';
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 50);
  }

  // bottom dots
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(120 + i * 40, canvas.height - 38, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const material = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.85, 0.32, 1);
  sprite.renderOrder = 999;
  return sprite;
}

// --- Flour sack (soft canvas, slumped, with cinched & tied neck) ---
const flourBag = new THREE.Group();
const bagMat = new THREE.MeshStandardMaterial({
  map: burlapPBR.color,
  normalMap: burlapPBR.normal,
  normalScale: new THREE.Vector2(1.2, 1.2),
  roughness: 0.98,
  color: 0xede0c0,
  side: THREE.DoubleSide,
});

// Lathe profile for a sack: wide slumped base, bulging belly, narrow tied neck,
// then a small cap of fabric flaring out above the tie.
// y = 0 sits on the table.
const sackProfile = [
  new THREE.Vector2(0.00, 0.00),
  new THREE.Vector2(0.40, 0.00),   // sits flat on table, splayed base
  new THREE.Vector2(0.55, 0.05),
  new THREE.Vector2(0.60, 0.18),   // belly widens
  new THREE.Vector2(0.58, 0.45),   // mid bulge
  new THREE.Vector2(0.50, 0.65),   // narrowing
  new THREE.Vector2(0.36, 0.80),
  new THREE.Vector2(0.22, 0.92),
  new THREE.Vector2(0.16, 1.00),   // tie point (narrowest)
  new THREE.Vector2(0.20, 1.06),
  new THREE.Vector2(0.30, 1.14),   // floppy gathered top flares out
  new THREE.Vector2(0.26, 1.22),
  new THREE.Vector2(0.10, 1.26),
  new THREE.Vector2(0.00, 1.26),
];
const bagBody = new THREE.Mesh(
  new THREE.LatheGeometry(sackProfile, 28),
  bagMat
);

// Asymmetric slump: deform vertices so the sack leans/sags like real fabric
// full of weight. We add: (1) global lean, (2) per-vertex angular noise so
// belly puckers irregularly, (3) more droop on one side.
const bp = bagBody.geometry.attributes.position;
const tmp = new THREE.Vector3();
for (let i = 0; i < bp.count; i++) {
  tmp.fromBufferAttribute(bp, i);
  const x = tmp.x, y = tmp.y, z = tmp.z;
  const radial = Math.sqrt(x*x + z*z);
  const angle = Math.atan2(z, x);
  // multi-octave radial wobble: bigger in the belly, near zero at tie & base
  const beltMask = Math.sin(Math.min(1, y / 1.0) * Math.PI); // 0 at base, peak mid, 0 at neck
  const wobble =
    Math.sin(angle * 4 + y * 6) * 0.025 +
    Math.sin(angle * 7 - y * 4) * 0.018 +
    (Math.random() - 0.5) * 0.015;
  const newR = radial + wobble * beltMask;
  // sag: lean the bag slightly forward as it goes up
  const lean = y * 0.04;
  // one-sided droop in the belly (front of sack sags more)
  const sideSag = Math.cos(angle) > 0 ? Math.cos(angle) * beltMask * 0.04 : 0;
  bp.setX(i, Math.cos(angle) * newR + lean + sideSag * 0.3);
  bp.setZ(i, Math.sin(angle) * newR);
  // a little vertical droop on the belly's heavy side
  if (beltMask > 0.3) {
    bp.setY(i, y - sideSag * 0.5);
  }
}
bagBody.geometry.computeVertexNormals();
bagBody.castShadow = true;
bagBody.receiveShadow = true;
flourBag.add(bagBody);

// Vertical fold creases running down the belly (subtle darker streaks made of
// thin curved planes following the surface)
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2 + 0.2;
  // build a tall thin strip along the bag side
  const foldPts = [];
  for (let t = 0; t <= 1; t += 0.1) {
    const yy = t * 0.85 + 0.05;
    // approximate the lathe profile radius at this height
    let rr = 0.55;
    if (yy < 0.18) rr = 0.55 + (yy / 0.18) * 0.05;
    else if (yy < 0.45) rr = 0.60 - ((yy - 0.18) / 0.27) * 0.02;
    else if (yy < 0.65) rr = 0.58 - ((yy - 0.45) / 0.20) * 0.08;
    else if (yy < 0.80) rr = 0.50 - ((yy - 0.65) / 0.15) * 0.14;
    else rr = 0.36 - ((yy - 0.80) / 0.20) * 0.20;
    foldPts.push(new THREE.Vector2(rr + 0.005, yy));
  }
  const foldGeom = new THREE.LatheGeometry(foldPts, 4, a - 0.04, 0.08);
  const fold = new THREE.Mesh(
    foldGeom,
    new THREE.MeshStandardMaterial({
      color: 0xb8a878,
      roughness: 1,
      transparent: true,
      opacity: 0.35,
    })
  );
  flourBag.add(fold);
}

// Twine knot ring around the cinched neck
const twineMat = new THREE.MeshStandardMaterial({
  color: 0x6b4a22,
  roughness: 0.95,
});
const twine = new THREE.Mesh(
  new THREE.TorusGeometry(0.17, 0.022, 10, 32),
  twineMat
);
twine.position.y = 1.00;
twine.rotation.x = Math.PI / 2;
twine.castShadow = true;
flourBag.add(twine);

// Knot bump on twine
const knot = new THREE.Mesh(
  new THREE.SphereGeometry(0.04, 12, 12),
  twineMat
);
knot.position.set(0.18, 1.00, 0.05);
knot.scale.set(1.2, 0.9, 0.9);
flourBag.add(knot);

// Two short twine tails hanging from the knot
for (let i = 0; i < 2; i++) {
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.008, 0.18, 6),
    twineMat
  );
  tail.position.set(0.20 + i * 0.02, 0.92, 0.05 + i * 0.02);
  tail.rotation.z = -0.3 + i * 0.4;
  flourBag.add(tail);
}

flourBag.position.set(-2.2, 0.05, 0);
flourBag.rotation.y = 0.3;
ingredients.add(flourBag);

// Floating label above flour bag
const flourBagLabel = makeLabelSprite('Flour', 'stone milled');
flourBagLabel.position.set(-2.2, 1.85, 0);
ingredients.add(flourBagLabel);
flourBag.userData.label = flourBagLabel;

// --- Salt bowl ---
const saltBowl = new THREE.Group();
const ceramicMat = new THREE.MeshPhysicalMaterial({
  color: 0xebe2d0,
  roughness: 0.25,
  clearcoat: 0.6,
  clearcoatRoughness: 0.3,
});
const saltDish = new THREE.Mesh(
  new THREE.LatheGeometry([
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.22, 0),
    new THREE.Vector2(0.28, 0.05),
    new THREE.Vector2(0.32, 0.18),
    new THREE.Vector2(0.30, 0.20),
    new THREE.Vector2(0.26, 0.20),
    new THREE.Vector2(0.24, 0.18),
    new THREE.Vector2(0.22, 0.05),
  ], 24),
  ceramicMat
);
saltDish.castShadow = true;
saltDish.receiveShadow = true;
saltBowl.add(saltDish);

const saltMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.55,
});
const saltMound = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  saltMat
);
const sp2 = saltMound.geometry.attributes.position;
for (let i = 0; i < sp2.count; i++) {
  sp2.setX(i, sp2.getX(i) + (Math.random() - 0.5) * 0.04);
  sp2.setY(i, sp2.getY(i) + (Math.random() - 0.5) * 0.04);
  sp2.setZ(i, sp2.getZ(i) + (Math.random() - 0.5) * 0.04);
}
saltMound.geometry.computeVertexNormals();
saltMound.position.y = 0.13;
saltMound.scale.y = 0.4;
saltBowl.add(saltMound);

saltBowl.position.set(-0.8, 0.2, 1.2);
ingredients.add(saltBowl);

const saltLabel = makeLabelSprite('Salt', 'sea, flaked');
saltLabel.position.set(-0.8, 0.95, 1.2);
ingredients.add(saltLabel);
saltBowl.userData.label = saltLabel;

// --- Starter jar ---
const starterJar = new THREE.Group();
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  roughness: 0.05,
  transmission: 0.95,
  transparent: true,
  thickness: 0.4,
  ior: 1.5,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  envMapIntensity: 1.2,
});
const jarGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.32, 0.9, 32), glassMat);
jarGlass.castShadow = true;
starterJar.add(jarGlass);

const starterMat = new THREE.MeshStandardMaterial({
  color: 0xf2e6c0,
  roughness: 0.85,
});
const starterContent = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.30, 0.5, 24), starterMat);
starterContent.position.y = -0.15;
starterJar.add(starterContent);

const starterTop = new THREE.Mesh(new THREE.CircleGeometry(0.31, 24), starterMat);
starterTop.rotation.x = -Math.PI / 2;
starterTop.position.y = 0.10;
starterJar.add(starterTop);

for (let i = 0; i < 14; i++) {
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.025 + Math.random() * 0.035, 12, 12),
    new THREE.MeshPhysicalMaterial({
      color: 0xfff8e0,
      roughness: 0.2,
      transmission: 0.3,
      transparent: true,
      opacity: 0.7,
    })
  );
  const r = Math.random() * 0.25;
  const a = Math.random() * Math.PI * 2;
  bubble.position.set(Math.cos(a) * r, 0.10 + Math.random() * 0.02, Math.sin(a) * r);
  starterJar.add(bubble);
}

const jarLid = new THREE.Mesh(
  new THREE.CylinderGeometry(0.36, 0.36, 0.08, 24),
  new THREE.MeshStandardMaterial({ color: 0x8a5a20, roughness: 0.4, metalness: 0.7 })
);
jarLid.position.y = 0.5;
jarLid.castShadow = true;
starterJar.add(jarLid);

starterJar.position.set(0.8, 0.55, 1.2);
ingredients.add(starterJar);

const starterLabel = makeLabelSprite('Starter', 'wild, alive');
starterLabel.position.set(0.8, 1.5, 1.2);
ingredients.add(starterLabel);
starterJar.userData.label = starterLabel;

// --- Water jug ---
const waterJug = new THREE.Group();
const jugBody = new THREE.Mesh(
  new THREE.LatheGeometry([
    new THREE.Vector2(0, -0.35),
    new THREE.Vector2(0.32, -0.35),
    new THREE.Vector2(0.34, -0.30),
    new THREE.Vector2(0.32, 0.20),
    new THREE.Vector2(0.28, 0.30),
    new THREE.Vector2(0.26, 0.32),
    new THREE.Vector2(0, 0.32),
  ], 32),
  new THREE.MeshPhysicalMaterial({
    color: 0xc8e0e8,
    roughness: 0.05,
    transmission: 0.92,
    transparent: true,
    thickness: 0.3,
    ior: 1.45,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  })
);
jugBody.castShadow = true;
waterJug.add(jugBody);

// water fills nearly to top of jug
const water = new THREE.Mesh(
  new THREE.CylinderGeometry(0.305, 0.335, 0.55, 32),
  new THREE.MeshPhysicalMaterial({
    color: 0x4a90b0,
    roughness: 0.08,
    transmission: 0.3,
    transparent: true,
    opacity: 0.95,
    ior: 1.33,
    thickness: 0.5,
  })
);
water.position.y = 0.01;
waterJug.add(water);

// water surface (visible top meniscus)
const waterSurface = new THREE.Mesh(
  new THREE.CircleGeometry(0.305, 32),
  new THREE.MeshPhysicalMaterial({
    color: 0x6bb0c8,
    roughness: 0.05,
    metalness: 0,
    transmission: 0.2,
    transparent: true,
    opacity: 0.7,
    ior: 1.33,
  })
);
waterSurface.rotation.x = -Math.PI / 2;
waterSurface.position.y = 0.285;
waterJug.add(waterSurface);

const handle = new THREE.Mesh(
  new THREE.TorusGeometry(0.13, 0.025, 8, 20, Math.PI),
  new THREE.MeshPhysicalMaterial({
    color: 0xc8e0e8,
    roughness: 0.05,
    transmission: 0.9,
    transparent: true,
    thickness: 0.2,
  })
);
handle.position.set(0.32, 0.05, 0);
handle.rotation.y = Math.PI / 2;
waterJug.add(handle);

waterJug.position.set(2.2, 0.45, 0);
waterJug.rotation.y = -0.2;
ingredients.add(waterJug);

const waterLabel = makeLabelSprite('Water', 'filtered, cool');
waterLabel.position.set(2.2, 1.4, 0);
ingredients.add(waterLabel);
waterJug.userData.label = waterLabel;

// ============ MIXING BOWL ============
const bowlGroup = new THREE.Group();
scene.add(bowlGroup);

const bowlMat = new THREE.MeshPhysicalMaterial({
  color: 0xd4b896,
  roughness: 0.35,
  clearcoat: 0.4,
  clearcoatRoughness: 0.3,
});

const bowlOuter = new THREE.Mesh(
  new THREE.LatheGeometry([
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.85, 0),
    new THREE.Vector2(1.05, 0.15),
    new THREE.Vector2(1.18, 0.5),
    new THREE.Vector2(1.22, 0.75),
    new THREE.Vector2(1.20, 0.78),
    new THREE.Vector2(1.10, 0.78),
    new THREE.Vector2(1.05, 0.7),
    new THREE.Vector2(0.95, 0.4),
    new THREE.Vector2(0.80, 0.15),
    new THREE.Vector2(0, 0.15),
  ], 32),
  bowlMat
);
bowlOuter.castShadow = true;
bowlOuter.receiveShadow = true;
bowlGroup.add(bowlOuter);

// Dough
const doughGeometry = new THREE.SphereGeometry(0.7, 64, 40);
const shaggyPositions = doughGeometry.attributes.position.array.slice();
const smoothPositions = doughGeometry.attributes.position.array.slice();
for (let i = 0; i < shaggyPositions.length; i += 3) {
  const x = shaggyPositions[i];
  const y = shaggyPositions[i + 1];
  const z = shaggyPositions[i + 2];
  const n1 = Math.sin(x * 8) * Math.cos(y * 7) * Math.sin(z * 9) * 0.18;
  const n2 = (Math.random() - 0.5) * 0.18;
  const len = Math.sqrt(x*x + y*y + z*z);
  const nx = x / len, ny = y / len, nz = z / len;
  shaggyPositions[i] += nx * (n1 + n2);
  shaggyPositions[i + 1] += ny * (n1 + n2);
  shaggyPositions[i + 2] += nz * (n1 + n2);
}

const doughMaterial = new THREE.MeshStandardMaterial({
  map: doughPBR.color,
  normalMap: doughPBR.normal,
  normalScale: new THREE.Vector2(0.5, 0.5),
  roughness: 0.92,
});
const dough = new THREE.Mesh(doughGeometry, doughMaterial);
dough.position.y = 0.35;
dough.scale.set(0, 0, 0);
dough.castShadow = true;
dough.receiveShadow = true;
bowlGroup.add(dough);

bowlGroup.position.set(0, 0.1, 0);
bowlGroup.scale.set(0, 0, 0);

// ============ FLOUR PARTICLES ============
const flourParticles = new THREE.Group();
scene.add(flourParticles);
const flourParticleArr = [];
for (let i = 0; i < 80; i++) {
  const p = new THREE.Mesh(
    new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 6, 6),
    new THREE.MeshStandardMaterial({
      color: 0xfff5e0,
      roughness: 1,
      transparent: true,
      opacity: 0,
    })
  );
  p.visible = false;
  flourParticles.add(p);
  flourParticleArr.push({
    mesh: p,
    seed: Math.random() * Math.PI * 2,
    radius: 0.2 + Math.random() * 1.4,
    speed: 0.5 + Math.random() * 0.8,
  });
}

// ============ DUTCH OVEN ============
const ovenGroup = new THREE.Group();
scene.add(ovenGroup);

const castIronMat = new THREE.MeshStandardMaterial({
  map: ironPBR.color,
  normalMap: ironPBR.normal,
  normalScale: new THREE.Vector2(0.6, 0.6),
  roughnessMap: ironPBR.roughness,
  roughness: 0.55,
  metalness: 0.65,
});

const potBody = new THREE.Mesh(
  new THREE.LatheGeometry([
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.85, 0),
    new THREE.Vector2(0.92, 0.05),
    new THREE.Vector2(0.95, 0.5),
    new THREE.Vector2(0.98, 0.85),
    new THREE.Vector2(1.0, 0.92),
    new THREE.Vector2(0.92, 0.92),
    new THREE.Vector2(0.90, 0.85),
    new THREE.Vector2(0.88, 0.5),
    new THREE.Vector2(0.82, 0.05),
    new THREE.Vector2(0, 0.05),
  ], 32),
  castIronMat
);
potBody.castShadow = true;
potBody.receiveShadow = true;
ovenGroup.add(potBody);

const potInteriorMat = new THREE.MeshStandardMaterial({
  color: 0x0a0503,
  roughness: 0.95,
  emissive: 0xff4400,
  emissiveIntensity: 0,
});
const potInterior = new THREE.Mesh(
  new THREE.CylinderGeometry(0.85, 0.78, 0.85, 32, 1, true),
  potInteriorMat
);
potInterior.position.y = 0.45;
ovenGroup.add(potInterior);

const potBottom = new THREE.Mesh(
  new THREE.CircleGeometry(0.78, 32),
  potInteriorMat
);
potBottom.rotation.x = -Math.PI / 2;
potBottom.position.y = 0.06;
ovenGroup.add(potBottom);

[0, Math.PI].forEach(angle => {
  const h = new THREE.Mesh(
    new THREE.TorusGeometry(0.10, 0.025, 8, 16, Math.PI),
    castIronMat
  );
  h.position.set(Math.cos(angle) * 1.0, 0.5, Math.sin(angle) * 1.0);
  h.rotation.set(0, angle - Math.PI / 2, Math.PI / 2);
  h.castShadow = true;
  ovenGroup.add(h);
});

const potLid = new THREE.Group();
const lidDome = new THREE.Mesh(
  new THREE.LatheGeometry([
    new THREE.Vector2(0, 0.1),
    new THREE.Vector2(0.3, 0.09),
    new THREE.Vector2(0.7, 0.06),
    new THREE.Vector2(1.0, 0),
    new THREE.Vector2(1.02, 0),
    new THREE.Vector2(1.02, -0.05),
    new THREE.Vector2(1.0, -0.05),
  ], 32),
  castIronMat
);
lidDome.castShadow = true;
potLid.add(lidDome);

const lidKnob = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 16, 16),
  castIronMat
);
lidKnob.position.y = 0.15;
lidKnob.castShadow = true;
potLid.add(lidKnob);

potLid.position.y = 0.92;
ovenGroup.add(potLid);

ovenGroup.position.set(0, 0.1, 0);
ovenGroup.scale.set(0, 0, 0);

// ============ BAKED BREAD ============
const breadGroup = new THREE.Group();
scene.add(breadGroup);

const breadGeometry = new THREE.SphereGeometry(0.78, 80, 50);
const bgp = breadGeometry.attributes.position;
for (let i = 0; i < bgp.count; i++) {
  let x = bgp.getX(i);
  let y = bgp.getY(i);
  let z = bgp.getZ(i);
  y *= 0.72;
  const n1 = Math.sin(x * 6) * Math.cos(z * 6) * 0.04;
  const n2 = Math.sin(x * 14 + 1.3) * Math.cos(z * 12 + 0.7) * 0.018;
  const n3 = Math.sin(x * 25) * Math.cos(z * 22) * 0.008;
  const len = Math.sqrt(x*x + y*y + z*z) || 1;
  const nx = x / len, ny = y / len, nz = z / len;
  const total = n1 + n2 + n3;
  bgp.setX(i, x + nx * total);
  bgp.setY(i, y + ny * total);
  bgp.setZ(i, z + nz * total);
}
breadGeometry.computeVertexNormals();

const breadMaterial = new THREE.MeshStandardMaterial({
  map: breadPBR.color,
  normalMap: breadPBR.normal,
  normalScale: new THREE.Vector2(1.2, 1.2),
  roughnessMap: breadPBR.roughness,
  roughness: 0.88,
  metalness: 0,
});
const bread = new THREE.Mesh(breadGeometry, breadMaterial);
bread.position.y = 0.6;
bread.castShadow = true;
bread.receiveShadow = true;
breadGroup.add(bread);

const earGeometry = new THREE.BoxGeometry(0.7, 0.04, 0.12);
const earGeoP = earGeometry.attributes.position;
for (let i = 0; i < earGeoP.count; i++) {
  earGeoP.setY(i, earGeoP.getY(i) + (Math.random() - 0.5) * 0.015);
}
earGeometry.computeVertexNormals();
const ear = new THREE.Mesh(
  earGeometry,
  new THREE.MeshStandardMaterial({ color: 0xf0d7a8, roughness: 0.92 })
);
ear.position.set(0, 1.1, 0);
ear.rotation.z = -0.18;
ear.rotation.x = -0.05;
breadGroup.add(ear);

const flourDustOnBread = new THREE.Mesh(
  new THREE.SphereGeometry(0.79, 32, 20, 0, Math.PI * 2, 0, Math.PI / 3),
  new THREE.MeshStandardMaterial({
    color: 0xfff5e0,
    transparent: true,
    opacity: 0.18,
    roughness: 1,
    alphaMap: flourDustTex,
  })
);
flourDustOnBread.position.y = 0.6;
flourDustOnBread.scale.y = 0.72;
breadGroup.add(flourDustOnBread);

const rack = new THREE.Group();
const metalRackMat = new THREE.MeshStandardMaterial({
  color: 0x3a3a3a,
  roughness: 0.35,
  metalness: 0.85,
});
const frameTop = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.025, 8, 32), metalRackMat);
frameTop.rotation.x = Math.PI / 2;
frameTop.scale.set(1.1, 0.6, 1);
rack.add(frameTop);
for (let i = -0.95; i <= 0.95; i += 0.13) {
  const wire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.3, 8),
    metalRackMat
  );
  wire.rotation.x = Math.PI / 2;
  wire.position.set(i, 0, 0);
  wire.castShadow = true;
  rack.add(wire);
}
[[-1.0, 0.55], [1.0, 0.55], [-1.0, -0.55], [1.0, -0.55]].forEach(([x, z]) => {
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8),
    metalRackMat
  );
  foot.position.set(x, -0.07, z);
  foot.castShadow = true;
  rack.add(foot);
});
rack.position.y = 0.18;
breadGroup.add(rack);

breadGroup.position.set(0, 0.05, 0);
breadGroup.scale.set(0, 0, 0);

// ============ STEAM PARTICLES ============
const steamGroup = new THREE.Group();
scene.add(steamGroup);
const steamParticles = [];
const steamCanvas = document.createElement('canvas');
steamCanvas.width = steamCanvas.height = 128;
{
  const ctx = steamCanvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
}
const steamTex = new THREE.CanvasTexture(steamCanvas);

for (let i = 0; i < 40; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: steamTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    color: 0xffffff,
  }));
  s.scale.set(0.6, 0.6, 0.6);
  steamGroup.add(s);
  steamParticles.push({
    mesh: s,
    seed: Math.random() * Math.PI * 2,
    speed: 0.3 + Math.random() * 0.5,
    drift: (Math.random() - 0.5) * 0.3,
  });
}

// ============ HELPERS ============
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ============ SCROLL ============
let scrollProgress = 0;
let targetScroll = 0;

window.addEventListener('scroll', () => {
  const max = document.body.scrollHeight - window.innerHeight;
  targetScroll = max > 0 ? window.scrollY / max : 0;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
});

// ============ STAGE UPDATE ============
function updateScene(p, time) {
  // INGREDIENTS
  ingredients.visible = p < 0.45;
  const items = [flourBag, saltBowl, starterJar, waterJug];
  const labelOffsets = [
    new THREE.Vector3(0, 1.80, 0),  // flour sack label offset above
    new THREE.Vector3(0, 0.75, 0),  // salt bowl label offset
    new THREE.Vector3(0, 0.95, 0),  // starter jar label offset
    new THREE.Vector3(0, 0.95, 0),  // water jug label offset
  ];
  items.forEach((item, i) => {
    const delay = i * 0.025;
    const local = smoothstep(0.05 + delay, 0.18 + delay, p);
    const fade = 1 - smoothstep(0.32, 0.42, p);
    item.scale.setScalar(local * fade);

    // Label appearance: fade in slightly later, fade out before mix
    if (item.userData.label) {
      const label = item.userData.label;
      // labels appear after the ingredient settles, fade out at start of mix
      const labelShow = smoothstep(0.10 + delay, 0.20 + delay, p) * (1 - smoothstep(0.25, 0.32, p));
      label.material.opacity = labelShow;
      label.visible = labelShow > 0.01;
      // Track the ingredient's base position with offset
      label.position.x = item.position.x;
      label.position.z = item.position.z;
      label.position.y = item.position.y + labelOffsets[i].y;
      // gentle bobbing
      label.position.y += Math.sin(time * 0.001 + i) * 0.015;
      label.scale.set(0.85 * labelShow, 0.32 * labelShow, 1);
    }
  });

  if (p > 0.28 && p < 0.45) {
    const mixT = smoothstep(0.28, 0.4, p);
    flourBag.position.x = lerp(-2.2, -0.3, mixT);
    flourBag.position.y = lerp(0.05, 1.5, mixT);
    flourBag.rotation.z = lerp(0, Math.PI * 0.6, mixT);
    saltBowl.position.x = lerp(-0.8, -0.1, mixT);
    saltBowl.position.z = lerp(1.2, 0.2, mixT);
    saltBowl.position.y = lerp(0.2, 1.2, mixT);
    saltBowl.rotation.z = lerp(0, Math.PI * 0.4, mixT);
    starterJar.position.x = lerp(0.8, 0.1, mixT);
    starterJar.position.z = lerp(1.2, 0.2, mixT);
    starterJar.position.y = lerp(0.55, 1.4, mixT);
    starterJar.rotation.z = lerp(0, -Math.PI * 0.4, mixT);
    waterJug.position.x = lerp(2.2, 0.3, mixT);
    waterJug.position.y = lerp(0.45, 1.5, mixT);
    waterJug.rotation.z = lerp(0, -Math.PI * 0.6, mixT);
  } else if (p <= 0.28) {
    flourBag.position.set(-2.2, 0.05, 0);
    flourBag.rotation.z = 0;
    saltBowl.position.set(-0.8, 0.2, 1.2);
    saltBowl.rotation.z = 0;
    starterJar.position.set(0.8, 0.55, 1.2);
    starterJar.rotation.z = 0;
    waterJug.position.set(2.2, 0.45, 0);
    waterJug.rotation.z = 0;
  }

  // BOWL
  const bowlShow = smoothstep(0.22, 0.35, p) * (1 - smoothstep(0.62, 0.7, p));
  bowlGroup.scale.setScalar(bowlShow);
  bowlGroup.visible = bowlShow > 0.01;

  // DOUGH
  const doughShow = smoothstep(0.35, 0.5, p) * (1 - smoothstep(0.62, 0.7, p));
  dough.scale.setScalar(doughShow * 0.9);

  const smoothT = smoothstep(0.45, 0.62, p);
  const positions = doughGeometry.attributes.position.array;
  for (let i = 0; i < positions.length; i++) {
    positions[i] = lerp(shaggyPositions[i], smoothPositions[i], smoothT);
  }
  doughGeometry.attributes.position.needsUpdate = true;
  doughGeometry.computeVertexNormals();

  dough.rotation.y = p * 4 + time * 0.0003;
  dough.position.y = 0.35 + Math.sin(time * 0.001) * 0.005 * doughShow;

  // FLOUR PARTICLES
  const flourBurst = smoothstep(0.3, 0.36, p) * (1 - smoothstep(0.42, 0.5, p));
  flourParticleArr.forEach((fp, i) => {
    if (flourBurst > 0.05) {
      fp.mesh.visible = true;
      const t = (p - 0.3) * 8 + i * 0.05;
      const cycle = (t * fp.speed) % 1.5;
      const angle = i * 0.7 + fp.seed;
      fp.mesh.position.set(
        Math.cos(angle) * (0.2 + cycle * fp.radius),
        1.4 + Math.sin(t * 2 + fp.seed) * 0.2 - cycle * 0.6,
        Math.sin(angle) * (0.2 + cycle * fp.radius)
      );
      fp.mesh.material.opacity = flourBurst * (1 - cycle / 1.5) * 0.7;
    } else {
      fp.mesh.visible = false;
    }
  });

  // OVEN
  const ovenShow = smoothstep(0.62, 0.75, p) * (1 - smoothstep(0.92, 1, p));
  ovenGroup.scale.setScalar(ovenShow);
  ovenGroup.visible = ovenShow > 0.01;

  const lidLift = smoothstep(0.78, 0.9, p);
  potLid.position.y = lerp(0.92, 1.7, lidLift);
  potLid.position.x = lerp(0, 0.4, lidLift);
  potLid.rotation.z = lerp(0, -0.3, lidLift);

  const glowT = smoothstep(0.7, 0.82, p) * (1 - smoothstep(0.88, 0.95, p));
  ovenGlow.intensity = glowT * 4;
  potInteriorMat.emissiveIntensity = glowT * 2.5;

  // Drive bloom strength based on oven phase
  bloomPass.strength = 0.35 + glowT * 0.7 + smoothstep(0.85, 0.95, p) * 0.2;

  // STEAM
  const steamT = smoothstep(0.82, 0.92, p) * (1 - smoothstep(0.97, 1, p));
  steamParticles.forEach((sp, i) => {
    const t = (p - 0.82) * 4 + sp.seed + time * 0.0005;
    const cycle = (t * sp.speed) % 2.5;
    sp.mesh.position.set(
      Math.sin(t * 0.8 + sp.seed) * 0.5 + sp.drift * cycle,
      0.7 + cycle,
      Math.cos(t * 0.8 + sp.seed) * 0.5
    );
    sp.mesh.material.opacity = steamT * 0.55 * (1 - cycle / 2.5) * (cycle / 0.3 < 1 ? cycle / 0.3 : 1);
    const scale = 0.4 + cycle * 0.6;
    sp.mesh.scale.set(scale, scale, scale);
  });

  // BREAD
  const breadShow = smoothstep(0.85, 0.95, p);
  breadGroup.scale.setScalar(breadShow);
  breadGroup.visible = breadShow > 0.01;

  // CAMERA
  let camX, camY, camZ, lookY = 0.5, focusDist = 5;

  if (p < 0.3) {
    const t = p / 0.3;
    camX = lerp(0, -0.5, t);
    camY = lerp(3.5, 3, t);
    camZ = lerp(7, 6, t);
    focusDist = lerp(7, 6, t);
  } else if (p < 0.5) {
    const t = (p - 0.3) / 0.2;
    camX = lerp(-0.5, 0, t);
    camY = lerp(3, 2.5, t);
    camZ = lerp(6, 4, t);
    lookY = lerp(0.5, 0.8, t);
    focusDist = lerp(6, 4, t);
  } else if (p < 0.65) {
    const t = (p - 0.5) / 0.15;
    const angle = t * Math.PI * 0.6;
    camX = Math.sin(angle) * 4;
    camY = lerp(2.5, 2.2, t);
    camZ = Math.cos(angle) * 4;
    lookY = 0.8;
    focusDist = 4;
  } else if (p < 0.85) {
    const t = (p - 0.65) / 0.2;
    const angle = lerp(Math.PI * 0.6, 0, t);
    camX = Math.sin(angle) * lerp(4, 3, t);
    camY = lerp(2.2, 1.8, t);
    camZ = Math.cos(angle) * lerp(4, 5, t);
    lookY = lerp(0.8, 0.6, t);
    focusDist = lerp(4, 5, t);
  } else {
    const t = (p - 0.85) / 0.15;
    const angle = t * Math.PI * 0.5;
    camX = Math.sin(angle) * 4;
    camY = lerp(1.8, 2.2, t);
    camZ = Math.cos(angle) * 4 + lerp(0, 1, t);
    lookY = 0.7;
    focusDist = lerp(4.5, 5, t);
  }

  camera.position.set(camX, camY, camZ);
  camera.lookAt(0, lookY, 0);

  // Update bokeh focus to match subject distance
  if (bokehPass.uniforms && bokehPass.uniforms.focus) {
    bokehPass.uniforms.focus.value = lerp(bokehPass.uniforms.focus.value, focusDist, 0.1);
  }
}

// ============ ANIMATION LOOP ============
function animate(time) {
  requestAnimationFrame(animate);
  scrollProgress = lerp(scrollProgress, targetScroll, 0.08);
  document.getElementById('progress').style.width = (scrollProgress * 100) + '%';
  updateScene(scrollProgress, time);
  composer.render();
}

// ============ INIT ============
setTimeout(() => {
  document.getElementById('loader').classList.add('hidden');
  setTimeout(() => document.getElementById('loader').remove(), 700);
}, 1000);

requestAnimationFrame(animate);