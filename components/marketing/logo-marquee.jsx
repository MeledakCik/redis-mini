// REDESIGN 2030: two rows, opposite directions, mask-faded edges, pause on hover, glow on logo hover.
const LOGOS = ["Vercel", "Docker", "Railway", "Next.js", "Qdrant", "Redis"];
const ROW = [...LOGOS, ...LOGOS];

export function LogoMarquee() {
  return (
    <section className="py-10 border-y border-white/5 overflow-hidden space-y-4 group/marquee">
      <div className="mask-fade-x flex items-center gap-12 md:gap-20 whitespace-nowrap px-4 animate-marquee group-hover/marquee:[animation-play-state:paused]">
        {ROW.map((name, i) => (
          <span
            key={`a-${name}-${i}`}
            className="font-display font-semibold text-lg md:text-2xl text-zinc-500 opacity-60 shrink-0 transition-all hover:text-accent hover:opacity-100 hover:drop-shadow-[0_0_10px_rgba(0,224,149,0.5)]"
          >
            {name}
          </span>
        ))}
      </div>
      <div className="mask-fade-x flex items-center gap-12 md:gap-20 whitespace-nowrap px-4 animate-marqueeReverse group-hover/marquee:[animation-play-state:paused]">
        {[...ROW].reverse().map((name, i) => (
          <span
            key={`b-${name}-${i}`}
            className="font-display font-semibold text-lg md:text-2xl text-zinc-600 opacity-40 shrink-0 transition-all hover:text-accent hover:opacity-100 hover:drop-shadow-[0_0_10px_rgba(0,224,149,0.5)]"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
