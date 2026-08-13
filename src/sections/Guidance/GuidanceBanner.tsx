import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
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
    if (!canvasRef.current || !containerRef.current) return;

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
      
      // Load fallback image first
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

    // Sacred geometry texture canvas (extremely subtle orbit circles and constellation lines)
    const drawYantraCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.strokeStyle = 'rgba(181, 138, 59, 0.05)'; // Muted gold (opacity 0.05)
      ctx.lineWidth = 0.75;

      ctx.translate(256, 256);
      
      // concentric orbits
      ctx.beginPath();
      ctx.arc(0, 0, 220, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 150, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 80, 0, Math.PI * 2);
      ctx.stroke();
      
      // 12 points with connecting constellation lines
      ctx.fillStyle = 'rgba(208, 176, 106, 0.12)';
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x = Math.cos(angle) * 150;
        const y = Math.sin(angle) * 150;
        
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        if (i % 3 === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          const nextAngle = ((i + 3) / 12) * Math.PI * 2;
          ctx.lineTo(Math.cos(nextAngle) * 150, Math.sin(nextAngle) * 150);
          ctx.stroke();
        }
      }

      return new THREE.CanvasTexture(c);
    };

    const yantraTexture = drawYantraCanvas();

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

        // CROP OUT the bottom 38% of the video to completely hide the boat, waves and ocean waves
        vec2 croppedUv = vec2(uv.x, 0.38 + uv.y * 0.62);

        // Apply extremely slow, celestial coordinate warp representing cosmic dust drift
        if (uReducedMotion == 0.0) {
          float warpVal = noise(croppedUv * 3.5 + uTime * 0.03);
          croppedUv.x += sin(croppedUv.y * 5.0 + uTime * 0.015) * 0.012 * warpVal;
          croppedUv.y += cos(croppedUv.x * 5.0 + uTime * 0.008) * 0.012 * warpVal;
        }

        // Add subtle parallax offset from user cursor
        croppedUv += uMouse * 0.005;

        vec4 texColor = texture2D(uTexture, croppedUv);

        // Get relative luminance/brightness of the storm texture
        float luma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

        // Remap to celestial indigo, plum, maroon and golden tones
        vec3 darkIndigo = vec3(0.02, 0.03, 0.08); // #050714
        vec3 midnightNavy = vec3(0.01, 0.02, 0.05);
        vec3 darkPlum = vec3(0.06, 0.03, 0.08);   // #100814
        vec3 antiqueGold = vec3(0.71, 0.54, 0.23); // #b58a3b
        vec3 saffronSoft = vec3(0.60, 0.33, 0.16); // #9a5428

        // Slowly breathing intensity for the golden guidance light breaking through clouds
        float breathe = 1.0;
        if (uReducedMotion == 0.0) {
          breathe = 0.85 + 0.20 * sin(uTime * 0.18);
        }

        vec3 celestialBg = mix(midnightNavy, darkPlum, uv.y);
        celestialBg = mix(celestialBg, darkIndigo, noise(uv * 2.0 + uTime * 0.02) * 0.4);

        // Concentrated vertical beam on the right side
        float beam = smoothstep(0.4, 0.0, abs(uv.x - 0.75 - sin(uTime * 0.03) * 0.03));
        beam *= smoothstep(0.0, 0.8, uv.y); 

        // Small glowing celestial focal point at the bottom right
        float focalPoint = 1.0 - length(uv - vec2(0.75, 0.18 + sin(uTime * 0.08) * 0.015));
        focalPoint = pow(max(focalPoint, 0.0), 36.0) * 0.7;

        vec3 goldenGlow = mix(saffronSoft, antiqueGold, breathe);

        // Blend the colors based on luma
        vec3 finalColor = mix(celestialBg, goldenGlow, smoothstep(0.28, 0.85, luma));
        finalColor += goldenGlow * (beam * 0.25 + focalPoint);

        // Blend in yantra line texture overlay
        vec4 yantraColor = texture2D(uYantra, vUv);
        finalColor += yantraColor.rgb * 0.8;

        // Soft vignette to fade boundaries
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
    const particleCount = reducedMotion ? 12 : 36;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleSpeeds: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 2;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      particlePos[i * 3 + 2] = 0;
      particleSpeeds.push(0.0002 + Math.random() * 0.0004);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xd0b06a, // gold
      size: 0.015,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse listener inside container limits for parallax
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouse2D.set(x * 0.4, y * 0.4);
    };
    containerRef.current.addEventListener('mousemove', handleMouseMove);

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
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
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
      <div className={styles.splitGrid}>
        
        {/* Left Side: Clean Editorial Content */}
        <div className={styles.leftSide}>
          {/* Faint Rashi Chakra behind the text */}
          <CelestialOrnament type="rashi" className={styles.leftOrnament} />
          
          <div className={styles.contentArea}>
            <span className={styles.eyebrow}>{t('guidance_eyebrow')}</span>
            <h2 className={styles.headline}>
              {t('guidance_headline')}<br />
              <span className={styles.goldText}>{t('guidance_headline_italic')}</span>
            </h2>
            <p className={styles.description}>
              {t('guidance_desc')}
            </p>
            <div className={styles.actions}>
              <button 
                className={styles.btnGoldBanner}
                onClick={() => { setPage('free-kundli'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                {t('guidance_cta_kundli')}
              </button>
              <button 
                className={styles.btnWhiteBanner}
                onClick={() => { setPage('astrologers'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                {t('guidance_cta_consult')}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Large Cinematic Visual */}
        <div className={styles.rightSide} ref={containerRef}>
          <div className={styles.canvasContainer}>
            <canvas ref={canvasRef} className={styles.canvasBackdrop} />
          </div>
        </div>

      </div>
    </section>
  );
}
