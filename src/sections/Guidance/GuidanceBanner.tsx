import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { useAppContext } from '../../context/AppContext';
import styles from './GuidanceBanner.module.css';

export default function GuidanceBanner() {
  const { setPage, t } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Detect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Load media assets
    let video: HTMLVideoElement | null = null;
    let texture: THREE.Texture;

    if (!reducedMotion) {
      video = document.createElement('video');
      video.src = '/sea-storm.mp4';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      // Load fallback image first, swap when video is ready
      texture = new THREE.TextureLoader().load('/sea-storm.jpg');
      
      video.addEventListener('canplaythrough', () => {
        if (video) {
          video.play().catch(e => console.warn('Autoplay prevented:', e));
          const videoTex = new THREE.VideoTexture(video);
          videoTex.minFilter = THREE.LinearFilter;
          videoTex.magFilter = THREE.LinearFilter;
          shaderMaterial.uniforms.uTexture.value = videoTex;
        }
      });
      videoRef.current = video;
    } else {
      texture = new THREE.TextureLoader().load('/sea-storm.jpg');
    }

    // Sacred geometry texture canvas (procedural wire yantra overlay)
    const drawYantraCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.strokeStyle = 'rgba(199, 161, 90, 0.09)'; // Barely visible gold lines
      ctx.lineWidth = 1;

      // Draw concentric yantra geometry
      ctx.translate(128, 128);
      ctx.beginPath();
      ctx.arc(0, 0, 110, 0, Math.PI * 2);
      ctx.stroke();

      // Interlocking triangles
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(0, -90);
        ctx.lineTo(78, 45);
        ctx.lineTo(-78, 45);
        ctx.closePath();
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.stroke();

      return new THREE.CanvasTexture(c);
    };

    const yantraTexture = drawYantraCanvas();

    // Custom fragment shader transforming aquatic storm to celestial guidance light
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D uTexture;
      uniform sampler2D uYantra;
      uniform float uTime;
      uniform float uReducedMotion;
      uniform vec2 uMouse;
      varying vec2 vUv;

      // Simple 2D Pseudo-noise function
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                   mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
      }

      void main() {
        vec2 uv = vUv;

        // Apply extremely slow, celestial coordinate warp representing cosmic dust drift
        if (uReducedMotion == 0.0) {
          float warpVal = noise(uv * 3.5 + uTime * 0.05);
          uv.x += sin(uv.y * 5.0 + uTime * 0.02) * 0.015 * warpVal;
          uv.y += cos(uv.x * 5.0 + uTime * 0.01) * 0.015 * warpVal;
        }

        // Add subtle parallax offset from user cursor
        uv += uMouse * 0.006;

        vec4 texColor = texture2D(uTexture, uv);

        // Get relative luminance/brightness of the storm wave textures
        float luma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

        // Remap to celestial indigo, plum, maroon and golden tones
        vec3 darkIndigo = vec3(0.03, 0.04, 0.11); // #050714
        vec3 darkPlum = vec3(0.09, 0.06, 0.12);   // #17101F
        vec3 goldPrimary = vec3(0.78, 0.63, 0.35); // #C7A15A
        vec3 saffronSoft = vec3(0.60, 0.33, 0.16); // #9A5428

        // Slowly breathing intensity for the golden guidance light breaking through clouds
        float breathe = 1.0;
        if (uReducedMotion == 0.0) {
          breathe = 0.85 + 0.25 * sin(uTime * 0.22);
        }

        // Remapping formula:
        // Shadows are mapped to midnight indigo / plum
        // High-lights are mapped to glowing gold / saffron
        vec3 celestialBg = mix(darkIndigo, darkPlum, uv.y);
        vec3 goldenGlow = mix(saffronSoft, goldPrimary, breathe);

        // Blend the colors based on luma
        vec3 finalColor = mix(celestialBg, goldenGlow, smoothstep(0.35, 0.88, luma));

        // Blend in yantra line texture overlay
        vec4 yantraColor = texture2D(uYantra, vUv);
        finalColor += yantraColor.rgb * 0.5;

        // Soft vignette
        float dist = length(vUv - vec2(0.5));
        finalColor *= smoothstep(0.9, 0.45, dist);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const mouse2D = new THREE.Vector2(0, 0);

    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: texture },
        uYantra: { value: yantraTexture },
        uTime: { value: 0 },
        uReducedMotion: { value: reducedMotion ? 1.0 : 0.0 },
        uMouse: { value: mouse2D }
      },
      depthWrite: false,
      depthTest: false
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(mesh);

    // Sparse gold/saffron points for Nakshatra particles
    const particleCount = reducedMotion ? 15 : 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleSpeeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 2;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      particlePos[i * 3 + 2] = 0;
      particleSpeeds.push(0.0003 + Math.random() * 0.0006);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xd0b06a, // gold
      size: 0.02,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse listener inside container limits for parallax
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouse2D.set(x * 0.5, y * 0.5);
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let clock = new THREE.Clock();
    let animFrame: number;

    const animate = () => {
      animFrame = requestAnimationFrame(animate);
      
      const elapsed = clock.getElapsedTime();
      shaderMaterial.uniforms.uTime.value = elapsed;

      // Animate Nakshatra particles drifting upwards slowly
      if (!reducedMotion) {
        const posArr = particles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          posArr[i * 3 + 1] += particleSpeeds[i];
          // Reset if drifting out of bounds
          if (posArr[i * 3 + 1] > 1) {
            posArr[i * 3 + 1] = -1;
            posArr[i * 3] = (Math.random() - 0.5) * 2;
          }
        }
        particles.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      shaderMaterial.dispose();
      yantraTexture.dispose();
      texture.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
    };
  }, [reducedMotion]);

  return (
    <section className={styles.section}>
      <div className="section-container">
        <div className={styles.bannerGrid}>
          {/* Content Block */}
          <div className={styles.contentArea}>
            <span className={styles.eyebrow}>✦ JYOTISH GUIDANCE</span>
            <h2 className={styles.headline}>
              When the path feels unclear,<br />
              <span className={styles.italicText}>look to the stars.</span>
            </h2>
            <p className={styles.description}>
              Explore your Kundli, understand the movement of the Grahas, and discover the guidance written in your celestial map.
            </p>
            <div className={styles.actions}>
              <button 
                className="btn btn-gold btn-lg" 
                onClick={() => { setPage('free-kundli'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                Explore Your Kundli
              </button>
              <button 
                className="btn btn-outline-light btn-lg" 
                onClick={() => { setPage('astrologers'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                Consult an Acharya
              </button>
            </div>
          </div>

          {/* Visual Render Canvas */}
          <div className={styles.visualArea} ref={containerRef}>
            <canvas ref={canvasRef} className={styles.canvas} />
          </div>
        </div>
      </div>
    </section>
  );
}
