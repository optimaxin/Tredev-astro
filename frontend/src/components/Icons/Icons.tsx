import React from 'react';
 
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}
 
export function RashiChakraIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <line x1="3" y1="3" x2="21" y2="21" />
      <line x1="3" y1="21" x2="21" y2="3" />
      <line x1="12" y1="3" x2="3" y2="12" />
      <line x1="3" y1="12" x2="12" y2="21" />
      <line x1="12" y1="21" x2="21" y2="12" />
      <line x1="21" y1="12" x2="12" y2="3" />
    </svg>
  );
}
 
export function AcharyaIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21c0-3.5 2.5-5 6-5s6 1.5 6 5" />
      <circle cx="12" cy="7" r="6" strokeDasharray="3 3" />
    </svg>
  );
}
 
export function ManuscriptIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5v-15Z" />
      <line x1="9" y1="7" x2="16" y2="7" />
      <line x1="9" y1="11" x2="16" y2="11" />
    </svg>
  );
}
 
export function PanchangIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="15" r="2.5" />
      <path d="M14.5 13a2.5 2.5 0 0 1 0 4" />
    </svg>
  );
}
 
export function ConstellationIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="6" cy="6" r="1.5" fill="currentColor" />
      <circle cx="18" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" />
      <circle cx="8" cy="18" r="1.5" fill="currentColor" />
      <line x1="6" y1="6" x2="18" y2="8" />
      <line x1="18" y1="8" x2="12" y2="14" />
      <line x1="12" y1="14" x2="8" y2="18" />
      <line x1="8" y1="18" x2="6" y2="6" strokeDasharray="2 2" />
    </svg>
  );
}
 
export function CareerIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 17a5 5 0 0 0 5-5H7a5 5 0 0 0 5 5Z" />
      <path d="M12 7V3M5.5 9.5l-2-2M18.5 9.5l2-2M2 17h20M4 20h16" />
    </svg>
  );
}
 
export function MarriageIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="9" cy="12" rx="6" ry="3" transform="rotate(-30 9 12)" />
      <ellipse cx="15" cy="12" rx="6" ry="3" transform="rotate(30 15 12)" />
    </svg>
  );
}
 
export function WealthIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22C12 22 5 16 5 11C5 7.1 8.1 4 12 4C15.9 4 19 7.1 19 11C19 16 12 22 12 22Z" />
      <path d="M12 22C12 22 8 16 8 12C8 9.2 10.2 7 12 7C13.8 7 16 9.2 16 12C16 16 12 22 12 22Z" />
      <path d="M12 22C6 20 2 16 2 12C2 9.5 4.5 7.5 7 9" />
      <path d="M12 22C18 20 22 16 22 12C22 9.5 19.5 7.5 17 9" />
    </svg>
  );
}
 
export function VastuIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <circle cx="12" cy="12" r="6" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}
 
export function AcademyIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2L2 9h20L12 2Z" />
      <rect x="4" y="9" width="16" height="11" rx="1" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}
 
export function CartIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 8h16l-1.5 10A3 3 0 0 1 15.5 21h-7a3 3 0 0 1-3-3L4 8Z" />
      <path d="M9 8V5a3 3 0 0 1 6 0v3" />
      <line x1="3" y1="8" x2="21" y2="8" />
    </svg>
  );
}
 
export function BellIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 9a6 6 0 1 1 12 0c0 3.2 1 5 1.5 6H4.5C5 14 6 12.2 6 9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ProfileIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
      <circle cx="12" cy="8" r="6" strokeDasharray="3 3" />
    </svg>
  );
}
 
export function ArrowIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 7h12M8 3l5 4-5 4" />
    </svg>
  );
}
 
export function SunIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
 
export function MoonIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}
 
export function LockIcon({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

