import type { CSSProperties } from "react";
const paths = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  sound: "m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
  mute: "m11 5-6 4H2v6h3l6 4V5Zm5 4 5 6m0-6-5 6",
  reset: "M3 10a9 9 0 1 1 2 8M3 4v6h6",
  book: "M12 5C8 2 4 3 2 4v15c3-2 7-1 10 1 3-2 7-3 10-1V4c-3-2-7-1-10 1Zm0 0v15",
  eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  exit: "M9 4H4v16h5m5-13 5 5-5 5m-6-5h11",
  copy: "M9 9h12v12H9V9ZM5 15H3V3h12v2",
  close: "m6 6 12 12M6 18 18 6",
  leaf: "M20 3C9 1 2 6 4 14s16 6 16-11ZM4 20 15 9",
  spark: "m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z",
} as const;
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: keyof typeof paths;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
