import React from 'react';
import styles from './CelestialOrnament.module.css';

export type OrnamentType =
  | 'rashi'
  | 'kundli'
  | 'nakshatra'
  | 'surya'
  | 'chandra'
  | 'mandala'
  | 'yantra'
  | 'orbit'
  | 'surya_chandra';

interface CelestialOrnamentProps {
  type: OrnamentType;
  className?: string;
  style?: React.CSSProperties;
  animate?: boolean;
}

export default function CelestialOrnament({
  type,
  className = '',
  style,
  animate = false
}: CelestialOrnamentProps) {
  const animationClass = animate ? styles.slowRotate : '';
  const combinedClass = `${styles.ornament} ${animationClass} ${className}`;

  switch (type) {
    case 'rashi':
      return (
        <svg
          className={combinedClass}
          style={style}
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          {/* Outer circle */}
          <circle cx="100" cy="100" r="95" />
          <circle cx="100" cy="100" r="85" strokeDasharray="2 2" />
          <circle cx="100" cy="100" r="60" />
          
          {/* Central sun motif */}
          <circle cx="100" cy="100" r="10" fill="currentColor" fillOpacity="0.05" />
          <circle cx="100" cy="100" r="4" />
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i * Math.PI) / 4;
            return (
              <line
                key={`sun-${i}`}
                x1={100 + Math.cos(angle) * 4}
                y1={100 + Math.sin(angle) * 4}
                x2={100 + Math.cos(angle) * 8}
                y2={100 + Math.sin(angle) * 8}
              />
            );
          })}

          {/* 12 Zodiac lines */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * Math.PI) / 6;
            return (
              <line
                key={`line-${i}`}
                x1={100 + Math.cos(angle) * 60}
                y1={100 + Math.sin(angle) * 60}
                x2={100 + Math.cos(angle) * 85}
                y2={100 + Math.sin(angle) * 85}
              />
            );
          })}

          {/* Faint glyph placeholder graphics */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = ((i + 0.5) * Math.PI) / 6;
            const x = 100 + Math.cos(angle) * 72.5;
            const y = 100 + Math.sin(angle) * 72.5;
            return (
              <g key={`glyph-${i}`} strokeWidth="0.5">
                <circle cx={x} cy={y} r="2" fill="currentColor" fillOpacity="0.1" />
                <path d={`M ${x-2} ${y} A 2 2 0 0 1 ${x+2} ${y}`} />
                <line x1={x} y1={y-2} x2={x} y2={y+2} />
              </g>
            );
          })}
        </svg>
      );

    case 'kundli':
      return (
        <svg
          className={combinedClass}
          style={style}
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          {/* North Indian style chart */}
          <rect x="10" y="10" width="180" height="180" />
          <line x1="10" y1="10" x2="190" y2="190" />
          <line x1="190" y1="10" x2="10" y2="190" />
          
          <line x1="10" y1="100" x2="100" y2="10" />
          <line x1="100" y1="10" x2="190" y2="100" />
          <line x1="190" y1="100" x2="100" y2="190" />
          <line x1="100" y1="190" x2="10" y2="100" />

          {/* Concentric central diamond */}
          <rect x="80" y="80" width="40" height="40" strokeDasharray="2 2" />
          <circle cx="100" cy="100" r="10" />
        </svg>
      );

    case 'nakshatra':
      return (
        <svg
          className={combinedClass}
          style={style}
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          {/* Dotted constellation lines & stars */}
          <g opacity="0.8">
            <line x1="30" y1="40" x2="60" y2="70" strokeDasharray="3 3" />
            <line x1="60" y1="70" x2="100" y2="60" strokeDasharray="3 3" />
            <line x1="100" y1="60" x2="120" y2="90" strokeDasharray="3 3" />
            
            <circle cx="30" cy="40" r="2.5" fill="currentColor" />
            <circle cx="60" cy="70" r="1.5" fill="currentColor" />
            <circle cx="100" cy="60" r="2" fill="currentColor" />
            <circle cx="120" cy="90" r="3" fill="currentColor" />
            
            {/* Tiny stars */}
            <path d="M 30 35 L 30 45 M 25 40 L 35 40" strokeWidth="0.5" />
            <path d="M 120 83 L 120 97 M 113 90 L 127 90" strokeWidth="0.5" />
          </g>

          <g opacity="0.6">
            <line x1="130" y1="120" x2="160" y2="150" strokeDasharray="2 2" />
            <line x1="160" y1="150" x2="140" y2="175" strokeDasharray="2 2" />
            
            <circle cx="130" cy="120" r="1.5" fill="currentColor" />
            <circle cx="160" cy="150" r="2.5" fill="currentColor" />
            <circle cx="140" cy="175" r="1.5" fill="currentColor" />
          </g>

          {/* Tiny background dust stars */}
          <circle cx="80" cy="120" r="1" />
          <circle cx="160" cy="50" r="0.75" />
          <circle cx="40" cy="150" r="1" />
          <circle cx="95" cy="165" r="0.75" />
        </svg>
      );

    case 'surya':
      return (
        <svg
          className={combinedClass}
          style={style}
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          <circle cx="100" cy="100" r="25" />
          <circle cx="100" cy="100" r="21" strokeDasharray="2 2" />
          <circle cx="100" cy="100" r="4" fill="currentColor" />

          {/* 16 rays (alternating long and short) */}
          {Array.from({ length: 16 }, (_, i) => {
            const angle = (i * Math.PI) / 8;
            const isLong = i % 2 === 0;
            const r1 = 28;
            const r2 = isLong ? 72 : 48;
            return (
              <line
                key={`ray-${i}`}
                x1={100 + Math.cos(angle) * r1}
                y1={100 + Math.sin(angle) * r1}
                x2={100 + Math.cos(angle) * r2}
                y2={100 + Math.sin(angle) * r2}
              />
            );
          })}
        </svg>
      );

    case 'chandra':
      return (
        <svg
          className={combinedClass}
          style={style}
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          {/* Crescent Moon */}
          <path
            d="M 115 65 A 40 40 0 1 0 115 135 A 32 32 0 1 1 115 65 Z"
            fill="currentColor"
            fillOpacity="0.04"
          />
          {/* Orbit rings around moon */}
          <ellipse
            cx="100"
            cy="100"
            rx="75"
            ry="25"
            transform="rotate(-25 100 100)"
            strokeDasharray="4 4"
          />
          <ellipse cx="100" cy="100" rx="90" ry="32" transform="rotate(-25 100 100)" />
          
          {/* Star symbol next to moon */}
          <g transform="translate(130, 85)">
            <circle cx="0" cy="0" r="2" fill="currentColor" />
            <path d="M -8 0 L 8 0 M 0 -8 L 0 8" strokeWidth="0.5" />
          </g>
        </svg>
      );

    case 'mandala':
      return (
        <svg
          className={combinedClass}
          style={style}
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          <circle cx="100" cy="100" r="92" />
          <circle cx="100" cy="100" r="84" />
          <circle cx="100" cy="100" r="68" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="48" />
          <circle cx="100" cy="100" r="16" />

          {/* Mandala radial petals or wedges */}
          {Array.from({ length: 24 }, (_, i) => {
            const angle = (i * Math.PI) / 12;
            const x1 = 100 + Math.cos(angle) * 48;
            const y1 = 100 + Math.sin(angle) * 48;
            const x2 = 100 + Math.cos(angle) * 84;
            const y2 = 100 + Math.sin(angle) * 84;
            return (
              <g key={`mandala-${i}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} />
                <circle
                  cx={100 + Math.cos(angle) * 76}
                  cy={100 + Math.sin(angle) * 76}
                  r="1.5"
                  fill="currentColor"
                />
              </g>
            );
          })}
        </svg>
      );

    case 'yantra':
      return (
        <svg
          className={combinedClass}
          style={style}
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          {/* Classic Yantra borders */}
          <rect x="25" y="25" width="150" height="150" />
          <rect x="32" y="32" width="136" height="136" strokeDasharray="2 2" />
          
          {/* Outer circle */}
          <circle cx="100" cy="100" r="64" />
          
          {/* Interlocking triangles */}
          <g transform="translate(100, 100)">
            {/* Upward triangle */}
            <polygon points="0,-56 -48,28 48,28" />
            {/* Downward triangle */}
            <polygon points="0,56 -48,-28 48,-28" />

            <circle cx="0" cy="0" r="32" />
            <circle cx="0" cy="0" r="12" fill="currentColor" fillOpacity="0.08" />
            <circle cx="0" cy="0" r="4" fill="currentColor" />
          </g>
        </svg>
      );

    case 'orbit':
      return (
        <svg
          className={combinedClass}
          style={style}
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          {/* Central sun star */}
          <circle cx="100" cy="100" r="6" fill="currentColor" />
          
          {/* Nested elliptical orbits */}
          <ellipse cx="100" cy="100" rx="35" ry="20" transform="rotate(-15 100 100)" />
          <ellipse cx="100" cy="100" rx="60" ry="32" transform="rotate(20 100 100)" strokeDasharray="4 2" />
          <ellipse cx="100" cy="100" rx="85" ry="44" transform="rotate(-35 100 100)" />
          
          {/* Orbit planets */}
          <circle cx="82" cy="85" r="3" fill="currentColor" />
          <circle cx="145" cy="115" r="4" fill="currentColor" />
          <circle cx="55" cy="125" r="2.5" fill="currentColor" />
          
          {/* Moon orbit path on the second planet */}
          <circle cx="145" cy="115" r="8" strokeDasharray="1 1" />
        </svg>
      );

    case 'surya_chandra':
      return (
        <svg
          className={combinedClass}
          style={style}
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          {/* Outer Ring */}
          <circle cx="100" cy="100" r="90" />
          <circle cx="100" cy="100" r="82" strokeDasharray="3 3" />
          
          {/* Left crescent (Moon) and Right radiating sun */}
          <path d="M 90 40 A 60 60 0 0 0 90 160 A 50 50 0 0 1 90 40 Z" fill="currentColor" fillOpacity="0.05" />
          
          {/* Radiating rays on the right side */}
          {Array.from({ length: 10 }, (_, i) => {
            const angle = ((i - 4.5) * Math.PI) / 8; // Right half arcs
            const r1 = 60;
            const r2 = i % 2 === 0 ? 80 : 70;
            return (
              <line
                key={`sc-ray-${i}`}
                x1={100 + Math.cos(angle) * r1}
                y1={100 + Math.sin(angle) * r1}
                x2={100 + Math.cos(angle) * r2}
                y2={100 + Math.sin(angle) * r2}
              />
            );
          })}

          <circle cx="100" cy="100" r="50" />
          <circle cx="90" cy="95" r="3" fill="currentColor" />
        </svg>
      );

    default:
      return null;
  }
}
