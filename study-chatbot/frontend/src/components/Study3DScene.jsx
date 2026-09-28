import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  createStudySlateMesh,
  createKnowledgePolyhedron,
  getSubjectPalette,
  getSubjectCategory,
} from './StudySlate3D';
import {
  Compass,
  RotateCw,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  BookOpen,
  Atom,
  HelpCircle,
} from 'lucide-react';

export default function Study3DScene({
  notes = [],
  selectedNote = null,
  onSelectNote = () => {},
  onQuickPrompt = () => {},
  isThinking = false,
  filterQuery = '',
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const slatesGroupRef = useRef(null);
  const coreGroupRef = useRef(null);
  const polyhedraGroupRef = useRef(null);
  const animFrameRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mousePosRef = useRef(new THREE.Vector2());

  // Interactive Orbit Controls State
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0.2, y: 0.1 });
  const currentRotationRef = useRef({ x: 0.2, y: 0.1 });
  const targetCamDistRef = useRef(15);
  const currentCamDistRef = useRef(15);
  const targetCamLookAtRef = useRef(new THREE.Vector3(0, 1.2, 0));
  const currentCamLookAtRef = useRef(new THREE.Vector3(0, 1.2, 0));

  // UI States
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredObject, setHoveredObject] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [activePreset, setActivePreset] = useState('overview');

  // Camera presets
  const applyPreset = useCallback((preset) => {
    setActivePreset(preset);
    if (preset === 'overview') {
      targetRotationRef.current = { x: 0.22, y: 0.1 };
      targetCamDistRef.current = 15;
      targetCamLookAtRef.current.set(0, 1.2, 0);
    } else if (preset === 'slates') {
      targetRotationRef.current = { x: 0.15, y: -0.2 };
      targetCamDistRef.current = 10;
      targetCamLookAtRef.current.set(0, 0.8, 0);
    } else if (preset === 'core') {
      targetRotationRef.current = { x: 0.05, y: 0 };
      targetCamDistRef.current = 6;
      targetCamLookAtRef.current.set(0, 1.5, 0);
    }
  }, []);

  // 1. Initialize Scene, Lights, Floor, Particles, Core
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // SCENE
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.038);

    // CAMERA
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4, 15);
    cameraRef.current = camera;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xe0e7ff, 2.2);
    keyLight.position.set(6, 14, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const cyanPoint = new THREE.PointLight(0x06b6d4, 3, 24);
    cyanPoint.position.set(-8, 5, 4);
    scene.add(cyanPoint);

    const purplePoint = new THREE.PointLight(0xa855f7, 3, 24);
    purplePoint.position.set(8, 5, 4);
    scene.add(purplePoint);

    const coreLight = new THREE.PointLight(0x6366f1, 4, 15);
    coreLight.position.set(0, 1.8, 0);
    scene.add(coreLight);

    // GROUND PLATFORM & CYBER GRID
    const floorGeom = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x050811,
      roughness: 0.2,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.6;
    floor.receiveShadow = true;
    scene.add(floor);

    // Concentric Techno Floor Rings
    const ringGroup = new THREE.Group();
    const ringRadii = [2.5, 4.5, 7.5, 11];
    ringRadii.forEach((r, idx) => {
      const ringGeom = new THREE.RingGeometry(r - 0.04, r, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x06b6d4 : 0x6366f1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45 - idx * 0.08,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = -2.58;
      ringGroup.add(ringMesh);
    });
    scene.add(ringGroup);

    // Techno Grid Helper
    const grid = new THREE.GridHelper(30, 30, 0x4338ca, 0x1e1b4b);
    grid.position.y = -2.57;
    scene.add(grid);

    // FLOATING DATA PARTICLES (Stardust / Knowledge Motes)
    const particleCount = 260;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 26;
      particlePositions[i + 1] = Math.random() * 12 - 2;
      particlePositions[i + 2] = (Math.random() - 0.5) * 26;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.09,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // CENTRAL AI STUDY CORE (Neural Nexus)
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 1.6, 0);
    coreGroupRef.current = coreGroup;
    scene.add(coreGroup);

    // Glowing Inner Icosahedron Core
    const innerCoreGeom = new THREE.IcosahedronGeometry(0.85, 1);
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      emissive: 0x6366f1,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.4,
      wireframe: true,
    });
    const innerCore = new THREE.Mesh(innerCoreGeom, innerCoreMat);
    coreGroup.add(innerCore);

    // Glowing Solid Center Sphere
    const centerSphereGeom = new THREE.SphereGeometry(0.55, 32, 32);
    const centerSphereMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.9,
    });
    const centerSphere = new THREE.Mesh(centerSphereGeom, centerSphereMat);
    coreGroup.add(centerSphere);

    // Orbiting Gimbal Ring 1 (Horizontal / Yaw)
    const ring1Geom = new THREE.TorusGeometry(1.4, 0.035, 16, 64);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
    });
    const ring1 = new THREE.Mesh(ring1Geom, ring1Mat);
    coreGroup.add(ring1);

    // Orbiting Gimbal Ring 2 (Tilted / Roll)
    const ring2Geom = new THREE.TorusGeometry(1.65, 0.03, 16, 64);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0xa855f7,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
    });
    const ring2 = new THREE.Mesh(ring2Geom, ring2Mat);
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;
    coreGroup.add(ring2);

    // Orbiting Gimbal Ring 3 (Outer Pitch)
    const ring3Geom = new THREE.TorusGeometry(1.9, 0.025, 16, 64);
    const ring3Mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    });
    const ring3 = new THREE.Mesh(ring3Geom, ring3Mat);
    ring3.rotation.z = Math.PI / 2.5;
    coreGroup.add(ring3);

    // Groups for Dynamic Elements
    const slatesGroup = new THREE.Group();
    slatesGroupRef.current = slatesGroup;
    scene.add(slatesGroup);

    const polyhedraGroup = new THREE.Group();
    polyhedraGroupRef.current = polyhedraGroup;
    scene.add(polyhedraGroup);

    // Add Floating Knowledge Polyhedra
    const polyData = [
      {
        type: 'octahedron',
        color: '#06b6d4',
        label: 'Quantum Physics',
        prompt: 'Research Quantum Superposition on Wikipedia, explain it simply, and save a revision guide to quantum_superposition.md',
        pos: [-5.5, 2.8, -2],
      },
      {
        type: 'dodecahedron',
        color: '#10b981',
        label: 'Euler & Calculus',
        prompt: 'Calculate sqrt(144) * 5 + 2^4 and derive Euler\'s identity e^(i*pi) + 1 = 0 in study_notes',
        pos: [5.5, 3.1, -1.8],
      },
      {
        type: 'icosahedron',
        color: '#ec4899',
        label: 'Orbital Mechanics',
        prompt: 'Research Escape Velocity on Wikipedia, calculate sqrt(2 * 9.8 * 6371000) for Earth, and save notes to escape_velocity.md',
        pos: [-3.8, 3.8, -4],
      },
      {
        type: 'torus',
        color: '#f59e0b',
        label: 'Newtonian Dynamics',
        prompt: 'Research Isaac Newton on Wikipedia, calculate what year it was 300 years after his birth (1643), and save a 3-bullet revision note to newton_facts.md',
        pos: [4.2, 3.6, -3.8],
      },
    ];

    polyData.forEach((p) => {
      const poly = createKnowledgePolyhedron(p.type, p.color, p.prompt, p.label);
      poly.position.set(...p.pos);
      poly.userData.baseY = p.pos[1];
      polyhedraGroup.add(poly);
    });

    // ANIMATION LOOP
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation (lerp)
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08;
      currentCamDistRef.current += (targetCamDistRef.current - currentCamDistRef.current) * 0.08;
      currentCamLookAtRef.current.lerp(targetCamLookAtRef.current, 0.08);

      if (autoRotate && !isDraggingRef.current) {
        targetRotationRef.current.y += 0.002;
      }

      const rotX = currentRotationRef.current.x;
      const rotY = currentRotationRef.current.y;
      const dist = currentCamDistRef.current;

      camera.position.x = dist * Math.sin(rotY) * Math.cos(rotX);
      camera.position.y = dist * Math.sin(rotX) + currentCamLookAtRef.current.y;
      camera.position.z = dist * Math.cos(rotY) * Math.cos(rotX);
      camera.lookAt(currentCamLookAtRef.current);

      // Animate AI Core
      if (coreGroupRef.current) {
        const speedMultiplier = isThinking ? 3.0 : 1.0;
        innerCore.rotation.x += 0.008 * speedMultiplier;
        innerCore.rotation.y += 0.012 * speedMultiplier;

        ring1.rotation.z += 0.015 * speedMultiplier;
        ring2.rotation.x += 0.018 * speedMultiplier;
        ring3.rotation.y -= 0.012 * speedMultiplier;

        // Core pulsating breathing
        const pulse = 1 + Math.sin(elapsedTime * (isThinking ? 6 : 2)) * 0.08;
        centerSphere.scale.set(pulse, pulse, pulse);
        coreLight.intensity = (isThinking ? 6 : 3) + Math.sin(elapsedTime * 4) * 1.2;
      }

      // Animate Stardust Particles
      if (particles) {
        const positions = particles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += 0.008;
          if (positions[i] > 10) positions[i] = -2.5;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.rotation.y = elapsedTime * 0.02;
      }

      // Animate Floating Slates
      if (slatesGroupRef.current) {
        slatesGroupRef.current.children.forEach((slateGroup) => {
          const ud = slateGroup.userData;
          if (!ud) return;

          // Sinusoidal vertical hover
          const hoverY = ud.isHovered ? 0.35 : 0;
          slateGroup.position.y = ud.baseY + Math.sin(elapsedTime * ud.floatSpeed + ud.floatOffset) * 0.15 + hoverY;

          // Smooth scale-up on hover
          const targetScale = ud.isHovered ? 1.08 : 1.0;
          slateGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

          // Subtle gentle wobble
          slateGroup.rotation.z = Math.sin(elapsedTime * 0.8 + ud.floatOffset) * 0.03;
        });
      }

      // Animate Floating Polyhedra
      if (polyhedraGroupRef.current) {
        polyhedraGroupRef.current.children.forEach((poly) => {
          const ud = poly.userData;
          if (!ud) return;
          poly.rotation.x += 0.01 * ud.rotSpeedX;
          poly.rotation.y += 0.012 * ud.rotSpeedY;
          poly.position.y = ud.baseY + Math.sin(elapsedTime * ud.floatSpeed + ud.floatOffset) * 0.2;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // RESIZE LISTENER
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 800;
      const newH = container.clientHeight || 600;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [applyPreset, isThinking]);

  // 2. Synchronize 3D Slates when `notes` or `filterQuery` change
  useEffect(() => {
    if (!slatesGroupRef.current || !sceneRef.current) return;

    const group = slatesGroupRef.current;
    // Clear existing slates
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    // Filter notes if search query is active
    const filteredNotes = notes.filter((n) => {
      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return (
        n.filename.toLowerCase().includes(q) ||
        (n.preview && n.preview.toLowerCase().includes(q))
      );
    });

    const displayNotes =
      filteredNotes.length > 0
        ? filteredNotes
        : [
            {
              filename: 'isaac_newton.md',
              preview: '# Isaac Newton (1643-1727)\nClassical mechanics and calculus.',
              size: 1420,
            },
            {
              filename: 'quantum_physics.md',
              preview: '# Quantum Superposition\nState vectors and wave functions.',
              size: 2150,
            },
            {
              filename: 'orbital_escape.md',
              preview: '# Orbital Mechanics\nEscape velocity calculation v_e = sqrt(2GM/r).',
              size: 1840,
            },
          ];

    const count = displayNotes.length;
    // Arrange in an elegant curved floating arc in front of the AI core
    const radius = Math.max(5.5, 4.0 + count * 0.5);
    const startAngle = -Math.PI * 0.45;
    const endAngle = Math.PI * 0.45;
    const angleStep = count > 1 ? (endAngle - startAngle) / (count - 1) : 0;

    displayNotes.forEach((note, idx) => {
      const slateMeshGroup = createStudySlateMesh(note, idx, count);

      let angle = count === 1 ? 0 : startAngle + idx * angleStep;
      // Stagger depths slightly for 3D parallax
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * (radius * 0.75) + 0.5;
      const y = 0.9 + (idx % 2 === 0 ? 0.3 : -0.2);

      slateMeshGroup.position.set(x, y, z);
      slateMeshGroup.userData.baseY = y;

      // Rotate to face towards the central camera/origin
      slateMeshGroup.rotation.y = -angle * 0.85;

      group.add(slateMeshGroup);
    });
  }, [notes, filterQuery]);

  // 3. Mouse Interaction (Orbit, Hover, Click Raycasting)
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e) => {
    const container = mountRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mousePosRef.current.set(mouseX, mouseY);

    // Orbit Drag
    if (isDraggingRef.current) {
      const deltaX = e.clientX - prevMouseRef.current.x;
      const deltaY = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      targetRotationRef.current.y -= deltaX * 0.006;
      targetRotationRef.current.x += deltaY * 0.006;

      // Clamp pitch
      targetRotationRef.current.x = Math.max(
        -Math.PI / 10,
        Math.min(Math.PI / 2.2, targetRotationRef.current.x)
      );
      return;
    }

    // Raycast hover over Slates & Polyhedra
    if (!cameraRef.current || !sceneRef.current) return;
    raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);

    const interactables = [];
    if (slatesGroupRef.current) interactables.push(...slatesGroupRef.current.children);
    if (polyhedraGroupRef.current) interactables.push(...polyhedraGroupRef.current.children);

    const intersects = raycasterRef.current.intersectObjects(interactables, true);

    if (intersects.length > 0) {
      // Find top-level group
      let hit = intersects[0].object;
      while (hit.parent && !hit.userData.note && !hit.userData.isPolyhedron && hit.parent !== sceneRef.current) {
        hit = hit.parent;
      }

      if (hit.userData.note) {
        setHoveredObject({
          type: 'slate',
          note: hit.userData.note,
          subject: hit.userData.subject,
          palette: hit.userData.palette,
        });
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

        // Highlight slate
        if (slatesGroupRef.current) {
          slatesGroupRef.current.children.forEach((c) => {
            c.userData.isHovered = c === hit;
            if (c.userData.wireMesh) {
              c.userData.wireMesh.material.opacity = c === hit ? 0.9 : 0.35;
            }
          });
        }
        container.style.cursor = 'pointer';
        return;
      } else if (hit.userData.isPolyhedron) {
        setHoveredObject({
          type: 'polyhedron',
          label: hit.userData.label,
          prompt: hit.userData.prompt,
          color: hit.userData.color,
        });
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        container.style.cursor = 'pointer';
        return;
      }
    }

    // Reset hover if nothing hit
    if (hoveredObject) {
      setHoveredObject(null);
      if (slatesGroupRef.current) {
        slatesGroupRef.current.children.forEach((c) => {
          c.userData.isHovered = false;
          if (c.userData.wireMesh) {
            c.userData.wireMesh.material.opacity = 0.35;
          }
        });
      }
    }
    container.style.cursor = 'grab';
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    targetCamDistRef.current += e.deltaY * 0.012;
    // Clamp zoom
    targetCamDistRef.current = Math.max(5, Math.min(26, targetCamDistRef.current));
  };

  const handleClick = (e) => {
    if (!cameraRef.current || !sceneRef.current) return;
    const container = mountRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    const interactables = [];
    if (slatesGroupRef.current) interactables.push(...slatesGroupRef.current.children);
    if (polyhedraGroupRef.current) interactables.push(...polyhedraGroupRef.current.children);

    const intersects = raycasterRef.current.intersectObjects(interactables, true);
    if (intersects.length > 0) {
      let hit = intersects[0].object;
      while (hit.parent && !hit.userData.note && !hit.userData.isPolyhedron && hit.parent !== sceneRef.current) {
        hit = hit.parent;
      }

      if (hit.userData.note) {
        onSelectNote(hit.userData.note);
      } else if (hit.userData.isPolyhedron && hit.userData.prompt) {
        onQuickPrompt(hit.userData.prompt);
      }
    }
  };

  return (
    <div
      className="study-3d-viewport"
      ref={mountRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
    >
      {/* 3D Top-Left Status HUD */}
      <div className="study-hud-overlay top-left font-mono">
        <div className="hud-badge active">
          <span className="hud-pulse-dot" style={{ background: isThinking ? '#f59e0b' : '#06b6d4' }} />
          <span>{isThinking ? 'AI SYNTHESIZING...' : '3D KNOWLEDGE NEXUS'}</span>
        </div>
        <div className="hud-metric">
          <BookOpen size={12} style={{ color: 'var(--accent-primary)' }} />
          <span>{notes.length} Active Study Slates</span>
        </div>
      </div>

      {/* 3D Viewport Controls (Presets, Auto-Rotate, Zoom) */}
      <div className="study-hud-overlay top-right">
        <div className="preset-selector">
          <button
            className={`hud-btn ${activePreset === 'overview' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              applyPreset('overview');
            }}
            title="Overview Constellation"
          >
            <Compass size={13} />
            <span className="font-mono">Nexus</span>
          </button>
          <button
            className={`hud-btn ${activePreset === 'slates' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              applyPreset('slates');
            }}
            title="Study Slates Array"
          >
            <Layers size={13} />
            <span className="font-mono">Slates</span>
          </button>
          <button
            className={`hud-btn ${activePreset === 'core' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              applyPreset('core');
            }}
            title="AI Neural Core"
          >
            <Atom size={13} />
            <span className="font-mono">Core</span>
          </button>
          <button
            className={`hud-btn ${autoRotate ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setAutoRotate(!autoRotate);
            }}
            title="Toggle Auto-Orbit"
          >
            <RotateCw size={13} className={autoRotate ? 'spin-slow' : ''} />
          </button>
        </div>
      </div>

      {/* Interactive Tooltip HUD */}
      {hoveredObject && (
        <div
          className="study-3d-tooltip glass-panel-elevated"
          style={{
            left: `${tooltipPos.x + 16}px`,
            top: `${tooltipPos.y + 16}px`,
          }}
        >
          {hoveredObject.type === 'slate' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span
                  className="font-mono"
                  style={{
                    fontSize: '0.68rem',
                    color: hoveredObject.palette.accent,
                    fontWeight: 700,
                  }}
                >
                  ◆ {hoveredObject.subject.toUpperCase()}
                </span>
                <span className="status-tag font-mono available" style={{ fontSize: '0.6rem' }}>
                  Click to Read
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff', marginTop: '4px' }}>
                {hoveredObject.note.filename}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.3 }}>
                {hoveredObject.note.preview ? hoveredObject.note.preview.slice(0, 110) + '...' : 'Interactive markdown revision guide.'}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} style={{ color: hoveredObject.color }} />
                <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: hoveredObject.color }}>
                  {hoveredObject.label}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '4px' }}>
                Click to run autonomous study task in chat
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Hint Banner */}
      <div className="study-hud-overlay bottom-center font-mono">
        <span>Drag to orbit • Scroll to zoom • Click 3D Slates & Knowledge Crystals</span>
      </div>
    </div>
  );
}
