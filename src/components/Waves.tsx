export function Waves({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 60" preserveAspectRatio="none" aria-hidden="true">
      {[14, 30, 46].map((y, i) => (
        <path key={y} d={`M0 ${y} q15 -12 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0`}
          fill="none" stroke="currentColor" strokeWidth="2.5" opacity={0.55 - i * 0.15} />
      ))}
    </svg>
  );
}
