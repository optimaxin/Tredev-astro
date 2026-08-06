"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Fractal simplex noise (Ashima Arts webgl-noise, 3D), used to drive drifting smoke blobs.
const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.55;
    for (int i = 0; i < 5; i++) {
      sum += amp * snoise(p);
      p *= 2.02;
      amp *= 0.55;
    }
    return sum;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspectUv = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

    float t = uTime * 0.035;
    vec3 p = vec3(aspectUv * 1.6, t);

    vec2 warp = vec2(fbm(p + vec3(0.0, 0.0, 10.0)), fbm(p + vec3(5.2, 1.3, 20.0)));
    float n = fbm(vec3(aspectUv * 1.4 + warp * 0.7, t * 1.3));
    n = n * 0.5 + 0.5;

    float distFromBottomLeft = distance(uv, vec2(0.06, 0.02));
    float distFromBottomRight = distance(uv, vec2(0.96, 0.05));
    float distFromTop = distance(uv, vec2(0.55, 0.95));

    float blobA = smoothstep(0.75, 0.0, distFromBottomLeft) * (0.5 + 0.5 * n);
    float blobB = smoothstep(0.7, 0.0, distFromBottomRight) * (0.5 + 0.5 * (1.0 - n));
    float blobC = smoothstep(0.55, 0.0, distFromTop) * (0.4 + 0.6 * n);

    vec3 color = uColorA * blobA * 0.85 + uColorB * blobB * 0.8 + uColorC * blobC * 0.5;
    float alpha = clamp(blobA + blobB + blobC, 0.0, 1.0) * 0.8;

    gl_FragColor = vec4(color, alpha);
  }
`;

export function SmokeCanvas({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    function readThemeColors() {
      const style = getComputedStyle(document.documentElement);
      return {
        a: style.getPropertyValue("--color-violet").trim() || "#9b7bf0",
        b: style.getPropertyValue("--color-sindoor").trim() || "#34c98f",
        c: style.getPropertyValue("--color-marigold").trim() || "#e0b23e",
      };
    }
    const initialColors = readThemeColors();
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorA: { value: new THREE.Color(initialColors.a) },
      uColorB: { value: new THREE.Color(initialColors.b) },
      uColorC: { value: new THREE.Color(initialColors.c) },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    function resize() {
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      uniforms.uResolution.value.set(clientWidth, clientHeight);
    }
    resize();
    window.addEventListener("resize", resize);

    let rafId = 0;
    let visible = true;
    function onVisibility() {
      visible = document.visibilityState === "visible";
    }
    document.addEventListener("visibilitychange", onVisibility);

    const themeObserver = new MutationObserver(() => {
      const colors = readThemeColors();
      uniforms.uColorA.value.set(colors.a);
      uniforms.uColorB.value.set(colors.b);
      uniforms.uColorC.value.set(colors.c);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const clock = new THREE.Clock();
    function tick() {
      if (visible) {
        uniforms.uTime.value = clock.getElapsedTime();
        renderer.render(scene, camera);
      }
      rafId = requestAnimationFrame(tick);
    }

    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      tick();
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      themeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className={`absolute inset-0 ${className}`} aria-hidden />;
}
