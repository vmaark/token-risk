const paths: Record<string, string> = {
  cube: "m9 3 7-4 7 4v8l-7 4-7-4Z",
  layers: "m3 7 9-5 9 5-9 5Zm0 5 9 5 9-5M3 17l9 5 9-5",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  search: "M21 21l-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  external: "M14 3h7v7m0-7L10 14M10 3H4v17h17v-6",
  book: "M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-7-2-10 1Zm0 0v16",
  bookmark: "M6 3h12v18l-6-4-6 4Z",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  info: "M12 11v6m0-11v1m0 15a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
  check: "m5 12 4 4L19 6",
  shield: "m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm-4 10 3 3 5-6",
  history: "M3 10a9 9 0 1 1 1 7M3 3v7h7m2-4v6l4 2",
  network: "M12 3v6m-7 9v-5h14v5M9 3h6v5H9zM2 18h6v5H2zM16 18h6v5h-6z",
  list: "M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01",
  close: "m6 6 12 12M6 18 18 6",
  warning: "M12 3 1 21h22ZM12 9v5m0 3v1",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  copy: "M9 9h12v12H9zM15 9V3H3v12h6",
  compare: "M7 3v18m10-18v18M3 7l4-4 4 4m2 10 4 4 4-4",
  sliders: "M3 7h4m4 0h10M3 17h10m4 0h4M7 3h4v8H7zM13 13h4v8h-4z",
  eye: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  globe:
    "M22 12A10 10 0 1 0 2 12a10 10 0 0 0 20 0ZM2 12h20M12 2c6 5 6 15 0 20-6-5-6-15 0-20",
  menu: "M3 6h18M3 12h18M3 18h18",
  fit: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
};

export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] || paths.layers} />
    </svg>
  );
}
