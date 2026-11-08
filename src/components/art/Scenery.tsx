/**
 * Ink-wash (水墨) scenery drawn in SVG: layered mountain ridges fading into mist, a pagoda,
 * plum blossom, a fishing boat, birds and a pale sun. Everything is decorative (aria-hidden).
 * Ridges are generated from a seed so each scene is stable between renders.
 */
import { useId } from 'react';
import { seededRng } from '../../lib/rng';

type Pt = [number, number];

function ridge(seed: string, width: number, baseY: number, amp: number, peaks: number): Pt[] {
  const rng = seededRng(seed);
  const n = peaks * 2 + 2;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = -30 + ((width + 60) * i) / n + (rng() - 0.5) * ((width + 60) / n) * 0.6;
    const isPeak = i % 2 === 1;
    const y = baseY - (isPeak ? amp * (0.5 + rng() * 0.5) : amp * rng() * 0.22);
    pts.push([x, y]);
  }
  return pts;
}

const f = (n: number) => n.toFixed(1);

/** Catmull-Rom through the points, closed down to `bottom`. */
function ridgePath(pts: Pt[], bottom: number): string {
  let d = `M ${f(pts[0][0])} ${bottom} L ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C ${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} L ${f(pts[pts.length - 1][0])} ${bottom} Z`;
}

function yAt(pts: Pt[], x: number): number {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

/** Highest point of a ridge between two x positions (where a pagoda looks natural). */
function peakBetween(pts: Pt[], from: number, to: number): Pt {
  let best: Pt = [from, yAt(pts, from)];
  for (let x = from; x <= to; x += 2) {
    const y = yAt(pts, x);
    if (y < best[1]) best = [x, y];
  }
  return best;
}

export function Pagoda({ x, y, s = 1, color = '#2c5788' }: { x: number; y: number; s?: number; color?: string }) {
  const parts: string[] = [];
  let top = y;
  parts.push(`M ${f(x - 15 * s)} ${f(top)} h ${f(30 * s)} v ${f(-3 * s)} h ${f(-30 * s)} Z`);
  top -= 3 * s;
  for (let i = 0; i < 5; i++) {
    const w = (11 - i * 1.6) * s;
    const bh = (i === 0 ? 8 : 5.5) * s;
    parts.push(`M ${f(x - w * 0.62)} ${f(top)} h ${f(w * 1.24)} v ${f(-bh)} h ${f(-w * 1.24)} Z`);
    top -= bh;
    const rh = 3.6 * s;
    parts.push(
      `M ${f(x - w * 1.25)} ${f(top - rh * 0.55)} Q ${f(x - w * 0.8)} ${f(top + rh * 0.35)} ${f(x)} ${f(top + rh * 0.15)} ` +
        `Q ${f(x + w * 0.8)} ${f(top + rh * 0.35)} ${f(x + w * 1.25)} ${f(top - rh * 0.55)} ` +
        `Q ${f(x + w * 0.6)} ${f(top - rh * 0.2)} ${f(x + w * 0.42)} ${f(top - rh)} L ${f(x - w * 0.42)} ${f(top - rh)} ` +
        `Q ${f(x - w * 0.6)} ${f(top - rh * 0.2)} ${f(x - w * 1.25)} ${f(top - rh * 0.55)} Z`,
    );
    top -= rh;
  }
  return (
    <g fill={color}>
      <path d={parts.join(' ')} />
      <path d={`M ${f(x)} ${f(top)} v ${f(-9 * s)}`} stroke={color} strokeWidth={1.2 * s} strokeLinecap="round" />
      <circle cx={x} cy={top - 5 * s} r={1.4 * s} />
      <circle cx={x} cy={top - 8 * s} r={1 * s} />
    </g>
  );
}

export function Birds({ x, y, s = 1, color = '#3a5f8c' }: { x: number; y: number; s?: number; color?: string }) {
  const bird = (dx: number, dy: number, k: number) =>
    `M ${f(x + dx)} ${f(y + dy)} q ${f(3.5 * k * s)} ${f(-3 * k * s)} ${f(7 * k * s)} 0 q ${f(3.5 * k * s)} ${f(-3 * k * s)} ${f(7 * k * s)} 0`;
  return (
    <path d={[bird(0, 0, 1), bird(18 * s, -8 * s, 0.75), bird(32 * s, 2 * s, 0.6)].join(' ')}
      fill="none" stroke={color} strokeWidth={1.3 * s} strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
  );
}

export function Sun({ x, y, r }: { x: number; y: number; r: number }) {
  const id = `sun-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor="#f0a493" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#f3b6a8" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#f6c9bd" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#${id})`} />
    </>
  );
}

export function Boat({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const t = (dx: number, dy: number) => `${f(x + dx * s)} ${f(y + dy * s)}`;
  return (
    <g>
      <path d={`M ${t(-26, 0)} Q ${t(0, 9)} ${t(28, -2)} L ${t(22, -6)} Q ${t(0, 2)} ${t(-20, -4)} Z`} fill="#24466e" />
      <path d={`M ${t(-10, -3)} Q ${t(0, -16)} ${t(12, -3)} Z`} fill="#4f74a0" />
      <path d={`M ${t(17, -16)} L ${t(22, -19)} L ${t(27, -16)} Z`} fill="#24466e" />
      <path d={`M ${t(22, -16)} L ${t(22, -6)}`} stroke="#24466e" strokeWidth={1.6 * s} />
      <path d={`M ${t(26, -24)} L ${t(36, 6)}`} stroke="#24466e" strokeWidth={0.9 * s} strokeLinecap="round" />
      <g stroke="#7fa3cc" strokeWidth={1.1 * s} strokeLinecap="round" fill="none" opacity="0.8">
        <path d={`M ${t(-40, 8)} q ${f(10 * s)} ${f(-3 * s)} ${f(20 * s)} 0`} />
        <path d={`M ${t(-6, 12)} q ${f(12 * s)} ${f(-3 * s)} ${f(24 * s)} 0`} />
        <path d={`M ${t(30, 9)} q ${f(9 * s)} ${f(-3 * s)} ${f(18 * s)} 0`} />
      </g>
    </g>
  );
}

function Blossom({ x, y, r, rot = 0 }: { x: number; y: number; r: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k * 72 * Math.PI) / 180;
        return <circle key={k} cx={Math.cos(a) * r * 0.55} cy={Math.sin(a) * r * 0.55} r={r * 0.55}
          fill="#f7c1cc" stroke="#e7889e" strokeWidth={0.6} />;
      })}
      <circle r={r * 0.28} fill="#d6526f" />
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const a = ((k * 60 + 30) * Math.PI) / 180;
        return <circle key={k} cx={Math.cos(a) * r * 0.45} cy={Math.sin(a) * r * 0.45} r={0.7} fill="#b23a52" />;
      })}
    </g>
  );
}

/** A plum branch (梅花) reaching in from the top-left corner. */
export function PlumBranch({ className }: { className?: string }) {
  const blossoms: [number, number, number, number][] = [
    [114, 10, 9, 10], [128, 86, 10, 40], [62, 40, 8, 0], [92, 120, 8, 20], [190, 118, 9, 60],
    [188, 84, 7, 15], [152, 104, 8, 35], [34, 27, 7, 50],
  ];
  const buds: [number, number][] = [[100, 14], [170, 92], [80, 52], [205, 112], [124, 4]];
  return (
    <svg className={className} viewBox="0 0 220 150" aria-hidden="true" focusable="false">
      <g fill="none" stroke="#3a3942" strokeLinecap="round">
        <path d="M -6 18 C 40 28 72 46 112 82" strokeWidth="7" />
        <path d="M 112 82 C 132 100 152 110 192 118" strokeWidth="4" />
        <path d="M 58 38 C 74 20 92 10 118 8" strokeWidth="3.4" />
        <path d="M 90 60 C 93 80 99 96 92 122" strokeWidth="2.8" />
        <path d="M 150 104 C 160 92 172 86 190 84" strokeWidth="2.4" />
      </g>
      {buds.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.8" fill="#d6526f" />)}
      {blossoms.map(([x, y, r, rot]) => <Blossom key={`${x}-${y}`} x={x} y={y} r={r} rot={rot} />)}
    </svg>
  );
}

type Layer = { color: string; base: number; amp: number; peaks: number; opacity?: number };

const SCENES: Record<string, { w: number; h: number; layers: Layer[]; par: string }> = {
  header: {
    w: 420, h: 220, par: 'xMaxYMax slice',
    layers: [
      { color: '#c9dbee', base: 150, amp: 95, peaks: 3 },
      { color: '#9fbddc', base: 182, amp: 70, peaks: 3 },
      { color: '#6f97c3', base: 214, amp: 40, peaks: 4 },
    ],
  },
  wide: {
    w: 900, h: 240, par: 'xMidYMax slice',
    layers: [
      { color: '#cfe0f1', base: 160, amp: 90, peaks: 6 },
      { color: '#a9c5e2', base: 196, amp: 70, peaks: 5 },
      { color: '#7aa0ca', base: 236, amp: 46, peaks: 7 },
    ],
  },
  card: {
    w: 320, h: 120, par: 'xMaxYMax slice',
    layers: [
      { color: '#dbe8f5', base: 92, amp: 46, peaks: 3 },
      { color: '#c4d8ee', base: 120, amp: 34, peaks: 3 },
    ],
  },
  backdrop: {
    w: 1400, h: 280, par: 'xMidYMax slice',
    layers: [
      { color: '#d3e3f3', base: 200, amp: 120, peaks: 7, opacity: 0.9 },
      { color: '#c0d6ec', base: 250, amp: 80, peaks: 8, opacity: 0.85 },
      { color: '#adc8e4', base: 284, amp: 46, peaks: 10, opacity: 0.7 },
    ],
  },
};

type Props = {
  className?: string;
  variant?: keyof typeof SCENES;
  seed?: string;
  pagoda?: boolean;
  sun?: boolean;
  birds?: boolean;
  boat?: boolean;
  /** Where along the width (0–1) the pagoda may stand; it sits on the highest point in that range. */
  pagodaRange?: [number, number];
  /** Horizontal position (0–1) of the sun. */
  sunX?: number;
};

/** A layered ink-wash mountain scene. Decorative. */
export function Landscape({
  className, variant = 'header', seed = 'xuehai', pagoda, sun, birds, boat, pagodaRange = [0.62, 0.86], sunX = 0.8,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const scene = SCENES[variant];
  const { w, h } = scene;
  const ridges = scene.layers.map((l, i) => ridge(`${seed}:${variant}:${i}`, w, l.base, l.amp, l.peaks));
  const pagodaAt = pagoda && ridges[1] ? peakBetween(ridges[1], w * pagodaRange[0], w * pagodaRange[1]) : null;
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio={scene.par} aria-hidden="true" focusable="false">
      <defs>
        {scene.layers.map((l, i) => (
          <linearGradient key={i} id={`${uid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={l.color} stopOpacity={l.opacity ?? 1} />
            <stop offset="55%" stopColor={l.color} stopOpacity={(l.opacity ?? 1) * 0.75} />
            <stop offset="100%" stopColor={l.color} stopOpacity="0" />
          </linearGradient>
        ))}
        <filter id={`${uid}-ink`} x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
        <filter id={`${uid}-mist`} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      {sun && <Sun x={w * sunX} y={h * 0.26} r={h * 0.13} />}
      {birds && <Birds x={w * 0.52} y={h * 0.22} s={w / 420} />}
      {ridges.map((pts, i) => (
        <g key={i}>
          <path d={ridgePath(pts, h + 2)} fill={`url(#${uid}-g${i})`} filter={`url(#${uid}-ink)`} />
          {i === 1 && pagodaAt && <Pagoda x={pagodaAt[0]} y={pagodaAt[1] + 4} s={w / 420} />}
          {i < ridges.length - 1 && (
            <rect x={-20} y={scene.layers[i].base - 14} width={w + 40} height={22} fill="#ffffff" opacity="0.55"
              filter={`url(#${uid}-mist)`} />
          )}
        </g>
      ))}
      {boat && <Boat x={w * 0.22} y={h - 22} s={w / 420} />}
    </svg>
  );
}
