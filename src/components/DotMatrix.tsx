'use client';

/**
 * DotMatrix — 4x4 grid primitive. Pass `pattern` (length 16) to light cells.
 * Used in the topbar status indicator and assistant loading state.
 */
type Cell = 0 | 1 | 'blink';
export default function DotMatrix({ pattern, size = 4 }: { pattern: Cell[]; size?: number }) {
  const cells = Array.from({ length: 16 }, (_, i) => pattern[i] ?? 0);
  return (
    <div
      className="grid gap-[2px]"
      style={{
        gridTemplateColumns: `repeat(4, ${size}px)`,
        gridTemplateRows: `repeat(4, ${size}px)`,
      }}
      aria-hidden
    >
      {cells.map((c, i) => (
        <span
          key={i}
          className={
            c === 1
              ? 'bg-white'
              : c === 'blink'
                ? 'bg-white animate-matrix-blink'
                : 'bg-[#2A2A2A]'
          }
          style={{ width: size, height: size, display: 'block' }}
        />
      ))}
    </div>
  );
}
