import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createBookMesh } from './Book3D';

export default function Library3DScene({
  books = [],
  selectedBook = null,
  onSelectBook = () => {},
  hoverFilter = null,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const bookMeshesRef = useRef(new Map()); // book.title -> 3D Group
  const animFrameRef = useRef(null);
  const particlesRef = useRef(null);

  const [hoveredBook, setHoveredBook] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [viewPreset, setViewPreset] = useState('shelf');

  // Mouse & Orbit State
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0.15, y: 0 });
  const currentRotationRef = useRef({ x: 0.15, y: 0 });
  const targetCamDistRef = useRef(14);
  const currentCamDistRef = useRef(14);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x080c14);
    scene.fog = new THREE.FogExp2(0x080c14, 0.035);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3, 14);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xe0e7ff, 1.8);
    dirLight.position.set(5, 12, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const cyanSpot = new THREE.PointLight(0x06b6d4, 2, 20);
    cyanSpot.position.set(-6, 5, 4);
    scene.add(cyanSpot);

    const purpleSpot = new THREE.PointLight(0x8b5cf6, 2, 20);
    purpleSpot.position.set(6, 5, 4);
    scene.add(purpleSpot);

    // 5. Floor with grid reflection illusion
    const floorGeom = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070b14,
      roughness: 0.25,
      metalness: 0.6,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.8;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid helper on floor
    const grid = new THREE.GridHelper(40, 40, 0x312e81, 0x1e1b4b);
    grid.position.y = -2.78;
    scene.add(grid);

    // 6. Realistic Bookshelves Structure
    createBookshelves(scene);

    // 7. Ambient Floating Dust Particles
    const particleCount = 200;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 30;
      particlePositions[i + 1] = (Math.random() - 0.5) * 15;
      particlePositions[i + 2] = (Math.random() - 0.5) * 20;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x818cf8,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    particlesRef.current = particles;
    scene.add(particles);

    // 8. Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera orbit
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08;
      currentCamDistRef.current += (targetCamDistRef.current - currentCamDistRef.current) * 0.08;

      const dist = currentCamDistRef.current;
      const rotX = currentRotationRef.current.x;
      const rotY = currentRotationRef.current.y;

      camera.position.x = dist * Math.sin(rotY) * Math.cos(rotX);
      camera.position.y = dist * Math.sin(rotX) + 1.2;
      camera.position.z = dist * Math.cos(rotY) * Math.cos(rotX);
      camera.lookAt(0, 0.8, 0);

      // Pulse floating dust
      if (particlesRef.current) {
        particlesRef.current.rotation.y = elapsedTime * 0.02;
      }

      // Animate Books (hover elevation, pulsing beacon, status rings)
      bookMeshesRef.current.forEach((mesh) => {
        const u = mesh.userData;
        if (!u) return;

        // Hover animation
        const targetZ = u.hovered || u.selected ? u.baseZ + 0.5 : u.baseZ;
        const targetRotY = u.hovered || u.selected ? -0.25 : 0;
        mesh.position.z += (targetZ - mesh.position.z) * 0.15;
        mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.15;

        // Status ring gentle rotation
        if (u.ring) {
          u.ring.rotation.z += 0.015;
          const scale = 1 + Math.sin(elapsedTime * 3) * 0.06;
          u.ring.scale.set(scale, scale, 1);
        }

        // Beacon pulsing
        if (u.beacon) {
          u.beacon.scale.setScalar(1 + Math.sin(elapsedTime * 4) * 0.2);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  // Helper to create 3D Shelves
  const createBookshelves = (scene) => {
    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.4,
    });
    const dividerMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
      metalness: 0.2,
    });

    // Back Panel
    const backGeom = new THREE.BoxGeometry(13, 6.5, 0.2);
    const backMesh = new THREE.Mesh(backGeom, dividerMat);
    backMesh.position.set(0, 0.7, -0.6);
    scene.add(backMesh);

    // Shelf Planks (Bottom, Middle, Top)
    const shelfWidth = 12.8;
    const shelfDepth = 1.4;
    const shelfThickness = 0.15;

    const plankYLevels = [-1.4, 1.4, 4.2];
    plankYLevels.forEach((y) => {
      const plankGeom = new THREE.BoxGeometry(shelfWidth, shelfThickness, shelfDepth);
      const plank = new THREE.Mesh(plankGeom, shelfMat);
      plank.position.set(0, y, 0);
      plank.receiveShadow = true;
      scene.add(plank);

      // Shelf underglow light strip
      const stripGeom = new THREE.BoxGeometry(shelfWidth * 0.95, 0.04, 0.04);
      const stripMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 });
      const strip = new THREE.Mesh(stripGeom, stripMat);
      strip.position.set(0, y - 0.08, shelfDepth / 2);
      scene.add(strip);
    });

    // Side Panels
    const sideGeom = new THREE.BoxGeometry(0.2, 5.8, shelfDepth);
    const leftSide = new THREE.Mesh(sideGeom, shelfMat);
    leftSide.position.set(-shelfWidth / 2, 1.4, 0);
    scene.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeom, shelfMat);
    rightSide.position.set(shelfWidth / 2, 1.4, 0);
    scene.add(rightSide);
  };

  // Populate/Update Books on Shelves
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !books || books.length === 0) return;

    // Remove old book meshes
    bookMeshesRef.current.forEach((mesh) => scene.remove(mesh));
    bookMeshesRef.current.clear();

    // 2 Rows of 5 Books:
    // Top Row (row 1): Y = 1.4 + 1.05 = 2.45
    // Bottom Row (row 0): Y = -1.4 + 1.05 = -0.35
    const colSpacing = 2.2;
    const startX = -((5 - 1) * colSpacing) / 2; // Centers the 5 books

    books.forEach((book, index) => {
      const row = index < 5 ? 1 : 0;
      const col = index % 5;

      const posX = startX + col * colSpacing;
      const posY = row === 1 ? 2.45 : -0.35;
      const posZ = 0;

      const bookMesh = createBookMesh(book);
      bookMesh.position.set(posX, posY, posZ);
      bookMesh.userData.baseY = posY;
      bookMesh.userData.baseZ = posZ;

      scene.add(bookMesh);
      bookMeshesRef.current.set(book.title, bookMesh);
    });
  }, [books]);

  // Synchronize Selected and Hovered states with 3D Meshes
  useEffect(() => {
    bookMeshesRef.current.forEach((mesh, title) => {
      const isSelected = selectedBook && selectedBook.title === title;
      const isFiltered = hoverFilter && title.toLowerCase().includes(hoverFilter.toLowerCase());
      mesh.userData.selected = isSelected;

      // Highlight material glow
      if (mesh.userData.bookMesh) {
        mesh.userData.bookMesh.material.forEach((mat) => {
          if (mat.emissive) {
            if (isSelected) {
              mat.emissive.setHex(0x6366f1);
              mat.emissiveIntensity = 0.5;
            } else if (isFiltered) {
              mat.emissive.setHex(0x06b6d4);
              mat.emissiveIntensity = 0.4;
            } else {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          }
        });
      }
    });
  }, [selectedBook, hoverFilter]);

  // Mouse Raycasting & Drag Interaction
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    const container = mountRef.current;
    if (!container) return;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - prevMouseRef.current.x;
      const deltaY = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      targetRotationRef.current.y += deltaX * 0.005;
      targetRotationRef.current.x = Math.max(-0.2, Math.min(0.6, targetRotationRef.current.x + deltaY * 0.005));
      return;
    }

    // Raycast hover detection
    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    const interactiveMeshes = [];
    bookMeshesRef.current.forEach((group) => {
      if (group.userData.bookMesh) interactiveMeshes.push(group.userData.bookMesh);
    });

    const intersects = raycaster.intersectObjects(interactiveMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const parentGroup = hitMesh.parent;
      if (parentGroup && parentGroup.userData.book) {
        bookMeshesRef.current.forEach((g) => (g.userData.hovered = false));
        parentGroup.userData.hovered = true;
        setHoveredBook(parentGroup.userData.book);
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        container.style.cursor = 'pointer';
        return;
      }
    }

    // Clear hover if missed
    bookMeshesRef.current.forEach((g) => (g.userData.hovered = false));
    setHoveredBook(null);
    container.style.cursor = 'default';
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e) => {
    const container = mountRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    const interactiveMeshes = [];
    bookMeshesRef.current.forEach((group) => {
      if (group.userData.bookMesh) interactiveMeshes.push(group.userData.bookMesh);
    });

    const intersects = raycaster.intersectObjects(interactiveMeshes);
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const parentGroup = hitMesh.parent;
      if (parentGroup && parentGroup.userData.book) {
        onSelectBook(parentGroup.userData.book);
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    targetCamDistRef.current = Math.max(7, Math.min(22, targetCamDistRef.current + e.deltaY * 0.01));
  };

  // View Presets
  const setPreset = (preset) => {
    setViewPreset(preset);
    if (preset === 'shelf') {
      targetRotationRef.current = { x: 0.12, y: 0 };
      targetCamDistRef.current = 14;
    } else if (preset === 'angle') {
      targetRotationRef.current = { x: 0.28, y: 0.5 };
      targetCamDistRef.current = 11;
    } else if (preset === 'top') {
      targetRotationRef.current = { x: 0.55, y: -0.1 };
      targetCamDistRef.current = 16;
    }
  };

  return (
    <div className="scene-viewport">
      <div
        ref={mountRef}
        className="scene-canvas-container"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Floating 3D HUD Tooltip */}
      {hoveredBook && (
        <div
          className="hover-book-tooltip"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="tooltip-title">{hoveredBook.title}</div>
          <div className="tooltip-meta">
            <span>{hoveredBook.author}</span>
            <span>•</span>
            <span style={{ color: hoveredBook.available ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600 }}>
              {hoveredBook.available ? 'Available' : 'Borrowed'}
            </span>
          </div>
        </div>
      )}

      {/* View Presets & Hints */}
      <div className="scene-overlay-controls">
        <div className="view-preset-bar">
          <button
            className={`view-btn ${viewPreset === 'shelf' ? 'active' : ''}`}
            onClick={() => setPreset('shelf')}
          >
            Shelf View
          </button>
          <button
            className={`view-btn ${viewPreset === 'angle' ? 'active' : ''}`}
            onClick={() => setPreset('angle')}
          >
            Studio Angle
          </button>
          <button
            className={`view-btn ${viewPreset === 'top' ? 'active' : ''}`}
            onClick={() => setPreset('top')}
          >
            Tactical Top
          </button>
        </div>

        <div className="scene-hint font-mono">
          <span>🖱️ Drag to rotate • Scroll to zoom • Click book to inspect</span>
        </div>
      </div>
    </div>
  );
}
