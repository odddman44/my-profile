import { profile } from '@/data/profile';

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col justify-center px-6 sm:px-12 lg:px-20"
    >
      {/* 별 위에서 텍스트가 읽히도록 뒤쪽만 어둡게 깎아낸다 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-[5] bg-[radial-gradient(ellipse_at_30%_50%,rgba(3,4,10,0.85),transparent_65%)]"
      />
      <p className="mb-5 text-xs uppercase tracking-[0.42em] text-[color:var(--cosmos-muted)]">
        me.cosmoslog.org
      </p>
      <h1 className="mb-6 text-4xl font-bold leading-[1.16] sm:text-5xl lg:text-6xl">
        {profile.heroCopy.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>
      <p className="text-base text-[color:var(--cosmos-muted)] sm:text-lg">
        {profile.displayName} · {profile.role}
      </p>
    </section>
  );
}
