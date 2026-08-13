import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HeroCanvasProps {
  className?: string;
  scrollProgress: number;
  isLightTheme?: boolean;
  onHoverItem?: (item: { name: string; type: 'graha' | 'rashi'; details: string } | null) => void;
}

export default function HeroCanvas({ className, scrollProgress, onHoverItem, isLightTheme = false }: HeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollProgressRef = useRef(0);
  const hoverCallbackRef = useRef(onHoverItem);

  // Sync refs to access inside useEffect animation loop
  useEffect(() => {
    scrollProgressRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    hoverCallbackRef.current = onHoverItem;
  }, [onHoverItem]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect device screen sizes
    const width = window.innerWidth;
    let widthSeg = 180;
    let heightSeg = 500;
    let moteCount = 180;
    let showRashiTexts = true;

    if (width < 768) {
      widthSeg = 50;
      heightSeg = 120;
      moteCount = 50;
      showRashiTexts = false; // simplify on mobile for performance
    } else if (width < 1024) {
      widthSeg = 100;
      heightSeg = 240;
      moteCount = 100;
    }

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background to let CSS gradients show through

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(50, canvas.offsetWidth / canvas.offsetHeight, 0.1, 150);
    camera.position.set(0, 0, 16);

    // Light Setup (temple diya glow theme)
    const ambientLight = new THREE.AmbientLight(0x201528, 1.2);
    scene.add(ambientLight);

    const goldLight1 = new THREE.PointLight(0xb88a3b, 2.5, 45); // Warm antique gold diya light
    goldLight1.position.set(-6, 4, 8);
    scene.add(goldLight1);

    const goldLight2 = new THREE.PointLight(0xc56a27, 2.0, 30); // Sandalwood/Saffron warm light
    goldLight2.position.set(6, -4, 6);
    scene.add(goldLight2);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(0, 0, -10);
    scene.add(rimLight);

    // ----------------------------------------------------
    // Helper function to create typeset text label textures
    // ----------------------------------------------------
    const createTextLabel = (rashiName: string, englishName: string) => {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return null;
      ctx.canvas.width = 128;
      ctx.canvas.height = 64;

      // Subtle warm backdrop glow
      ctx.clearRect(0, 0, 128, 64);
      
      // In light (saffron) mode, use bright white/cream for visibility
      // In dark mode, use antique gold + warm ivory
      const primaryColor = isLightTheme ? '#FFFFFF' : '#C7A15A';
      const secondaryColor = isLightTheme ? 'rgba(255, 240, 220, 0.92)' : '#F1E9DC';

      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(rashiName, 64, 26);

      ctx.fillStyle = secondaryColor;
      ctx.font = 'normal 13px Georgia, serif';
      ctx.fillText(englishName, 64, 46);

      const texture = new THREE.CanvasTexture(ctx.canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1.4, 0.7, 1);
      return sprite;
    };

    // ----------------------------------------------------
    // Build Majestic 3D Rashi Chakra (Celestial Mandala)
    // ----------------------------------------------------
    const rashiChakraGroup = new THREE.Group();
    scene.add(rashiChakraGroup);

    // Procedural soft sacred glow behind the Rashi Chakra
    const createChakraGlowTexture = () => {
      const size = 512;
      const canvasGlow = document.createElement('canvas');
      canvasGlow.width = size;
      canvasGlow.height = size;
      const ctx = canvasGlow.getContext('2d');
      if (!ctx) return null;
      
      const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      // Muted antique gold, deep indigo, very subtle warm white
      grad.addColorStop(0, 'rgba(241, 233, 220, 0.22)');
      grad.addColorStop(0.25, 'rgba(199, 161, 90, 0.16)');
      grad.addColorStop(0.6, 'rgba(17, 23, 55, 0.12)');
      grad.addColorStop(1, 'rgba(17, 23, 55, 0)');
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      
      return new THREE.CanvasTexture(canvasGlow);
    };

    const glowTex = createChakraGlowTexture();
    if (glowTex) {
      const glowGeo = new THREE.PlaneGeometry(16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.set(0, 0, -0.2); // Position slightly behind chakra lines
      rashiChakraGroup.add(glowMesh);
    }

    // Concentric brass rings defining chakra houses
    const createRingLine = (radius: number, color: number, opacity: number) => {
      const ringPoints: THREE.Vector3[] = [];
      const steps = 128;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const ringMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      return new THREE.Line(ringGeo, ringMat);
    };

    // Rings representing divisions
    const ringColor = isLightTheme ? 0xffffff : 0xc7a15a;
    const ringOpacity = isLightTheme ? 0.65 : 0.28;
    rashiChakraGroup.add(createRingLine(5.5, ringColor, ringOpacity)); // Outer boundary ring
    rashiChakraGroup.add(createRingLine(4.0, ringColor, ringOpacity * 0.9)); // Mid boundary ring
    rashiChakraGroup.add(createRingLine(2.2, ringColor, ringOpacity * 0.8)); // Inner boundary ring
    rashiChakraGroup.add(createRingLine(0.8, ringColor, ringOpacity * 0.7)); // Innermost ring

    // 12 House Spokes / Radial Division Lines
    const spokesGeo = new THREE.BufferGeometry();
    const spokesPos: number[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      spokesPos.push(0, 0, 0); // start center
      spokesPos.push(Math.cos(angle) * 5.5, Math.sin(angle) * 5.5, 0); // extend outer
    }
    spokesGeo.setAttribute('position', new THREE.Float32BufferAttribute(spokesPos, 3));
    const spokesMat = new THREE.LineSegments(spokesGeo, new THREE.LineBasicMaterial({
      color: isLightTheme ? 0xffffff : 0xc7a15a,
      transparent: true,
      opacity: isLightTheme ? 0.6 : 0.28,
    }));
    rashiChakraGroup.add(spokesMat);

    // 12 Rashi Sector hit-areas for raycaster hover mapping
    const RASHIS_DATA = [
      { name: 'Mesha', eng: 'Aries', Graha: 'Mangala (Mars)', nakshatras: 'Ashwini, Bharani, Krittika' },
      { name: 'Vrishabha', eng: 'Taurus', Graha: 'Shukra (Venus)', nakshatras: 'Krittika, Rohini, Mrigashira' },
      { name: 'Mithuna', eng: 'Gemini', Graha: 'Budha (Mercury)', nakshatras: 'Mrigashira, Ardra, Punarvasu' },
      { name: 'Karka', eng: 'Cancer', Graha: 'Chandra (Moon)', nakshatras: 'Punarvasu, Pushya, Ashlesha' },
      { name: 'Simha', eng: 'Leo', Graha: 'Surya (Sun)', nakshatras: 'Magha, Purva Phalguni, Uttara Phalguni' },
      { name: 'Kanya', eng: 'Virgo', Graha: 'Budha (Mercury)', nakshatras: 'Uttara Phalguni, Hasta, Chitra' },
      { name: 'Tula', eng: 'Libra', Graha: 'Shukra (Venus)', nakshatras: 'Chitra, Swati, Vishakha' },
      { name: 'Vrischika', eng: 'Scorpio', Graha: 'Mangala (Mars)', nakshatras: 'Vishakha, Anuradha, Jyeshtha' },
      { name: 'Dhanu', eng: 'Sagittarius', Graha: 'Guru (Jupiter)', nakshatras: 'Mula, Purva Ashadha, Uttara Ashadha' },
      { name: 'Makara', eng: 'Capricorn', Graha: 'Shani (Saturn)', nakshatras: 'Uttara Ashadha, Shravana, Dhanishta' },
      { name: 'Kumbha', eng: 'Aquarius', Graha: 'Shani (Saturn)', nakshatras: 'Dhanishta, Shatabhisha, Purva Bhadrapada' },
      { name: 'Meena', eng: 'Pisces', Graha: 'Guru (Jupiter)', nakshatras: 'Purva Bhadrapada, Uttara Bhadrapada, Revati' },
    ];

    const rashiInteractiveSectors: THREE.Mesh[] = [];

    RASHIS_DATA.forEach((rashi, i) => {
      const startAngle = (i / 12) * Math.PI * 2;
      const endAngle = ((i + 1) / 12) * Math.PI * 2;
      const midAngle = (startAngle + endAngle) / 2;

      // Geometry for the sector piece (Mesh for raycasting)
      const sectorGeo = new THREE.RingGeometry(2.2, 5.5, 16, 1, startAngle, Math.PI / 6);
      const sectorMat = new THREE.MeshBasicMaterial({
        color: 0xb88a3b,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const sectorMesh = new THREE.Mesh(sectorGeo, sectorMat);
      
      sectorMesh.userData = {
        type: 'rashi',
        name: rashi.name,
        english: rashi.eng,
        details: `Ruling Planet: ${rashi.Graha} · Nakshatras: ${rashi.nakshatras}`
      };

      rashiChakraGroup.add(sectorMesh);
      rashiInteractiveSectors.push(sectorMesh);

      // Render text labels on top of the Rashi sectors
      if (showRashiTexts) {
        const textSprite = createTextLabel(rashi.name, rashi.eng);
        if (textSprite) {
          const textRadius = 4.25;
          textSprite.position.set(
            Math.cos(midAngle) * textRadius,
            Math.sin(midAngle) * textRadius,
            0.05
          );
          rashiChakraGroup.add(textSprite);
        }
      }
    });

    // ----------------------------------------------------
    // Orbit Paths & spheres for the Navagrahas (9 Grahas)
    // ----------------------------------------------------
    const GRAHAS_DATA = [
      { name: 'Surya', sanskrit: 'सूर्य', eng: 'Sun', color: 0xb88a3b, size: 0.22, orbitR: 0.9, speed: 0.12, details: 'Ruling: Simha (Leo) · Represents: Atma (Soul), Tejas, Authority' },
      { name: 'Chandra', sanskrit: 'चन्द्र', eng: 'Moon', color: 0xf4ebdd, size: 0.16, orbitR: 1.2, speed: 0.28, details: 'Ruling: Karka (Cancer) · Represents: Manas (Mind), Nurturing, Emotions' },
      { name: 'Mangala', sanskrit: 'मङ्गल', eng: 'Mars', color: 0x9f3328, size: 0.14, orbitR: 1.45, speed: 0.16, details: 'Ruling: Mesha & Vrischika · Represents: Energy, Courage, Action' },
      { name: 'Budha', sanskrit: 'बुध', eng: 'Mercury', color: 0x5a8a5f, size: 0.13, orbitR: 1.65, speed: 0.24, details: 'Ruling: Mithuna & Kanya · Represents: Intellect, Speech, Commerce' },
      { name: 'Guru', sanskrit: 'गुरु', eng: 'Jupiter', color: 0xc56a27, size: 0.20, orbitR: 1.9, speed: 0.08, details: 'Ruling: Dhanu & Meena · Represents: Wisdom, Dharma, Grace' },
      { name: 'Shukra', sanskrit: 'शुक्र', eng: 'Venus', color: 0xdfc08a, size: 0.15, orbitR: 2.1, speed: 0.18, details: 'Ruling: Vrishabha & Tula · Represents: Love, Arts, Pleasures' },
      { name: 'Shani', sanskrit: 'शनि', eng: 'Saturn', color: 0x223554, size: 0.18, orbitR: 2.35, speed: 0.04, details: 'Ruling: Makara & Kumbha · Represents: Karma, Discipline, Time' },
      { name: 'Rahu', sanskrit: 'राहू', eng: 'North Node', color: 0x3d3028, size: 0.14, orbitR: 2.65, speed: 0.06, details: 'Co-ruling: Kumbha · Represents: Ambition, Illusion, Desire' },
      { name: 'Ketu', sanskrit: 'केतु', eng: 'South Node', color: 0x5e544d, size: 0.14, orbitR: 2.9, speed: 0.06, details: 'Co-ruling: Vrischika · Represents: Past Karma, Moksha, Liberation' },
    ];

    const createPlanetTexture = (name: string, colorHex: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const baseColor = '#' + colorHex.toString(16).padStart(6, '0');

      // Default fill
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 128, 128);

      if (name === 'Surya') {
        // Solar texture
        const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.2, '#fff1a8');
        grad.addColorStop(0.5, '#ffaa00');
        grad.addColorStop(1, '#9b1e00');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'rgba(255, 235, 120, 0.4)';
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 25 + Math.random() * 30;
          ctx.beginPath();
          ctx.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 3 + Math.random() * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (name === 'Chandra') {
        // Moon texture - gray ivory craters
        ctx.fillStyle = '#f4ebdd';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'rgba(180, 170, 155, 0.45)';
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * 128;
          const y = Math.random() * 128;
          const r = 4 + Math.random() * 10;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (name === 'Mangala') {
        // Mars - reddish rocky
        ctx.fillStyle = '#9f3328';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'rgba(80, 20, 10, 0.55)';
        for (let i = 0; i < 15; i++) {
          ctx.beginPath();
          ctx.arc(Math.random() * 128, Math.random() * 128, 10 + Math.random() * 20, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (name === 'Budha') {
        // Mercury - gray-green
        ctx.fillStyle = '#5a8a5f';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'rgba(50, 70, 50, 0.5)';
        for (let i = 0; i < 25; i++) {
          ctx.beginPath();
          ctx.arc(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (name === 'Guru') {
        // Jupiter - ochre bands
        ctx.fillStyle = '#dfc08a';
        ctx.fillRect(0, 0, 128, 128);
        const bandColors = ['rgba(197, 106, 39, 0.6)', 'rgba(223, 192, 138, 0.3)', 'rgba(155, 80, 30, 0.65)'];
        for (let y = 10; y < 120; y += 12) {
          ctx.fillStyle = bandColors[Math.floor(Math.random() * bandColors.length)];
          ctx.fillRect(0, y, 128, 4 + Math.random() * 12);
        }
      } else if (name === 'Shukra') {
        // Venus - pale cream
        ctx.fillStyle = '#f4ebdd';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'rgba(223, 192, 138, 0.35)';
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          ctx.arc(Math.random() * 128, Math.random() * 128, 15 + Math.random() * 25, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (name === 'Shani') {
        // Saturn - blue-gray bands
        ctx.fillStyle = '#2d3d5a';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'rgba(199, 161, 90, 0.25)';
        for (let y = 15; y < 115; y += 14) {
          ctx.fillRect(0, y, 128, 4 + Math.random() * 8);
        }
      } else {
        // Rahu / Ketu - dark smoky
        const grad = ctx.createLinearGradient(0, 0, 128, 128);
        grad.addColorStop(0, '#0c081c');
        grad.addColorStop(0.5, baseColor);
        grad.addColorStop(1, '#1b1b1b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
      }

      const tex = new THREE.CanvasTexture(canvas);
      return tex;
    };

    const grahaSpheres: THREE.Mesh[] = [];
    const grahaInteractiveColliders: THREE.Mesh[] = [];

    // Draw Navagraha Orbit Tracks (dotted circles)
    const drawOrbitTrack = (radius: number) => {
      const ringPoints: THREE.Vector3[] = [];
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const ringMat = new THREE.LineDashedMaterial({
        color: 0x9a6b2f,
        dashSize: 0.1,
        gapSize: 0.08,
        transparent: true,
        opacity: 0.22,
      });
      const line = new THREE.Line(ringGeo, ringMat);
      line.computeLineDistances();
      return line;
    };

    GRAHAS_DATA.forEach((graha) => {
      // Draw track
      rashiChakraGroup.add(drawOrbitTrack(graha.orbitR));

      // Graha Sphere Mesh with procedural texturing
      const sphereGeo = new THREE.SphereGeometry(graha.size, 24, 24);
      const sphereMat = new THREE.MeshPhongMaterial({
        map: createPlanetTexture(graha.name, graha.color),
        shininess: 30,
        bumpScale: 0.05,
      });
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      
      // If Saturn (Shani), add flat horizontal rings
      if (graha.name === 'Shani') {
        const ringGeo = new THREE.RingGeometry(graha.size * 1.3, graha.size * 2.2, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xcca35a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.5; // Tilt ring
        sphereMesh.add(ringMesh);
      }

      // Store dynamic variables
      sphereMesh.userData = {
        type: 'graha',
        name: graha.name,
        sanskrit: graha.sanskrit,
        english: graha.eng,
        orbitR: graha.orbitR,
        speed: graha.speed,
        angle: Math.random() * Math.PI * 2,
        baseSize: graha.size,
        details: graha.details,
      };

      rashiChakraGroup.add(sphereMesh);
      grahaSpheres.push(sphereMesh);

      // Invisible larger collider for easier raycaster selection on hover
      const colliderGeo = new THREE.SphereGeometry(0.35, 12, 12);
      const colliderMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const colliderMesh = new THREE.Mesh(colliderGeo, colliderMat);
      colliderMesh.userData = { sphereRef: sphereMesh };
      rashiChakraGroup.add(colliderMesh);
      grahaInteractiveColliders.push(colliderMesh);
    });


    // ----------------------------------------------------
    // Build Celestial Passage (Starry Nakshatra Tunnel in background)
    // ----------------------------------------------------
    const tunnelGroup = new THREE.Group();
    scene.add(tunnelGroup);

    // Custom shader material for Nakshatra starry space tunnel
    const vertexShader = `
      uniform float uTime;
      uniform float uScrollProgress;
      varying vec3 vColor;
      varying float vAlpha;

      // Ashima Arts Simplex 3D Noise
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472 * r;}

      float snoise(vec3 v){
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 =   v - i + dot(i, C.xxx) ;

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        i = mod(i, 289.0 );
        vec4 p = permute( permute( permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        float n_ = 1.0/7.0;
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                      dot(p2,x2), dot(p3,x3) ) );
      }

      void main() {
        // Remap sphere geometry coordinates to a long cylinder
        // uv.x controls angle phi (0 to 2*PI)
        // uv.y controls depth Z (-length/2 to length/2)
        float theta = uv.x * 2.0 * 3.14159265;
        float tunnelLength = 100.0;
        float z = (uv.y - 0.5) * tunnelLength - 10.0; // offset behind chakra

        // Radius deforms with noise (extremely slow morphing)
        float baseRadius = 5.2;
        vec3 noiseCoord = vec3(cos(theta) * 1.4, sin(theta) * 1.4, z * 0.15 + uTime * 0.02);
        float nVal = snoise(noiseCoord);
        float radius = baseRadius + nVal * 0.8;

        // Subtle spiral roll (extremely slow rotation)
        float twist = 0.04 * (1.0 + uScrollProgress * 2.5);
        float finalTheta = theta + z * twist + uTime * 0.005;

        vec3 cylPos = vec3(
          cos(finalTheta) * radius,
          sin(finalTheta) * radius,
          z
        );

        // Dharmic palette tones: Maroon, Indigo, Gold, Saffron, Ivory
        vec3 colIndigo = vec3(0.06, 0.08, 0.18);  // #10152E
        vec3 colMaroon = vec3(0.23, 0.08, 0.08);  // #3A1414
        vec3 colSaffron = vec3(0.77, 0.41, 0.15); // #C56A27
        vec3 colGold = vec3(0.72, 0.54, 0.23);    // #B88A3B
        vec3 colIvory = vec3(0.95, 0.92, 0.86);   // #F4EBDD

        // Determine particle color based on random seeds
        float seed = fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453);
        
        vec3 col = colIndigo;
        if (seed < 0.08) {
          col = colGold;
        } else if (seed < 0.32) {
          col = mix(colSaffron, colGold, nVal * 0.5 + 0.5);
        } else if (seed < 0.65) {
          col = mix(colMaroon, colIndigo, sin(z * 0.05) * 0.5 + 0.5);
        } else {
          col = colIvory;
        }

        vColor = col;
        vAlpha = smoothstep(-90.0, -10.0, z) * (0.35 + nVal * 0.3); // fade out at edges

        vec4 mvPosition = modelViewMatrix * vec4(cylPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Size scale attenuation
        float pSize = 3.2;
        if (seed < 0.08) pSize = 4.5; // gold sparkles larger
        gl_PointSize = pSize * (15.0 / -mvPosition.z) * (1.0 + uScrollProgress * 0.3);
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        // Soft circular glow profile
        float opacity = smoothstep(0.5, 0.03, dist);

        // Core glow brilliance
        vec3 glowCol = mix(vColor, vec3(1.0), (1.0 - dist * 2.0) * 0.3);
        
        gl_FragColor = vec4(glowCol, opacity * vAlpha * 0.85);
      }
    `;

    const sphereGeo = new THREE.SphereGeometry(5.0, widthSeg, heightSeg);
    const uniforms = {
      uTime: { value: 0 },
      uScrollProgress: { value: 0 },
    };

    const tunnelMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const tunnelPoints = new THREE.Points(sphereGeo, tunnelMaterial);
    tunnelGroup.add(tunnelPoints);

    // ----------------------------------------------------
    // Layered Star Field System (3 Layers)
    // ----------------------------------------------------
    const starVertexShader = `
      uniform float uTime;
      uniform float uDriftSpeed;
      uniform float uScrollProgress;
      uniform float uBaseSize;
      attribute float aTwinkleSpeed;
      attribute float aTwinkleDelay;
      attribute float aTwinkleAmount;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vTwinkle;
      varying float vTwinkleAmount;

      void main() {
        vec3 pos = position;
        
        // Slow continuous drift / vertical movement
        pos.y += sin(uTime * 0.03 * uDriftSpeed + aTwinkleDelay) * 0.12;
        pos.x += cos(uTime * 0.02 * uDriftSpeed + aTwinkleDelay) * 0.12;
        
        // Parallax based on scroll progress and depth (Z coordinate)
        // Deeper stars (negative Z) move less, closer stars move more
        float parallaxFactor = (pos.z + 85.0) * 0.006;
        pos.y -= uScrollProgress * 10.0 * parallaxFactor;
        pos.x += uScrollProgress * 3.0 * parallaxFactor;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Size attenuation with distance
        gl_PointSize = uBaseSize * (35.0 / -mvPosition.z);
        
        vColor = aColor;
        vTwinkle = sin(uTime * aTwinkleSpeed + aTwinkleDelay) * 0.5 + 0.5;
        vTwinkleAmount = aTwinkleAmount;
      }
    `;

    const starFragmentShader = `
      varying vec3 vColor;
      varying float vTwinkle;
      varying float vTwinkleAmount;
      uniform float uBaseOpacity;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;
        
        // Soft circular profile
        float alpha = smoothstep(0.5, 0.05, dist);
        
        // Twinkle factor only applies to select stars
        float twinkleFactor = 1.0;
        if (vTwinkleAmount > 0.5) {
          twinkleFactor = 0.35 + 0.65 * vTwinkle;
        }
        
        gl_FragColor = vec4(vColor, alpha * uBaseOpacity * twinkleFactor);
      }
    `;

    const createStarLayer = (count: number, baseSize: number, baseOpacity: number, driftSpeed: number) => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const twinkleSpeeds = new Float32Array(count);
      const twinkleDelays = new Float32Array(count);
      const twinkleAmounts = new Float32Array(count);
      const colors = new Float32Array(count * 3);

      const palette = [
        new THREE.Color('#E8DFCF'), // soft ivory
        new THREE.Color('#D8BD82'), // warm gold
        new THREE.Color('#AEB7D0'), // muted blue
      ];

      for (let i = 0; i < count; i++) {
        let x = (Math.random() - 0.5) * 50;
        let y = (Math.random() - 0.5) * 35;
        let z = -85 + Math.random() * 100; // scattered Z=[-85, 15]

        // Keep left-side editorial text zone clear of dense stars
        // Desktop text zone: x around [-15, -2], y around [-6, 6]
        if (x < -1.0 && x > -16.0 && y > -6.0 && y < 6.0) {
          if (Math.random() < 0.85) {
            // Relocate to the right side
            x = 2.0 + Math.random() * 20.0;
          }
        }

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        twinkleSpeeds[i] = 0.4 + Math.random() * 1.6;
        twinkleDelays[i] = Math.random() * Math.PI * 2;
        
        // 15% twinkling density
        twinkleAmounts[i] = Math.random() < 0.15 ? 1.0 : 0.0;

        const r = Math.random();
        let col = palette[0];
        if (r < 0.10) col = palette[1];
        else if (r < 0.15) col = palette[2];

        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1));
      geo.setAttribute('aTwinkleDelay', new THREE.BufferAttribute(twinkleDelays, 1));
      geo.setAttribute('aTwinkleAmount', new THREE.BufferAttribute(twinkleAmounts, 1));
      geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.ShaderMaterial({
        vertexShader: starVertexShader,
        fragmentShader: starFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uScrollProgress: { value: 0 },
          uDriftSpeed: { value: driftSpeed },
          uBaseSize: { value: baseSize },
          uBaseOpacity: { value: baseOpacity },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      return pts;
    };

    // Calculate star counts based on mobile resizing
    let star1Count = 2800; // tiny stars
    let star2Count = 1000; // medium stars
    let star3Count = 200;  // bright stars
    let moteLimit = 40;

    if (width < 768) {
      star1Count = 650;
      star2Count = 230;
      star3Count = 45;
      moteLimit = 12;
    } else if (width < 1024) {
      star1Count = 1400;
      star2Count = 500;
      star3Count = 100;
      moteLimit = 25;
    }

    const starLayer1 = createStarLayer(star1Count, 0.8, 0.20, 0.05); // Layer 1: tiny/distant/slow
    const starLayer2 = createStarLayer(star2Count, 1.3, 0.35, 0.15); // Layer 2: medium/middle
    const starLayer3 = createStarLayer(star3Count, 1.8, 0.55, 0.30); // Layer 3: bright/near

    // ----------------------------------------------------
    // Continuous Lower Nebula Parallax System (3 Planes)
    // ----------------------------------------------------
    const nebulaGroup = new THREE.Group();
    scene.add(nebulaGroup);

    const nebulaVertexShader = `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uScrollProgress;
      uniform float uLayerDepth;

      void main() {
        vUv = uv;
        vec3 pos = position;
        
        // Very slow organic horizontal and vertical drift in space (unique speed per depth layer)
        pos.x += sin(uTime * 0.05 * uLayerDepth) * 0.35;
        pos.y += cos(uTime * 0.04 * uLayerDepth) * 0.18;
        
        // Parallax scroll shift downward
        pos.y -= uScrollProgress * 2.5 * uLayerDepth;
        pos.x += uScrollProgress * 0.6 * uLayerDepth;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const nebulaFragmentShader = `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uCloudDensity;
      uniform float uLayerIndex;

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
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 4; ++i) {
          v += a * noise(p);
          p = rot * p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        // Vertical fade out upwards
        float verticalFade = smoothstep(1.0, 0.05, vUv.y);
        // Horizontal fade out at sides to blend left/right
        float horizontalFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
        
        vec2 uvNoise = vUv * 2.2 + vec2(uTime * 0.009, -uTime * 0.005);
        float n = fbm(uvNoise);
        float wisp = smoothstep(0.3, 0.75, n);
        
        vec3 col = vec3(0.0);
        float alpha = 0.0;
        
        if (uLayerIndex == 0.0) {
          // BACKGROUND: very dark indigo haze
          vec3 indigo = vec3(0.047, 0.07, 0.188); 
          alpha = wisp * 0.38 * verticalFade * horizontalFade;
          col = indigo;
        } else if (uLayerIndex == 1.0) {
          // MIDGROUND: soft maroon / indigo cloud
          vec3 maroon = vec3(0.09, 0.06, 0.12);
          vec3 indigo = vec3(0.047, 0.07, 0.188);
          float n2 = fbm(vUv * 3.0 - vec2(uTime * 0.007, uTime * 0.004));
          col = mix(indigo, maroon, n2);
          alpha = wisp * 0.42 * verticalFade * horizontalFade;
        } else {
          // FOREGROUND: extremely subtle saffron dust
          vec3 saffron = vec3(0.60, 0.33, 0.16);
          vec3 amber = vec3(0.72, 0.47, 0.23);
          
          float n3 = fbm(vUv * 4.5 + vec2(uTime * 0.006, -uTime * 0.006));
          col = mix(saffron, amber, n3);
          
          // Saffron is extremely subtle cosmic dust
          alpha = smoothstep(0.45, 0.82, n3) * 0.095 * verticalFade * horizontalFade;
        }
        
        float finalAlpha = alpha * uCloudDensity;
        if (finalAlpha < 0.005) discard;
        
        gl_FragColor = vec4(col, finalAlpha);
      }
    `;

    const geoBack = new THREE.PlaneGeometry(36, 12);
    const geoMid = new THREE.PlaneGeometry(32, 10);
    const geoFront = new THREE.PlaneGeometry(28, 8);

    const matBack = new THREE.ShaderMaterial({
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uScrollProgress: { value: 0 },
        uLayerDepth: { value: 0.18 },
        uCloudDensity: { value: 0.45 },
        uLayerIndex: { value: 0.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const matMid = new THREE.ShaderMaterial({
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uScrollProgress: { value: 0 },
        uLayerDepth: { value: 0.40 },
        uCloudDensity: { value: 0.55 },
        uLayerIndex: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const matFront = new THREE.ShaderMaterial({
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uScrollProgress: { value: 0 },
        uLayerDepth: { value: 0.70 },
        uCloudDensity: { value: 0.32 },
        uLayerIndex: { value: 2.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const meshBack = new THREE.Mesh(geoBack, matBack);
    meshBack.position.set(0, -5.5, -20);
    
    const meshMid = new THREE.Mesh(geoMid, matMid);
    meshMid.position.set(0, -4.8, -14);
    
    const meshFront = new THREE.Mesh(geoFront, matFront);
    meshFront.position.set(0, -4.0, -8);

    nebulaGroup.add(meshBack);
    nebulaGroup.add(meshMid);
    nebulaGroup.add(meshFront);

    // ----------------------------------------------------
    // Atmospheric Motes (diya haze / temple ash floating in foreground - made sparse and circular)
    // ----------------------------------------------------
    const moteGeo = new THREE.BufferGeometry();
    const actualMoteCount = Math.min(moteCount, moteLimit);
    const motePos = new Float32Array(actualMoteCount * 3);
    const moteVels: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < actualMoteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 24;
      motePos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      motePos[i * 3 + 2] = -35 + Math.random() * 40;
      moteVels.push({
        x: (Math.random() - 0.5) * 0.002,
        y: (Math.random() - 0.5) * 0.002,
        z: (Math.random() - 0.5) * 0.002,
      });
    }

    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    
    const moteMat = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float uScrollProgress;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          pos.y -= uScrollProgress * 3.0; // Slow parallax scroll
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = 2.8 * (15.0 / -mvPosition.z);
          vAlpha = 0.35;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.05, dist);
          gl_FragColor = vec4(0.87, 0.75, 0.54, alpha * vAlpha); // soft sandalwood gold
        }
      `,
      uniforms: {
        uScrollProgress: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);

    // ----------------------------------------------------
    // Interactivity: Mouse Raycasting and Steering
    // ----------------------------------------------------
    const mouse2D = new THREE.Vector2(-999, -999);
    const raycaster = new THREE.Raycaster();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouse2D.set(x, y);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Window Resize handler
    const handleResize = () => {
      if (!canvas) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      // Reposition and scale Rashi Chakra dynamically depending on layout width
      if (w < 768) {
        // Mobile layout: center Rashi Chakra and shift slightly down
        rashiChakraGroup.position.set(0, -1.0, 0);
        rashiChakraGroup.scale.setScalar(0.72);
      } else if (w < 1024) {
        // Tablet layout: center and scale down slightly
        rashiChakraGroup.position.set(0, 0, 0);
        rashiChakraGroup.scale.setScalar(0.85);
      } else {
        // Desktop layout: shift 15-20% further right (x=4.0) and slightly upward (y=0.8)
        rashiChakraGroup.position.set(4.0, 0.8, 0);
        rashiChakraGroup.scale.setScalar(0.95);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initialize immediately on load

    let time = 0;
    let currentScroll = 0;
    let animFrame = 0;
    let hoveredElement: THREE.Object3D | null = null;

    // Animation Loop
    const animate = () => {
      animFrame = requestAnimationFrame(animate);
      time += 0.012;

      currentScroll += (scrollProgressRef.current - currentScroll) * 0.055;
      
      uniforms.uTime.value = time;
      uniforms.uScrollProgress.value = currentScroll;

      // Update star layer uniforms
      starLayer1.material.uniforms.uTime.value = time;
      starLayer1.material.uniforms.uScrollProgress.value = currentScroll;
      starLayer2.material.uniforms.uTime.value = time;
      starLayer2.material.uniforms.uScrollProgress.value = currentScroll;
      starLayer3.material.uniforms.uTime.value = time;
      starLayer3.material.uniforms.uScrollProgress.value = currentScroll;

      // Update nebula layer uniforms
      matBack.uniforms.uTime.value = time;
      matBack.uniforms.uScrollProgress.value = currentScroll;
      matMid.uniforms.uTime.value = time;
      matMid.uniforms.uScrollProgress.value = currentScroll;
      matFront.uniforms.uTime.value = time;
      matFront.uniforms.uScrollProgress.value = currentScroll;

      // Update motes scroll progress uniform
      moteMat.uniforms.uScrollProgress.value = currentScroll;

      camera.position.z = 16.0 - currentScroll * 48.0;

      const steeringPower = 0.02 * (1.0 - Math.min(currentScroll * 1.5, 0.85)); // extremely damped, virtually static
      camera.position.x += (mouse2D.x * steeringPower - camera.position.x) * 0.025;
      camera.position.y += (mouse2D.y * (steeringPower * 0.6) - camera.position.y) * 0.025;
      // No cursor-roll on camera — keep horizon stable
      camera.rotation.z = currentScroll * 0.5;

      camera.lookAt(0, 0, camera.position.z - 8.0);

      if (camera.position.z > -3.0) {
        rashiChakraGroup.rotation.z = time * 0.035;
      }

      grahaSpheres.forEach((sphere) => {
        const data = sphere.userData;
        data.angle += data.speed * 0.06;
        sphere.position.set(
          Math.cos(data.angle) * data.orbitR,
          Math.sin(data.angle) * data.orbitR,
          0
        );
        sphere.rotation.y += 0.015;
      });

      grahaInteractiveColliders.forEach((collider) => {
        const ref = collider.userData.sphereRef as THREE.Mesh;
        collider.position.copy(ref.position);
      });

      let currentHovered: { name: string; type: 'graha' | 'rashi'; details: string } | null = null;
      
      rashiInteractiveSectors.forEach((sec) => {
        (sec.material as THREE.MeshBasicMaterial).opacity = 0;
      });
      grahaSpheres.forEach((sph) => {
        sph.scale.setScalar(1.0);
        (sph.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.45;
      });

      if (camera.position.z > 3.0) {
        raycaster.setFromCamera(mouse2D, camera);
        const targets = [...rashiInteractiveSectors, ...grahaInteractiveColliders];
        const intersects = raycaster.intersectObjects(targets, true);

        if (intersects.length > 0) {
          const hitObj = intersects[0].object;

          if (hitObj.userData.sphereRef) {
            const grahaMesh = hitObj.userData.sphereRef as THREE.Mesh;
            grahaMesh.scale.setScalar(1.35);
            (grahaMesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 1.2;
            
            const data = grahaMesh.userData;
            currentHovered = {
              name: `${data.name} (${data.sanskrit} · ${data.english})`,
              type: 'graha',
              details: data.details,
            };

          } else if (hitObj.userData.type === 'rashi') {
            ((hitObj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.15; // Golden glow highlight
            
            const data = hitObj.userData;
            currentHovered = {
              name: `${data.name} (${data.english})`,
              type: 'rashi',
              details: data.details,
            };
          }
        }
      }

      if (hoverCallbackRef.current && JSON.stringify(hoveredElement) !== JSON.stringify(currentHovered)) {
        hoveredElement = currentHovered as any;
        hoverCallbackRef.current(currentHovered);
      }

      // Update mote positions (extremely slow random walk)
      const positions = motes.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < actualMoteCount; i++) {
        const vel = moteVels[i];
        
        // Add random walk jitter
        vel.x += (Math.random() - 0.5) * 0.0001;
        vel.y += (Math.random() - 0.5) * 0.0001;
        vel.z += (Math.random() - 0.5) * 0.0001;
        
        // Limit speed to keep it extremely slow
        const maxSpeed = 0.0025;
        const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
        if (currentSpeed > maxSpeed) {
          vel.x = (vel.x / currentSpeed) * maxSpeed;
          vel.y = (vel.y / currentSpeed) * maxSpeed;
          vel.z = (vel.z / currentSpeed) * maxSpeed;
        }

        positions[i * 3] += vel.x;
        positions[i * 3 + 1] += vel.y;
        positions[i * 3 + 2] += vel.z;

        // Wrap around boundaries smoothly to stay visible all over the screen
        if (positions[i * 3] < -18) positions[i * 3] = 18;
        if (positions[i * 3] > 18) positions[i * 3] = -18;
        
        if (positions[i * 3 + 1] < -12) positions[i * 3 + 1] = 12;
        if (positions[i * 3 + 1] > 12) positions[i * 3 + 1] = -12;
        
        if (positions[i * 3 + 2] < -35) positions[i * 3 + 2] = 5;
        if (positions[i * 3 + 2] > 5) positions[i * 3 + 2] = -35;
      }
      motes.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrame);
      
      sphereGeo.dispose();
      tunnelMaterial.dispose();
      moteMat.dispose();
      spokesGeo.dispose();
      spokesMat.material.dispose();

      // Dispose stars
      starLayer1.geometry.dispose();
      (starLayer1.material as THREE.Material).dispose();
      starLayer2.geometry.dispose();
      (starLayer2.material as THREE.Material).dispose();
      starLayer3.geometry.dispose();
      (starLayer3.material as THREE.Material).dispose();

      // Dispose nebula
      geoBack.dispose();
      matBack.dispose();
      geoMid.dispose();
      matMid.dispose();
      geoFront.dispose();
      matFront.dispose();
      
      rashiChakraGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
    };
  }, [isLightTheme]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
