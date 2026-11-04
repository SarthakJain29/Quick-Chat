/** Animated gradient backdrop shared by every screen. Purely decorative. */
export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <div className="absolute -left-[10%] -top-[20%] h-[55vmax] w-[55vmax] animate-blob rounded-full bg-violet/30 blur-[120px]" />
      <div className="absolute -right-[15%] top-[10%] h-[45vmax] w-[45vmax] animate-blob rounded-full bg-pink/20 blur-[120px] [animation-delay:-6s]" />
      <div className="absolute -bottom-[25%] left-[20%] h-[50vmax] w-[50vmax] animate-blob rounded-full bg-cyan/15 blur-[130px] [animation-delay:-12s]" />
      <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
    </div>
  );
}
