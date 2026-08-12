import React, { useEffect, useRef } from 'react';

export default function CornerFlames() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.warn('WebGL not supported for corner flames');
      return;
    }

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Shader Source
    const vsSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform float uTime;
      uniform vec2 uResolution;
      varying vec2 vUv;

      // Organic sine-based fbm noise for sacred fire
      float diyaFlameNoise(vec2 p, float time) {
        float n = sin(p.x * 6.5 + time * 4.2) * 0.25;
        n += sin(p.x * 14.0 - time * 6.0) * 0.13;
        n += cos(p.y * 10.0 + time * 3.0) * 0.16;
        n += sin(p.x * 3.5 + p.y * 6.0 + time * 5.0) * 0.32;
        return n * 0.5 + 0.5;
      }

      void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / uResolution.y;
        
        // Scale to make the corner flames look like organic diya mounds
        vec2 uvL = vec2(uv.x * aspect * 1.1, uv.y * 0.85);
        vec2 uvR = vec2((1.0 - uv.x) * aspect * 1.1, uv.y * 0.85);
        
        // Left Diya Flame
        float dL = length(uvL - vec2(0.0, -0.05));
        float noiseL = diyaFlameNoise(vec2(uvL.x * 2.5, uvL.y * 1.8), uTime);
        float intensityL = smoothstep(0.46, 0.0, dL - noiseL * 0.24 - uvL.y * 0.45);

        // Right Diya Flame
        float dR = length(uvR - vec2(0.0, -0.05));
        float noiseR = diyaFlameNoise(vec2(uvR.x * 2.5, uvR.y * 1.8), uTime + 2.5);
        float intensityR = smoothstep(0.46, 0.0, dR - noiseR * 0.24 - uvR.y * 0.45);

        // Combine left and right temple diyas
        float flame = max(intensityL, intensityR);
        
        // Smooth vertical roll-off to blend in the temple atmosphere
        flame *= smoothstep(0.95, 0.08, uv.y);

        if (flame < 0.01) {
          discard;
        }

        // Deeply Dharmic colors:
        // Sandalwood/Vermilion: #9F3328 (rgb: 0.62, 0.20, 0.16)
        // Saffron: #C56A27 (rgb: 0.77, 0.41, 0.15)
        // Antique Gold: #B88A3B (rgb: 0.72, 0.54, 0.23)
        // Sandalwood core: #F4EBDD (rgb: 0.95, 0.92, 0.86)
        
        vec3 colorVermilion = vec3(0.62, 0.20, 0.16);
        vec3 colorSaffron = vec3(0.77, 0.41, 0.15);
        vec3 colorGold = vec3(0.72, 0.54, 0.23);
        vec3 colorIvory = vec3(0.95, 0.92, 0.86);

        // Gradient interpolation for diya glow
        vec3 color = mix(colorVermilion * 0.2, colorVermilion, smoothstep(0.02, 0.3, flame));
        color = mix(color, colorSaffron, smoothstep(0.3, 0.6, flame));
        color = mix(color, colorGold, smoothstep(0.6, 0.82, flame));
        color = mix(color, colorIvory, smoothstep(0.82, 0.98, flame));

        // Soft atmospheric edge opacity
        float alpha = smoothstep(0.01, 0.22, flame) * 0.88;

        gl_FragColor = vec4(color, alpha);
      }
    `;

    // Helper functions
    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    // Build Program
    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'uTime');
    const resLoc = gl.getUniformLocation(program, 'uResolution');

    let animFrame = 0;
    const startTime = performance.now();

    const render = () => {
      const time = (performance.now() - startTime) / 1000;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.uniform1f(timeLoc, time);
      gl.uniform2f(resLoc, canvas.width, canvas.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animFrame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '280px', // slightly taller for elegant flames
        pointerEvents: 'none',
        zIndex: 2,
        mixBlendMode: 'screen',
        opacity: 0.9,
      }}
    />
  );
}
