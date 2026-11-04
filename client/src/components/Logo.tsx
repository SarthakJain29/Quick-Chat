export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight">
      <span className="grad-bg grid place-items-center rounded-xl" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="#fff" aria-hidden>
          <path d="M5 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4l-4.5 3.5V15H8a3 3 0 0 1-3-3z" />
        </svg>
      </span>
      Quick<span className="grad-text">Chat</span>
    </span>
  );
}
