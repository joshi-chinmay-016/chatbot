import * as THREE from 'three';

// Subject color palettes for study topics
export const SUBJECT_PALETTES = {
  'Physics': {
    primary: '#06b6d4',
    secondary: '#3b82f6',
    accent: '#67e8f9',
    dark: '#082f49',
    glow: 0x06b6d4,
  },
  'Mathematics': {
    primary: '#10b981',
    secondary: '#059669',
    accent: '#6ee7b7',
    dark: '#064e3b',
    glow: 0x10b981,
  },
  'Computing & AI': {
    primary: '#8b5cf6',
    secondary: '#6366f1',
    accent: '#c084fc',
    dark: '#2e1065',
    glow: 0x8b5cf6,
  },
  'Astronomy': {
    primary: '#ec4899',
    secondary: '#d946ef',
    accent: '#f472b6',
    dark: '#500724',
    glow: 0xec4899,
  },
  'Chemistry & Biology': {
    primary: '#f59e0b',
    secondary: '#d97706',
    accent: '#fcd34d',
    dark: '#451a03',
    glow: 0xf59e0b,
  },
  'General Science': {
    primary: '#38bdf8',
    secondary: '#0284c7',
    accent: '#7dd3fc',
    dark: '#0c4a6e',
    glow: 0x38bdf8,
  },
};

/**
 * Determines subject category based on note filename and preview
 */
export function getSubjectCategory(filename, preview = '') {
  const combined = (filename + ' ' + preview).toLowerCase();

  if (combined.includes('newton') || combined.includes('physic') || combined.includes('gravity') || combined.includes('motion') || combined.includes('velocity') || combined.includes('force')) {
    return 'Physics';
  }
  if (combined.includes('math') || combined.includes('calc') || combined.includes('euler') || combined.includes('algebra') || combined.includes('matrix') || combined.includes('theorem')) {
    return 'Mathematics';
  }
  if (combined.includes('quantum') || combined.includes('astro') || combined.includes('space') || combined.includes('planet') || combined.includes('orbit') || combined.includes('star')) {
    return 'Astronomy';
  }
  if (combined.includes('bio') || combined.includes('cell') || combined.includes('gene') || combined.includes('dna') || combined.includes('chem') || combined.includes('molecule') || combined.includes('reaction')) {
    return 'Chemistry & Biology';
  }
  if (combined.includes('ai') || combined.includes('agent') || combined.includes('code') || combined.includes('algo') || combined.includes('neural') || combined.includes('turing') || combined.includes('program')) {
    return 'Computing & AI';
  }
  return 'General Science';
}

export function getSubjectPalette(subject) {
  return SUBJECT_PALETTES[subject] || SUBJECT_PALETTES['General Science'];
}

/**
 * Creates high-resolution canvas texture for 3D Study Slate
 */
function createSlateTexture(note, subject, palette) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');

  // 1. Dark holographic gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 700);
  bgGrad.addColorStop(0, '#0a0f1d');
  bgGrad.addColorStop(0.4, palette.dark);
  bgGrad.addColorStop(1, '#05070f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 700);

  // 2. Holographic circuit grid pattern in background
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridSize = 32;
  for (let x = 0; x <= 512; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 700);
    ctx.stroke();
  }
  for (let y = 0; y <= 700; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // 3. Cyber outer border with glow effect
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 472, 660);

  // Inner subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(28, 28, 456, 644);

  // 4. Futuristic Corner Brackets
  const cornerLen = 30;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 4;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(14, 14 + cornerLen);
  ctx.lineTo(14, 14);
  ctx.lineTo(14 + cornerLen, 14);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(498 - cornerLen, 14);
  ctx.lineTo(498, 14);
  ctx.lineTo(498, 14 + cornerLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(14, 686 - cornerLen);
  ctx.lineTo(14, 686);
  ctx.lineTo(14 + cornerLen, 686);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(498 - cornerLen, 686);
  ctx.lineTo(498, 686);
  ctx.lineTo(498, 686 - cornerLen);
  ctx.stroke();

  // 5. Header Badge (Subject)
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.roundRect(40, 46, 260, 36, 6);
  ctx.fill();

  ctx.fillStyle = '#05070e';
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillText(`◆ ${subject.toUpperCase()}`, 52, 71);

  // Status Indicator Dot (Online / Synced)
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(456, 64, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.beginPath();
  ctx.arc(456, 64, 14, 0, Math.PI * 2);
  ctx.fill();

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 105);
  ctx.lineTo(472, 105);
  ctx.stroke();

  // 6. Note Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Outfit", sans-serif';

  // Format filename cleanly
  let displayTitle = note.filename.replace(/\.md$/i, '').replace(/[_-]/g, ' ');
  displayTitle = displayTitle.charAt(0).toUpperCase() + displayTitle.slice(1);

  const words = displayTitle.split(' ');
  let line = '';
  let y = 160;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 410 && n > 0) {
      ctx.fillText(line, 42, y);
      line = words[n] + ' ';
      y += 42;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 42, y);

  // 7. Preview Snippet Text
  y += 35;
  ctx.fillStyle = palette.accent;
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText('STUDY SUMMARY & ABSTRACT:', 42, y);

  y += 28;
  ctx.fillStyle = 'rgba(248, 250, 252, 0.82)';
  ctx.font = '16px "Outfit", sans-serif';

  let previewText = note.preview || 'Autonomous study revision notes compiled from live verified sources.';
  // Clean markdown symbols
  previewText = previewText.replace(/[#*`_]/g, ' ').replace(/\s+/g, ' ').trim();

  const previewWords = previewText.split(' ');
  let pLine = '';
  let linesRendered = 0;
  for (let n = 0; n < previewWords.length && linesRendered < 6; n++) {
    const testLine = pLine + previewWords[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 420 && n > 0) {
      ctx.fillText(pLine, 42, y);
      pLine = previewWords[n] + ' ';
      y += 26;
      linesRendered++;
    } else {
      pLine = testLine;
    }
  }
  if (linesRendered < 6 && pLine) {
    ctx.fillText(pLine, 42, y);
  }

  // 8. Footer Tech Specs
  const sizeText = note.size ? `${(note.size / 1024).toFixed(1)} KB` : '1.2 KB';
  const linesText = note.preview ? `${note.preview.split('\n').length + 4} items` : 'Notes File';

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(40, 600);
  ctx.lineTo(472, 600);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillText(`SIZE: ${sizeText}   •   REVISION: ACTIVE`, 42, 630);
  ctx.fillText(`FILE: study_notes/${note.filename}`, 42, 654);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

/**
 * Creates an interactive 3D Study Slate mesh group
 */
export function createStudySlateMesh(note, index = 0, total = 1) {
  const group = new THREE.Group();
  group.name = `slate_${note.filename}`;

  const subject = getSubjectCategory(note.filename, note.preview);
  const palette = getSubjectPalette(subject);

  // Dimensions of holographic slate (thin rectangular tablet)
  const width = 2.4;
  const height = 3.3;
  const depth = 0.12;

  // Front cover texture
  const frontTexture = createSlateTexture(note, subject, palette);

  // Materials for BoxGeometry [Right, Left, Top, Bottom, Front, Back]
  const edgeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.dark),
    roughness: 0.3,
    metalness: 0.8,
  });

  const frontMat = new THREE.MeshStandardMaterial({
    map: frontTexture,
    roughness: 0.35,
    metalness: 0.25,
    emissive: new THREE.Color(palette.glow),
    emissiveIntensity: 0.08,
  });

  const backMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x0a0f1d),
    roughness: 0.2,
    metalness: 0.85,
  });

  const materials = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const slateMesh = new THREE.Mesh(geometry, materials);
  slateMesh.castShadow = true;
  slateMesh.receiveShadow = true;
  group.add(slateMesh);

  // Glowing Outer Wireframe Accent / Halo
  const wireGeom = new THREE.BoxGeometry(width + 0.05, height + 0.05, depth + 0.04);
  const wireMat = new THREE.MeshBasicMaterial({
    color: palette.glow,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  const wireMesh = new THREE.Mesh(wireGeom, wireMat);
  wireMesh.name = 'slate_wireframe';
  group.add(wireMesh);

  // Store metadata on group
  group.userData = {
    note,
    subject,
    palette,
    baseY: 0,
    floatSpeed: 1.2 + Math.random() * 0.6,
    floatOffset: (index * Math.PI) / 3,
    rotSpeedY: 0.2 + (Math.random() - 0.5) * 0.1,
    mesh: slateMesh,
    wireMesh: wireMesh,
    isHovered: false,
    isSelected: false,
  };

  return group;
}

/**
 * Creates 3D Floating Scientific Concept Polyhedron
 */
export function createKnowledgePolyhedron(type, color, prompt, label) {
  const group = new THREE.Group();
  group.name = `polyhedron_${type}`;

  let geometry;
  if (type === 'octahedron') {
    geometry = new THREE.OctahedronGeometry(0.7, 0);
  } else if (type === 'dodecahedron') {
    geometry = new THREE.DodecahedronGeometry(0.65, 0);
  } else if (type === 'icosahedron') {
    geometry = new THREE.IcosahedronGeometry(0.65, 0);
  } else {
    geometry = new THREE.TorusGeometry(0.55, 0.18, 16, 32);
  }

  // Translucent inner glass core
  const innerMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.8,
    transparent: true,
    opacity: 0.75,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.3,
  });
  const innerMesh = new THREE.Mesh(geometry, innerMat);
  group.add(innerMesh);

  // Outer wireframe cage
  const wireMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    wireframe: true,
    transparent: true,
    opacity: 0.7,
  });
  const wireMesh = new THREE.Mesh(geometry, wireMat);
  wireMesh.scale.set(1.15, 1.15, 1.15);
  group.add(wireMesh);

  group.userData = {
    type,
    color,
    prompt,
    label,
    isPolyhedron: true,
    baseY: 0,
    rotSpeedX: 0.5 + Math.random() * 0.3,
    rotSpeedY: 0.7 + Math.random() * 0.3,
    floatSpeed: 1.5,
    floatOffset: Math.random() * Math.PI,
  };

  return group;
}
