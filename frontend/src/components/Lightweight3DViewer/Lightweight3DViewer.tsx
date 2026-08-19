import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Lightweight3DViewerProps {
  type: 'gemstone' | 'yantra' | 'report';
  color?: string;
  className?: string;
}

export default function Lightweight3DViewer({ type, color = '#C8A96B', className }: Lightweight3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-5, -5, 2);
    scene.add(dirLight2);

    // Convert hex color to THREE.Color
    const mainColor = new THREE.Color(color);

    // Object setup based on type
    let mainMesh: THREE.Object3D;
    const group = new THREE.Group();

    if (type === 'gemstone') {
      // Sparkling faceted icosahedron (gemstone look)
      const geo = new THREE.IcosahedronGeometry(1.2, 1); // low detail for clean facets
      const mat = new THREE.MeshPhongMaterial({
        color: mainColor,
        emissive: mainColor.clone().multiplyScalar(0.2),
        specular: 0xffffff,
        shininess: 90,
        flatShading: true,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      
      // Wireframe overlay for premium look
      const wireGeo = new THREE.IcosahedronGeometry(1.205, 1);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
      });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      
      mesh.add(wire);
      mainMesh = mesh;
      group.add(mainMesh);
    } else if (type === 'yantra') {
      // Golden star / sacred geometry construct
      const yantraGroup = new THREE.Group();
      
      // Outer ring
      const ringGeo = new THREE.RingGeometry(1.2, 1.3, 32);
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xc8a96b, // gold
        metalness: 0.8,
        roughness: 0.2,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, goldMat);
      yantraGroup.add(ring);

      // Inner wireframe icosahedron
      const icoGeo = new THREE.IcosahedronGeometry(0.8, 0);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xc8a96b,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
      });
      const ico = new THREE.Mesh(icoGeo, wireMat);
      yantraGroup.add(ico);

      // Core glowing sphere
      const sphereGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: 0xf5f1e8,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      yantraGroup.add(sphere);

      mainMesh = yantraGroup;
      group.add(mainMesh);
    } else {
      // Celestial sphere (reports)
      const celestialGroup = new THREE.Group();

      // Outer transparent sphere with grid
      const sphereGeo = new THREE.SphereGeometry(1.15, 16, 16);
      const gridMat = new THREE.MeshBasicMaterial({
        color: mainColor,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
      });
      const grid = new THREE.Mesh(sphereGeo, gridMat);
      celestialGroup.add(grid);

      // Axis ring (rotated)
      const ringGeo = new THREE.RingGeometry(1.35, 1.4, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xc8a96b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 3;
      celestialGroup.add(ring);

      // Central gold particle
      const coreGeo = new THREE.SphereGeometry(0.35, 12, 12);
      const coreMat = new THREE.MeshPhongMaterial({
        color: 0xc8a96b,
        emissive: 0x3d2d10,
        shininess: 30,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      celestialGroup.add(core);

      mainMesh = celestialGroup;
      group.add(mainMesh);
    }

    scene.add(group);

    // Mouse responsiveness
    let mouse = { x: 0, y: 0 };
    let targetMouse = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
      targetMouse.x = Math.min(Math.max(x, -1), 1);
      targetMouse.y = Math.min(Math.max(y, -1), 1);
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Resize
    const resize = () => {
      if (!container || !canvas) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Slow continuous spin
      group.rotation.y += 0.007;
      group.rotation.x += 0.003;

      // Mouse hover tilt response (lerp)
      mouse.x += (targetMouse.x - mouse.x) * 0.08;
      mouse.y += (targetMouse.y - mouse.y) * 0.08;

      group.rotation.z = mouse.x * 0.4;
      group.rotation.x = mouse.y * 0.4 + (group.rotation.x % (Math.PI * 2));

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      
      // Dispose geometries & materials recursively
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, [type, color]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
}
