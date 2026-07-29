import { GlassPanel } from '@/components/ui/GlassPanel';
import { Reveal } from '@/components/ui/Reveal';
import { channels } from '@/data/channels';

export function Channels() {
  return (
    <section id="channels" className="px-6 py-24 sm:px-12 lg:px-20">
      <Reveal>
        <GlassPanel>
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">채널</h2>
          <ul className="flex flex-wrap gap-3">
            {channels.map((channel) => {
              const isMail = channel.href.startsWith('mailto:');
              return (
                <li key={channel.kind}>
                  <a
                    href={channel.href}
                    {...(isMail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                    className="inline-block rounded-full border border-white/15 px-4 py-2 text-sm text-[color:var(--cosmos-muted)] transition hover:border-white/35 hover:text-white"
                  >
                    {channel.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </GlassPanel>
      </Reveal>
    </section>
  );
}
