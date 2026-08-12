'use client';

/**
 * OmniLogo — sharp monochrome mark.
 * 8x8 dot grid forming an "O". All squares, no curves.
 */
export default function OmniLogo({ size = 18, className = '' }: { size?: number; className?: string }) {
  const cell = size / 8;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      fill="currentColor"
      className={className}
      aria-label="Omni-AI"
      role="img"
    >
      {/* Outer ring */}
      <rect x="1" y="1" width="1" height="1" />
      <rect x="2" y="0" width="4" height="1" />
      <rect x="6" y="1" width="1" height="1" />
      <rect x="6" y="2" width="1" height="4" />
      <rect x="6" y="6" width="1" height="1" />
      <rect x="2" y="7" width="4" height="1" />
      <rect x="1" y="6" width="1" height="1" />
      <rect x="1" y="2" width="1" height="4" />
      {/* Inner accent dot — like a focus reticle */}
      <rect x="3" y="3" width="2" height="2" />
    </svg>
  );
}
