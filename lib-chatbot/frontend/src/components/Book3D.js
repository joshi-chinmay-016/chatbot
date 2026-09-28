import * as THREE from 'three';

// Category color palettes
export const CATEGORY_COLORS = {
  'Programming': { main: '#4f46e5', accent: '#06b6d4', dark: '#1e1b4b' },
  'Software Engineering': { main: '#4338ca', accent: '#a855f7', dark: '#1e1b4b' },
  'Machine Learning': { main: '#7c3aed', accent: '#ec4899', dark: '#2e1065' },
  'AI': { main: '#059669', accent: '#34d399', dark: '#022c22' },
  'Algorithms': { main: '#e11d48', accent: '#fb7185', dark: '#4c0519' },
  'Database': { main: '#d97706', accent: '#fbbf24', dark: '#451a03' },
  'Networking': { main: '#2563eb', accent: '#38bdf8', dark: '#0f172a' },
  'Data Science': { main: '#0d9488', accent: '#2dd4bf', dark: '#134e4a' },
  'Web Development': { main: '#0284c7', accent: '#67e8f9', dark: '#082f49' },
  'Self Help': { main: '#b45309', accent: '#fde047', dark: '#3a1a00' },
};

export function getCategoryPalette(category) {
  return CATEGORY_COLORS[category] || { main: '#6366f1', accent: '#a5b4fc', dark: '#0f172a' };
}

/**
 * Creates a canvas texture for the book cover with title and author.
 */
function createCoverTexture(book, palette) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 768);
  grad.addColorStop(0, palette.dark);
  grad.addColorStop(0.5, palette.main);
  grad.addColorStop(1, '#05070e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 768);

  // Border Accent
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, 472, 728);

  // Category Badge
  ctx.fillStyle = palette.accent;
  ctx.fillRect(40, 50, 240, 36);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(book.category.toUpperCase(), 50, 75);

  // Status Badge
  ctx.fillStyle = book.available ? '#10b981' : '#f43f5e';
  ctx.beginPath();
  ctx.arc(440, 70, 16, 0, Math.PI * 2);
  ctx.fill();

  // Decorative Geometric Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 200);
  ctx.lineTo(472, 200);
  ctx.moveTo(40, 520);
  ctx.lineTo(472, 520);
  ctx.stroke();

  // Book Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  const words = book.title.split(' ');
  let line = '';
  let y = 280;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 420 && n > 0) {
      ctx.fillText(line, 45, y);
      line = words[n] + ' ';
      y += 46;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 45, y);

  // Author
  ctx.fillStyle = palette.accent;
  ctx.font = '500 24px sans-serif';
  ctx.fillText('BY ' + book.author.toUpperCase(), 45, y + 60);

  // Footer Crest
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '18px monospace';
  ctx.fillText('CMRIT LIBRARY ARCHIVES', 45, 700);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Creates canvas texture for the book spine.
 */
function createSpineTexture(book, palette) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  // Spine gradient
  const grad = ctx.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, '#000000');
  grad.addColorStop(0.3, palette.main);
  grad.addColorStop(0.8, palette.dark);
  grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 768);

  // Spine Title rotated vertically
  ctx.save();
  ctx.translate(64, 400);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';

  let shortTitle = book.title;
  if (shortTitle.length > 24) shortTitle = shortTitle.substring(0, 22) + '...';
  ctx.fillText(shortTitle, 0, 10);
  ctx.restore();

  // Status icon dot at bottom of spine
  ctx.fillStyle = book.available ? '#10b981' : '#f43f5e';
  ctx.beginPath();
  ctx.arc(64, 710, 14, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Constructs a composite 3D Book mesh with realistic cover, paper pages, and status halo.
 */
export function createBookMesh(book) {
  const group = new THREE.Group();
  const palette = getCategoryPalette(book.category);

  const width = 1.4;
  const height = 2.0;
  const depth = 0.42;

  // Cover Textures
  const coverTexture = createCoverTexture(book, palette);
  const spineTexture = createSpineTexture(book, palette);

  // Materials for BoxGeometry (right, left, top, bottom, front, back)
  // In our orientation:
  // Face +X: Pages edge
  // Face -X: Spine (left)
  // Face +Y: Top pages
  // Face -Y: Bottom pages
  // Face +Z: Front Cover
  // Face -Z: Back Cover
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xf5f3ee,
    roughness: 0.8,
  });

  const spineMat = new THREE.MeshStandardMaterial({
    map: spineTexture,
    roughness: 0.4,
    metalness: 0.1,
  });

  const coverMat = new THREE.MeshStandardMaterial({
    map: coverTexture,
    roughness: 0.35,
    metalness: 0.2,
  });

  const backCoverMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.dark),
    roughness: 0.5,
  });

  const materials = [
    paperMat,      // +X (Page edge)
    spineMat,      // -X (Spine)
    paperMat,      // +Y (Top)
    paperMat,      // -Y (Bottom)
    coverMat,      // +Z (Front)
    backCoverMat,  // -Z (Back)
  ];

  const bookGeom = new THREE.BoxGeometry(width, height, depth);
  const bookMesh = new THREE.Mesh(bookGeom, materials);
  bookMesh.castShadow = true;
  bookMesh.receiveShadow = true;
  group.add(bookMesh);

  // Hologram Ring Indicator on shelf base
  const ringGeom = new THREE.RingGeometry(0.35, 0.48, 32);
  const ringColor = book.available ? 0x10b981 : 0xf43f5e;
  const ringMat = new THREE.MeshBasicMaterial({
    color: ringColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -height / 2 - 0.05;
  ring.name = 'statusRing';
  group.add(ring);

  // Glowing status crystal / beacon pin on top of spine
  const beaconGeom = new THREE.SphereGeometry(0.08, 16, 16);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: ringColor,
  });
  const beacon = new THREE.Mesh(beaconGeom, beaconMat);
  beacon.position.set(-width / 2 + 0.05, height / 2 + 0.1, 0);
  beacon.name = 'beacon';
  group.add(beacon);

  // Attach metadata
  group.userData = {
    book,
    palette,
    bookMesh,
    ring,
    beacon,
    hovered: false,
    selected: false,
    baseY: 0,
    baseZ: 0,
  };

  return group;
}
