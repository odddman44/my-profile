import { GlassPanel } from '@/components/ui/GlassPanel';
import { Reveal } from '@/components/ui/Reveal';
import { profile } from '@/data/profile';

export function About() {
  return (
    <section id="about" className="px-6 py-24 sm:px-12 lg:px-20">
      <Reveal>
        <GlassPanel>
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">나</h2>
          {profile.intro.map((paragraph) => (
            <p key={paragraph} className="mb-4 leading-relaxed text-[color:var(--cosmos-muted)]">
              {paragraph}
            </p>
          ))}
        </GlassPanel>
      </Reveal>
    </section>
  );
}
