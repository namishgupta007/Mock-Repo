import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// Node styling based on AstralGraph NodeType enum
const TYPE_COLORS = {
  directory: '#00e5ff', // cyan
  file: '#38bdf8',      // starlight blue
  class: '#b388ff',     // violet
  function: '#ffd54f',  // amber gold
};

const CLUSTER_COLORS = {
  0: '#f43f5e', // src/ - Rose / Pink neon
  1: '#00e5ff', // services/ - Electric Cyan
  2: '#fb923c', // SolarFluxEngine/ - Sunset Amber
  3: '#10b981', // models/ - Emerald Green
  4: '#a855f7', // api/ - Violet Purple
  5: '#38bdf8', // utils/ - Sky Blue
};

// Create a crisp, large canvas-based text sprite for prominent node labels
function makeTextSprite(message, opts = {}) {
  const fontface = opts.fontface || 'Inter, system-ui, -apple-system, sans-serif';
  const fontsize = 52;
  const borderThickness = 4;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.width = 1024;
  canvas.height = 256;

  context.font = `bold ${fontsize}px ${fontface}`;
  
  const textWidth = context.measureText(message).width;
  const padX = 36;
  const padY = 20;
  const boxW = Math.min(canvas.width - 40, textWidth + padX * 2);
  const boxH = fontsize + padY * 2;
  const startX = (canvas.width - boxW) / 2;
  const startY = (canvas.height - boxH) / 2;

  // Background pill with dark glow
  context.shadowColor = opts.color || 'rgba(0, 229, 255, 0.8)';
  context.shadowBlur = 16;
  context.fillStyle = 'rgba(8, 12, 24, 0.9)';
  context.strokeStyle = opts.color || '#00e5ff';
  context.lineWidth = borderThickness;

  const r = 18;
  context.beginPath();
  context.moveTo(startX + r, startY);
  context.lineTo(startX + boxW - r, startY);
  context.quadraticCurveTo(startX + boxW, startY, startX + boxW, startY + r);
  context.lineTo(startX + boxW, startY + boxH - r);
  context.quadraticCurveTo(startX + boxW, startY + boxH, startX + boxW - r, startY + boxH);
  context.lineTo(startX + r, startY + boxH);
  context.quadraticCurveTo(startX, startY + boxH, startX, startY + boxH - r);
  context.lineTo(startX, startY + r);
  context.quadraticCurveTo(startX, startY, startX + r, startY);
  context.closePath();
  context.fill();
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(message, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(30, 7.5, 1);
  sprite.raycast = () => {};
  return sprite;
}

// Create billboard banner sprite for 3D folder region headers
function makeFolderLabelSprite(message, opts = {}) {
  const fontface = 'Inter, system-ui, -apple-system, sans-serif';
  const fontsize = 44;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.width = 1024;
  canvas.height = 256;

  context.font = `bold ${fontsize}px ${fontface}`;
  const textWidth = context.measureText(message).width;
  const padX = 32;
  const padY = 18;
  const boxW = Math.min(canvas.width - 40, textWidth + padX * 2);
  const boxH = fontsize + padY * 2;
  const startX = (canvas.width - boxW) / 2;
  const startY = (canvas.height - boxH) / 2;

  // Folder header banner pill
  context.fillStyle = 'rgba(8, 14, 28, 0.90)';
  context.strokeStyle = opts.color || '#38bdf8';
  context.lineWidth = 3.5;

  const r = 14;
  context.beginPath();
  context.moveTo(startX + r, startY);
  context.lineTo(startX + boxW - r, startY);
  context.quadraticCurveTo(startX + boxW, startY, startX + boxW, startY + r);
  context.lineTo(startX + boxW, startY + boxH - r);
  context.quadraticCurveTo(startX + boxW, startY + boxH, startX + boxW - r, startY + boxH);
  context.lineTo(startX + r, startY + boxH);
  context.quadraticCurveTo(startX, startY + boxH, startX, startY + boxH - r);
  context.lineTo(startX, startY + r);
  context.quadraticCurveTo(startX, startY, startX + r, startY);
  context.closePath();
  context.fill();
  context.stroke();

  // Text
  context.fillStyle = opts.color || '#38bdf8';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(message, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: 0.9,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(38, 9.5, 1);
  sprite.raycast = () => {};
  return sprite;
}

export default function GalaxyGraph3D({
  graphData,
  selectedNodeId,
  highlightedNodeIds = [],
  onSelectNode,
  className = ''
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);

  const nodeMeshesRef = useRef(new Map());
  const labelSpritesRef = useRef(new Map());
  const edgeObjectsRef = useRef(new Map());
  const folderRegionsRef = useRef(new Map());
  const pulsesRef = useRef([]);

  const flightTargetRef = useRef(null);
  const lookTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const reqIdRef = useRef(null);

  const selectedNodeIdRef = useRef(selectedNodeId);
  const hoverTargetRef = useRef(null);

  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdgeData, setHoveredEdgeData] = useState(null);

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  // Centralized visual state manager for 3D selection, relationship highlighting, and folder grouping
  const updateVisualHighlights = useCallback((hoverNodeId, hoverEdgeId, selNodeId) => {
    const activeHoverNode = hoverNodeId;
    const activeHoverEdge = hoverEdgeId;
    const activeSelected = selNodeId;

    const activeNodeId = activeHoverNode || activeSelected;

    // Fast lookup sets
    const incomingEdgeIds = new Set();
    const outgoingEdgeIds = new Set();
    const neighborNodeIds = new Set();
    let activeNodeFolder = null;

    if (activeHoverEdge) {
      const edgeObj = edgeObjectsRef.current.get(activeHoverEdge);
      if (edgeObj) {
        neighborNodeIds.add(edgeObj.source);
        neighborNodeIds.add(edgeObj.target);
      }
    } else if (activeNodeId) {
      edgeObjectsRef.current.forEach((edgeObj) => {
        if (edgeObj.target === activeNodeId) {
          incomingEdgeIds.add(edgeObj.id);
          neighborNodeIds.add(edgeObj.source);
        } else if (edgeObj.source === activeNodeId) {
          outgoingEdgeIds.add(edgeObj.id);
          neighborNodeIds.add(edgeObj.target);
        }
      });

      const nodeMesh = nodeMeshesRef.current.get(activeNodeId);
      if (nodeMesh?.userData?.nodeData) {
        const nd = nodeMesh.userData.nodeData;
        activeNodeFolder = nd.cluster || (nd.path ? nd.path.split('/')[0] : 'root');
      }
    }

    const isHighlightActive = Boolean(activeHoverEdge || activeNodeId);

    // 1. Update Nodes & Labels
    nodeMeshesRef.current.forEach((mesh, nodeId) => {
      const isSelected = nodeId === activeSelected;
      const isHovered = nodeId === activeHoverNode;
      const isNeighbor = neighborNodeIds.has(nodeId);
      const sprite = labelSpritesRef.current.get(nodeId);

      if (!isHighlightActive) {
        // Normal default state
        mesh.scale.set(1, 1, 1);
        mesh.material.opacity = 1.0;
        mesh.material.transparent = false;
        mesh.material.emissiveIntensity = 0.65;
        mesh.material.color.set(mesh.userData.defaultColor);
        mesh.material.emissive.set(mesh.userData.defaultColor);
        if (sprite) {
          sprite.material.opacity = 0.95;
        }
      } else if (isSelected || isHovered) {
        // Strongest visual emphasis (rose for selected, cyan for hovered preview)
        mesh.scale.set(1.35, 1.35, 1.35);
        mesh.material.transparent = false;
        mesh.material.opacity = 1.0;
        mesh.material.emissiveIntensity = 1.25;
        mesh.material.color.set(isSelected ? 0xf43f5e : 0x38bdf8);
        mesh.material.emissive.set(isSelected ? 0xf43f5e : 0x38bdf8);
        if (sprite) {
          sprite.material.opacity = 1.0;
        }
      } else if (isNeighbor) {
        // Connected neighbor node
        mesh.scale.set(1.18, 1.18, 1.18);
        mesh.material.transparent = false;
        mesh.material.opacity = 1.0;
        mesh.material.emissiveIntensity = 0.95;
        mesh.material.color.set(mesh.userData.defaultColor);
        mesh.material.emissive.set(mesh.userData.defaultColor);
        if (sprite) {
          sprite.material.opacity = 1.0;
        }
      } else {
        // Unrelated node: subtly dimmed, NOT removed
        mesh.scale.set(1, 1, 1);
        mesh.material.transparent = true;
        mesh.material.opacity = 0.16;
        mesh.material.emissiveIntensity = 0.15;
        mesh.material.color.set(mesh.userData.defaultColor);
        mesh.material.emissive.set(mesh.userData.defaultColor);
        if (sprite) {
          sprite.material.opacity = 0.16;
        }
      }
    });

    // 2. Update Edges & Pulses
    edgeObjectsRef.current.forEach((edgeObj, edgeId) => {
      const isHoveredEdge = edgeId === activeHoverEdge;
      const isIncoming = incomingEdgeIds.has(edgeId);
      const isOutgoing = outgoingEdgeIds.has(edgeId);

      if (!isHighlightActive) {
        // Normal default
        edgeObj.lineMesh.material.color.set(edgeObj.defaultColor);
        edgeObj.lineMesh.material.opacity = edgeObj.defaultOpacity;
        edgeObj.pulseMesh.material.opacity = 0.85;
      } else if (isHoveredEdge) {
        // Hovered edge: prominent glow & full opacity
        edgeObj.lineMesh.material.color.set(0x38bdf8);
        edgeObj.lineMesh.material.opacity = 1.0;
        edgeObj.pulseMesh.material.opacity = 1.0;
      } else if (isIncoming) {
        // Incoming edge: Glowing cyan directed toward active node
        edgeObj.lineMesh.material.color.set(0x38bdf8);
        edgeObj.lineMesh.material.opacity = 0.95;
        edgeObj.pulseMesh.material.opacity = 1.0;
      } else if (isOutgoing) {
        // Outgoing edge: Glowing amber/orange directed away from active node
        edgeObj.lineMesh.material.color.set(0xfb923c);
        edgeObj.lineMesh.material.opacity = 0.95;
        edgeObj.pulseMesh.material.opacity = 1.0;
      } else {
        // Unrelated edge: subtly dimmed
        edgeObj.lineMesh.material.color.set(edgeObj.defaultColor);
        edgeObj.lineMesh.material.opacity = 0.05;
        edgeObj.pulseMesh.material.opacity = 0.05;
      }
    });

    // 3. Update Folder Regions (Part 4)
    folderRegionsRef.current.forEach((folder) => {
      if (!isHighlightActive) {
        // Normal default
        folder.fillMesh.material.opacity = folder.baseFillOpacity;
        folder.outlineMesh.material.opacity = folder.baseOutlineOpacity;
        folder.labelSprite.material.opacity = folder.baseLabelOpacity;
      } else if (activeNodeFolder && folder.cPath === activeNodeFolder) {
        // Active node folder: emphasized boundary & clear fill
        folder.fillMesh.material.opacity = 0.10;
        folder.outlineMesh.material.opacity = 0.50;
        folder.labelSprite.material.opacity = 1.0;
      } else {
        // Unrelated folder: subtly dimmed
        folder.fillMesh.material.opacity = 0.015;
        folder.outlineMesh.material.opacity = 0.08;
        folder.labelSprite.material.opacity = 0.25;
      }
    });
  }, []);

  // Initialize Three.js scene once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020308, 0.002);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(0, 45, 140);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    if (typeof window !== 'undefined') {
      window.__astro3D = {
        scene,
        camera,
        nodeMeshesRef,
        edgeObjectsRef,
        folderRegionsRef,
      };
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x020308, 1);
    rendererRef.current = renderer;

    mount.appendChild(renderer.domElement);

    // ─── DEEP SPACE BACKGROUND ───────────────────────────
    const bgStarCount = 4500;
    const bgStarGeo = new THREE.BufferGeometry();
    const bgStarPos = new Float32Array(bgStarCount * 3);
    const bgStarColors = new Float32Array(bgStarCount * 3);
    for (let i = 0; i < bgStarCount; i++) {
      const i3 = i * 3;
      bgStarPos[i3] = (Math.random() - 0.5) * 1200;
      bgStarPos[i3 + 1] = (Math.random() - 0.5) * 1200;
      bgStarPos[i3 + 2] = (Math.random() - 0.5) * 1200;
      const warmth = 0.85 + Math.random() * 0.15;
      bgStarColors[i3] = warmth;
      bgStarColors[i3 + 1] = warmth - Math.random() * 0.06;
      bgStarColors[i3 + 2] = warmth + Math.random() * 0.08;
    }
    bgStarGeo.setAttribute('position', new THREE.BufferAttribute(bgStarPos, 3));
    bgStarGeo.setAttribute('color', new THREE.BufferAttribute(bgStarColors, 3));
    const bgStarMat = new THREE.PointsMaterial({
      size: 0.6,
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
      sizeAttenuation: true
    });
    const bgStarField = new THREE.Points(bgStarGeo, bgStarMat);
    scene.add(bgStarField);

    // Mid stars
    const midStarCount = 1800;
    const midStarGeo = new THREE.BufferGeometry();
    const midStarPos = new Float32Array(midStarCount * 3);
    const midStarColors = new Float32Array(midStarCount * 3);
    for (let i = 0; i < midStarCount; i++) {
      const i3 = i * 3;
      midStarPos[i3] = (Math.random() - 0.5) * 1000;
      midStarPos[i3 + 1] = (Math.random() - 0.5) * 1000;
      midStarPos[i3 + 2] = (Math.random() - 0.5) * 1000;
      const temp = Math.random();
      midStarColors[i3] = 0.8 + temp * 0.2;
      midStarColors[i3 + 1] = 0.82 + temp * 0.18;
      midStarColors[i3 + 2] = 0.9 + temp * 0.1;
    }
    midStarGeo.setAttribute('position', new THREE.BufferAttribute(midStarPos, 3));
    midStarGeo.setAttribute('color', new THREE.BufferAttribute(midStarColors, 3));
    const midStarMat = new THREE.PointsMaterial({
      size: 1.2,
      transparent: true,
      opacity: 0.65,
      vertexColors: true,
      sizeAttenuation: true
    });
    const midStarField = new THREE.Points(midStarGeo, midStarMat);
    scene.add(midStarField);

    // Bright stars
    const brightStarCount = 120;
    const brightStarGeo = new THREE.BufferGeometry();
    const brightStarPos = new Float32Array(brightStarCount * 3);
    const brightStarColors = new Float32Array(brightStarCount * 3);
    for (let i = 0; i < brightStarCount; i++) {
      const i3 = i * 3;
      brightStarPos[i3] = (Math.random() - 0.5) * 900;
      brightStarPos[i3 + 1] = (Math.random() - 0.5) * 900;
      brightStarPos[i3 + 2] = (Math.random() - 0.5) * 900;
      brightStarColors[i3] = 0.95 + Math.random() * 0.05;
      brightStarColors[i3 + 1] = 0.93 + Math.random() * 0.07;
      brightStarColors[i3 + 2] = 1.0;
    }
    brightStarGeo.setAttribute('position', new THREE.BufferAttribute(brightStarPos, 3));
    brightStarGeo.setAttribute('color', new THREE.BufferAttribute(brightStarColors, 3));
    const brightStarMat = new THREE.PointsMaterial({
      size: 2.8,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      sizeAttenuation: true
    });
    const brightStarField = new THREE.Points(brightStarGeo, brightStarMat);
    scene.add(brightStarField);

    // Nebula band
    const nebulaCount = 600;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(nebulaCount * 3);
    const nebulaColors = new Float32Array(nebulaCount * 3);
    for (let i = 0; i < nebulaCount; i++) {
      const i3 = i * 3;
      const t = (Math.random() - 0.5) * 2;
      const spread = 80 + Math.random() * 120;
      nebulaPos[i3] = t * 350 + (Math.random() - 0.5) * spread;
      nebulaPos[i3 + 1] = t * 280 + (Math.random() - 0.5) * spread;
      nebulaPos[i3 + 2] = -200 - Math.random() * 400;
      const brightness = 0.25 + Math.random() * 0.35;
      nebulaColors[i3] = brightness * 0.7;
      nebulaColors[i3 + 1] = brightness * 0.78;
      nebulaColors[i3 + 2] = brightness * 1.0;
    }
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPos, 3));
    nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
    const nebulaMat = new THREE.PointsMaterial({
      size: 28,
      transparent: true,
      opacity: 0.06,
      vertexColors: true,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const nebulaField = new THREE.Points(nebulaGeo, nebulaMat);
    scene.add(nebulaField);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00e5ff, 2.5, 350);
    pointLight.position.set(0, 60, 0);
    scene.add(pointLight);

    // Continuous rotation group
    const galaxyGroup = new THREE.Group();
    galaxyGroup.name = 'GALAXY_ROTATION_GROUP';
    scene.add(galaxyGroup);

    // Orbit controls / Mouse interaction
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    const focusCenter = new THREE.Vector3(0, 0, 0);
    lookTargetRef.current = focusCenter;
    let spherical = { radius: 140, theta: 0, phi: Math.PI / 3 };

    const updateCamera = () => {
      camera.position.x = focusCenter.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = focusCenter.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = focusCenter.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(focusCenter);
    };
    updateCamera();

    window.__astroSyncOrbit = (newCenter, newCamPos) => {
      focusCenter.copy(newCenter);
      const diff = new THREE.Vector3().subVectors(newCamPos, focusCenter);
      spherical.radius = diff.length();
      spherical.phi = Math.acos(Math.max(-1, Math.min(1, diff.y / (spherical.radius || 1))));
      spherical.theta = Math.atan2(diff.x, diff.z);
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e) => {
      flightTargetRef.current = null;
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        // 1. Raycast nodes first
        const meshes = Array.from(nodeMeshesRef.current.values());
        const intersects = raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
          const hoveredObj = intersects[0].object;
          const nodeData = hoveredObj.userData?.nodeData;
          const nId = hoveredObj.userData?.nodeId;
          hoverTargetRef.current = { nodeId: nId, edgeId: null };
          setHoveredNode(nodeData || null);
          setHoveredEdgeData(null);
          updateVisualHighlights(nId, null, selectedNodeIdRef.current);
          mount.style.cursor = 'pointer';
          return;
        }

        // 2. Raycast edges if no node hovered
        raycaster.params.Line = { threshold: 3.5 };
        const edgeLines = Array.from(edgeObjectsRef.current.values()).map((o) => o.lineMesh);
        const edgeIntersects = raycaster.intersectObjects(edgeLines);

        if (edgeIntersects.length > 0) {
          const hoveredLine = edgeIntersects[0].object;
          const edgeData = hoveredLine.userData?.edgeData;
          const eId = hoveredLine.userData?.edgeId;
          hoverTargetRef.current = { nodeId: null, edgeId: eId };
          setHoveredNode(null);
          setHoveredEdgeData(edgeData || null);
          updateVisualHighlights(null, eId, selectedNodeIdRef.current);
          mount.style.cursor = 'pointer';
          return;
        }

        // 3. Pointer in empty space: clear hovers and restore active selection
        if (hoverTargetRef.current?.nodeId || hoverTargetRef.current?.edgeId) {
          hoverTargetRef.current = null;
          setHoveredNode(null);
          setHoveredEdgeData(null);
          updateVisualHighlights(null, null, selectedNodeIdRef.current);
        }
        mount.style.cursor = 'grab';
        return;
      }

      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      spherical.theta -= dx * 0.006;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy * 0.006));
      prevMousePos = { x: e.clientX, y: e.clientY };
      updateCamera();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      flightTargetRef.current = null;
      spherical.radius = Math.max(20, Math.min(450, spherical.radius + e.deltaY * 0.12));
      updateCamera();
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);

    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(nodeMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        if (clickedMesh.userData && clickedMesh.userData.nodeId) {
          onSelectNode?.(clickedMesh.userData.nodeId);
        }
      } else {
        // Clicking empty space deselects
        onSelectNode?.(null);
      }
    };
    canvas.addEventListener('click', onClick);

    // Animation loop
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      bgStarField.rotation.y += 0.00008;
      midStarField.rotation.y += 0.00012;
      brightStarField.rotation.y += 0.00015;
      nebulaField.rotation.y += 0.00005;
      galaxyGroup.rotation.y += 0.0006;

      // Smooth camera interpolation
      if (flightTargetRef.current) {
        camera.position.lerp(flightTargetRef.current, 0.05);
        if (window.__astroSyncOrbit && lookTargetRef.current) {
          window.__astroSyncOrbit(lookTargetRef.current, camera.position);
        }
        if (camera.position.distanceTo(flightTargetRef.current) < 0.8) {
          flightTargetRef.current = null;
        }
      }

      if (lookTargetRef.current) {
        camera.lookAt(lookTargetRef.current);
      }

      // Advance pulse particles
      if (pulsesRef.current && pulsesRef.current.length > 0) {
        pulsesRef.current.forEach((pulse) => {
          pulse.progress += pulse.speed;
          if (pulse.progress > 1) {
            pulse.progress = 0;
          }
          pulse.mesh.position.lerpVectors(pulse.start, pulse.end, pulse.progress);
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqIdRef.current);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onSelectNode, updateVisualHighlights]);

  // Populate 3D graph elements ONLY when graphData changes (Preserves scene across selections)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !graphData || !graphData.nodes) return;

    const galaxyGroup = scene.getObjectByName('GALAXY_ROTATION_GROUP');
    if (!galaxyGroup) return;

    // Clear previous children
    while (galaxyGroup.children.length > 0) {
      const obj = galaxyGroup.children[0];
      galaxyGroup.remove(obj);
    }

    nodeMeshesRef.current.clear();
    labelSpritesRef.current.clear();
    edgeObjectsRef.current.clear();
    folderRegionsRef.current.clear();
    pulsesRef.current = [];

    const nodes = graphData.nodes;
    const nodeCoords = new Map();

    // Map clusters for palettes and names
    const clusterMap = new Map();
    if (Array.isArray(graphData.clusters)) {
      graphData.clusters.forEach((c) => clusterMap.set(c.path, c));
    }

    // Step 1: Bucket nodes by cluster_id
    const clusterBuckets = new Map();
    nodes.forEach((node) => {
      const cid = node.position_hint?.cluster_id ?? 0;
      if (!clusterBuckets.has(cid)) clusterBuckets.set(cid, []);
      clusterBuckets.get(cid).push(node);
    });

    const uniqueClusters = Array.from(clusterBuckets.keys()).sort((a, b) => a - b);
    const numClusters = Math.max(uniqueClusters.length, 1);

    // Step 2: Position cluster constellation centers
    const clusterCenters = new Map();
    uniqueClusters.forEach((cid, cIdx) => {
      const cAngle = (cIdx / numClusters) * Math.PI * 2;
      const cRadius = numClusters === 1 ? 0 : 74;
      const cElevation = (cIdx % 2 === 0 ? 1 : -1) * 12;
      clusterCenters.set(cid, new THREE.Vector3(
        Math.cos(cAngle) * cRadius,
        cElevation,
        Math.sin(cAngle) * cRadius
      ));
    });

    // Step 3: Position individual nodes in planetary orbits around their cluster center
    uniqueClusters.forEach((cid) => {
      const cCenter = clusterCenters.get(cid);
      const cNodes = clusterBuckets.get(cid) || [];
      const cTotal = Math.max(cNodes.length, 1);

      cNodes.forEach((node, j) => {
        const nAngle = (j / cTotal) * Math.PI * 2;
        const nRadius = cTotal === 1 ? 0 : (20 + (j % 2) * 8);
        const nHeight = (j % 2 === 0 ? 1 : -1) * (6 + (j % 3) * 4);

        const pos = new THREE.Vector3(
          cCenter.x + Math.cos(nAngle) * nRadius,
          cCenter.y + nHeight,
          cCenter.z + Math.sin(nAngle) * nRadius
        );
        nodeCoords.set(node.id, pos);
      });
    });

    // Step 4: Relaxation pass ensuring no two spheres collide
    const minDistance = 22;
    for (let pass = 0; pass < 12; pass++) {
      nodes.forEach((n1) => {
        const p1 = nodeCoords.get(n1.id);
        if (!p1) return;
        nodes.forEach((n2) => {
          if (n1.id === n2.id) return;
          const p2 = nodeCoords.get(n2.id);
          if (!p2) return;
          const dist = p1.distanceTo(p2);
          if (dist < minDistance && dist > 0.001) {
            const diff = new THREE.Vector3().subVectors(p1, p2).normalize();
            const push = (minDistance - dist) * 0.5;
            p1.addScaledVector(diff, push);
            p2.addScaledVector(diff, -push);
          }
        });
      });
    }

    // Step 5: Construct 3D Folder Grouping Regions (Part 3)
    const clusterPoints = new Map();
    nodes.forEach((node) => {
      const pos = nodeCoords.get(node.id);
      if (!pos) return;
      const cPath = node.cluster || (node.path ? node.path.split('/')[0] : 'root');
      if (!clusterPoints.has(cPath)) {
        clusterPoints.set(cPath, []);
      }
      clusterPoints.get(cPath).push({ pos, node });
    });

    clusterPoints.forEach((items, cPath) => {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      items.forEach(({ pos }) => {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
        minZ = Math.min(minZ, pos.z);
        maxZ = Math.max(maxZ, pos.z);
      });

      const clusterInfo = clusterMap.get(cPath);
      const folderColor = clusterInfo?.color || CLUSTER_COLORS[items[0]?.node?.position_hint?.cluster_id ?? 0] || '#38bdf8';
      const folderName = clusterInfo?.name || (cPath === 'root' ? 'root/' : `${cPath}/`);

      const pad = 24;
      const sizeX = Math.max(maxX - minX + pad * 2, 42);
      const sizeY = Math.max(maxY - minY + pad * 2, 30);
      const sizeZ = Math.max(maxZ - minZ + pad * 2, 42);

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      // Subtle translucent box fill
      const boxGeo = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
      const fillMat = new THREE.MeshBasicMaterial({
        color: folderColor,
        transparent: true,
        opacity: 0.04,
        depthWrite: false,
        side: THREE.BackSide,
      });
      const fillMesh = new THREE.Mesh(boxGeo, fillMat);
      fillMesh.position.set(centerX, centerY, centerZ);
      fillMesh.raycast = () => {};
      galaxyGroup.add(fillMesh);

      // Thin boundary wireframe shell
      const edgesGeo = new THREE.EdgesGeometry(boxGeo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: folderColor,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      const outlineMesh = new THREE.LineSegments(edgesGeo, edgeMat);
      outlineMesh.position.set(centerX, centerY, centerZ);
      outlineMesh.raycast = () => {};
      galaxyGroup.add(outlineMesh);

      // Crisp billboard label positioned above region
      const labelText = `${folderName} (${items.length} ${items.length === 1 ? 'file' : 'files'})`;
      const labelSprite = makeFolderLabelSprite(labelText, { color: folderColor });
      labelSprite.position.set(centerX, centerY + sizeY / 2 + 10, centerZ);
      galaxyGroup.add(labelSprite);

      folderRegionsRef.current.set(cPath, {
        cPath,
        folderName,
        color: folderColor,
        fillMesh,
        outlineMesh,
        labelSprite,
        baseFillOpacity: 0.04,
        baseOutlineOpacity: 0.22,
        baseLabelOpacity: 0.90,
      });
    });

    // Step 6: Render Code Nodes (Spheres + Crisp elevated labels)
    nodes.forEach((node, i) => {
      const pos = nodeCoords.get(node.id);
      const cluster = node.position_hint?.cluster_id ?? 0;
      const size = Math.max(2.0, Math.min(4.0, 2.2 + (node.metrics?.centrality || 0) * 2.5));
      const geom = new THREE.SphereGeometry(size, 24, 24);

      const baseColor =
        (node.type === 'class' || node.type === 'function' || node.type === 'directory')
          ? (TYPE_COLORS[node.type] || '#00e5ff')
          : (CLUSTER_COLORS[cluster] || '#38bdf8');
      const colorHex = node.color || baseColor;

      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        metalness: 0.7,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.userData = { nodeId: node.id, nodeData: node, defaultColor: colorHex };

      galaxyGroup.add(mesh);
      nodeMeshesRef.current.set(node.id, mesh);

      // Node label
      const sprite = makeTextSprite(node.label, { color: colorHex });
      const labelElev = size + 5.0 + (i % 2) * 4.0;
      sprite.position.set(pos.x, pos.y + labelElev, pos.z);
      galaxyGroup.add(sprite);
      labelSpritesRef.current.set(node.id, sprite);
    });

    // Step 7: Render Directed Edges & Flowing Data Pulses
    if (Array.isArray(graphData.edges)) {
      const pulseGeom = new THREE.SphereGeometry(0.75, 12, 12);

      graphData.edges.forEach((edge, eIdx) => {
        const p1 = nodeCoords.get(edge.source);
        const p2 = nodeCoords.get(edge.target);
        if (p1 && p2) {
          // Color based on relation schema
          let defaultColor = 0xf97316; // default orange for imports
          if (edge.relation === 'calls') defaultColor = 0x38bdf8;
          else if (edge.relation === 'defines') defaultColor = 0xa855f7;
          else if (edge.relation === 'contains') defaultColor = 0x10b981;

          const edgeGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const edgeMat = new THREE.LineBasicMaterial({
            color: defaultColor,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
          });
          const line = new THREE.Line(edgeGeo, edgeMat);
          line.userData = { edgeId: edge.id, edgeData: edge };
          galaxyGroup.add(line);

          // Flowing pulse particle
          const pulseMat = new THREE.MeshBasicMaterial({
            color: defaultColor,
            transparent: true,
            opacity: 0.90,
          });
          const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
          pulseMesh.position.copy(p1);
          pulseMesh.raycast = () => {};
          galaxyGroup.add(pulseMesh);

          pulsesRef.current.push({
            mesh: pulseMesh,
            start: p1,
            end: p2,
            progress: (eIdx * 0.22) % 1,
            speed: 0.005 + (eIdx % 3) * 0.002,
          });

          edgeObjectsRef.current.set(edge.id, {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            relation: edge.relation || 'imports',
            lineMesh: line,
            pulseMesh,
            defaultColor,
            defaultOpacity: 0.35,
          });
        }
      });
    }

    // Apply active selection / highlights
    updateVisualHighlights(null, null, selectedNodeIdRef.current);
  }, [graphData, updateVisualHighlights]);

  // Synchronize selection changes with visual highlights and smooth camera navigation
  useEffect(() => {
    updateVisualHighlights(hoverTargetRef.current?.nodeId, hoverTargetRef.current?.edgeId, selectedNodeId);

    if (selectedNodeId) {
      const mesh = nodeMeshesRef.current.get(selectedNodeId);
      if (mesh && cameraRef.current) {
        const targetWorldPos = new THREE.Vector3();
        mesh.getWorldPosition(targetWorldPos);

        const offsetDir = targetWorldPos.clone().normalize();
        if (offsetDir.lengthSq() < 0.001) offsetDir.set(0, 0, 1);

        const cameraDest = targetWorldPos.clone().add(offsetDir.multiplyScalar(68)).add(new THREE.Vector3(0, 22, 34));
        flightTargetRef.current = cameraDest;
        lookTargetRef.current = targetWorldPos.clone();
      }
    } else {
      // Clear flight target when deselected
      flightTargetRef.current = null;
      lookTargetRef.current = new THREE.Vector3(0, 0, 0);
    }
  }, [selectedNodeId, updateVisualHighlights]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={mountRef} className="w-full h-full" style={{ cursor: 'grab' }} />

      {/* Floating Node Tooltip HUD on Hover */}
      {hoveredNode && (
        <div
          className="absolute bottom-6 left-6 pointer-events-none p-3 rounded bg-slate-900/90 border border-cyan-400/40 text-xs font-mono text-white shadow-xl backdrop-blur-md flex flex-col gap-1 z-30"
          style={{ maxWidth: '320px' }}
        >
          <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-white/10 pb-1">
            <span>{hoveredNode.label}</span>
            <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/10">{hoveredNode.type}</span>
          </div>
          <div className="text-gray-400 text-[11px] truncate">{hoveredNode.path}</div>
          {hoveredNode.ai_summary && (
            <div className="text-gray-300 text-[11px] italic mt-1 line-clamp-2">
              {hoveredNode.ai_summary}
            </div>
          )}
        </div>
      )}

      {/* Floating Edge Tooltip HUD on Hover */}
      {hoveredEdgeData && (
        <div
          className="absolute bottom-6 left-6 pointer-events-none p-3 rounded bg-slate-900/90 border border-amber-400/40 text-xs font-mono text-white shadow-xl backdrop-blur-md flex flex-col gap-1 z-30"
          style={{ maxWidth: '340px' }}
        >
          <div className="flex items-center justify-between text-amber-300 font-bold border-b border-white/10 pb-1">
            <span className="uppercase text-[11px] tracking-wider">{hoveredEdgeData.relation || 'imports'}</span>
            <span className="text-[10px] text-gray-400">Dependency Edge</span>
          </div>
          <div className="text-gray-300 text-[11px] flex items-center gap-1.5 mt-1">
            <span className="text-amber-400 font-semibold">{hoveredEdgeData.source.replace('file::', '')}</span>
            <span className="text-gray-500">→</span>
            <span className="text-cyan-400 font-semibold">{hoveredEdgeData.target.replace('file::', '')}</span>
          </div>
        </div>
      )}

      {/* Legend / Overlay */}
      <div className="absolute top-4 right-4 pointer-events-none bg-black/60 border border-white/10 p-2.5 rounded text-xs font-mono space-y-1.5 backdrop-blur-sm z-20">
        <div className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Node & Region Types</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#00e5ff]" /> directory / services</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> file / utils</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" /> src / core</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#fb923c]" /> engine / outgoing</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> models / schemas</div>
      </div>
    </div>
  );
}
