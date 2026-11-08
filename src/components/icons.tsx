const base = { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': true } as const;

export const ChevronRight = () => (
  <svg {...base}><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const ChevronLeft = () => (
  <svg {...base}><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const Play = () => (
  <svg {...base}><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
);
export const Speaker = () => (
  <svg {...base}>
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
