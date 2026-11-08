import { useId } from 'react';

/** Ink-wash clouds with an optional pale sun (hidden where a label sits in the corner). */
export function InkMist({ className, sun = true }: { className?: string; sun?: boolean }) {
  const id = `mist-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <svg className={className} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id={id} x="-20%" y="-30%" width="140%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="38" />
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      {sun && <circle cx="292" cy="58" r="30" style={{ fill: '#fff' }} opacity="0.95" />}
      <g filter={`url(#${id})`} style={{ fill: 'var(--mist)' }}>
        <ellipse cx="80" cy="120" rx="120" ry="44" opacity="0.55" />
        <ellipse cx="240" cy="92" rx="150" ry="50" opacity="0.45" />
        <ellipse cx="350" cy="140" rx="110" ry="40" opacity="0.6" />
      </g>
    </svg>
  );
}
