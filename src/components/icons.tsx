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
export const Info = () => (
  <svg {...base} width={20} height={20}>
    <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 10.5v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="7.4" r="1.35" fill="currentColor" />
  </svg>
);
export const Check = () => (
  <svg {...base} width={16} height={16}>
    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const ArrowRight = () => (
  <svg {...base} width={18} height={18}>
    <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Search = () => (
  <svg {...base} width={20} height={20}>
    <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
export const Bookmark = () => (
  <svg {...base} width={18} height={18}>
    <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" fill="currentColor" />
  </svg>
);
export const Flame = () => (
  <svg {...base} width={18} height={18}>
    <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6 1-8.5z" fill="#e0752f" />
    <path d="M12 21a2.6 2.6 0 0 1-2.6-2.6c0-1.6 1.4-2.3 1.9-3.9.9 1 3.3 2.2 3.3 3.9A2.6 2.6 0 0 1 12 21z" fill="#f6c143" />
  </svg>
);
