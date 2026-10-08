import type { ReactNode } from "react";

const shapes: Record<string, ReactNode> = {
  book: (
    <>
      <path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15M5 7h3m8 0h3" />
    </>
  ),
  direction: <path d="m21 3-7 18-3-8-8-3Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="m8 12-1 10 5-3 5 3-1-10M10 8l1.5 1.5L14 6" />
    </>
  ),
  history: (
    <>
      <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v6l4 2" />
    </>
  ),
  badge: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M9 5V2h6v3M6 16h5m4-5h3m-3 4h3" />
      <circle cx="8" cy="11" r="2" />
    </>
  ),
  chat: <path d="M3 3h18v14H8l-5 4Z" />,
  support: (
    <>
      <path d="M3 13v-2a9 9 0 0 1 18 0v2m0 5v2h-7" />
      <rect x="3" y="11" width="4" height="7" rx="2" />
      <rect x="17" y="11" width="4" height="7" rx="2" />
      <path d="M9 10h.1m5.8 0h.1m-6 4c2 2 4 2 6 0" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v.1" />
    </>
  ),
  external: (
    <>
      <path d="M13 3h8v8m0-8L10 14M9 3H3v18h18v-6" />
    </>
  ),
  logout: (
    <>
      <path d="M10 3H3v18h7m-2-9h13m-5-5 5 5-5 5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M12 2V1" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="4" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="20" r="3" />
      <path d="m8.5 10.5 7-5m-7 8 7 5" />
    </>
  ),
  camera: (
    <>
      <path d="M3 7h4l2-3h6l2 3h4v14H3Z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  bus: (
    <>
      <rect x="5" y="3" width="14" height="16" rx="3" />
      <path d="M5 11h14M8 19v3m8-3v3M8 15h1m6 0h1M12 3v8" />
    </>
  ),
  star: (
    <path d="m12 2 3 6.5 7 .9-5.2 5 1.3 7.1L12 18l-6.1 3.5 1.3-7.1-5.2-5 7-.9Z" />
  ),
  navigation: <path d="m21 3-7 18-4-7-7-4Z" />,
  map: (
    <>
      <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16" />
    </>
  ),
  phone: <path d="m7 3 3 5-3 3c1 3 3 5 6 6l3-3 5 3-1 4C10 23 1 14 3 4Z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="m3 5 9 8 9-8" />
    </>
  ),
  qr: (
    <>
      <path d="M3 3h6v6H3Zm12 0h6v6h-6ZM3 15h6v6H3Zm12 0h3v3h3v3h-6Zm-3-3h3m6 0v3M3 12h6m3 3v6M12 3v6" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4Z" />
      <path d="M15 6v2m0 3v2m0 3v2" />
    </>
  ),
  orders: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8h6m-6 4h6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2M5 21h14" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </>
  ),
  back: <path d="m14 5-7 7 7 7" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  pin: (
    <>
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3S7 2 4 10s6 12 11 7 5-14 5-14Z" />
      <path d="M4 21 16 8" />
    </>
  ),
  mountain: (
    <>
      <path d="m2 20 8-15 6 10 3-5 4 10Zm5-9 3 2 2-2" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h12v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3" />
    </>
  ),
  culture: (
    <>
      <path d="m3 9 9-6 9 6H3Zm2 0v10m7-10v10m7-10v10M3 21h18" />
    </>
  ),
  heart: (
    <path d="M20.5 4.5a5 5 0 0 0-7 0L12 6l-1.5-1.5a5 5 0 0 0-7 7L12 20l8.5-8.5a5 5 0 0 0 0-7Z" />
  ),
  "heart-filled": (
    <path fill="currentColor" stroke="none" d="M20.5 4.5a5 5 0 0 0-7 0L12 6l-1.5-1.5a5 5 0 0 0-7 7L12 20l8.5-8.5a5 5 0 0 0 0-7Z" />
  ),
  check: <path d="m5 12 4 4L19 6" />,
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20v-3a6 6 0 0 1 12 0v3H3Zm13-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 8h18m-6 5h6v5h-6Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.5" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  minus: <path d="M5 12h14" />,
  plus: <path d="M5 12h14M12 5v14" />,
  filter: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="17" r="2" />
    </>
  ),
};
export default function Icon({
  name,
  size = 22,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name] || shapes.compass}
    </svg>
  );
}
