import { GlassPanel } from '@/components/ui/GlassPanel';
import { Reveal } from '@/components/ui/Reveal';
import { channels } from '@/data/channels';

export function Writing() {
  const blog = channels.find((channel) => channel.kind === 'blog');
  // 블로그 주소가 아직 없으면 섹션 자체를 렌더링하지 않는다
  if (!blog) return null;

  return (
    <section id="writing" className="px-6 py-24 sm:px-12 lg:px-20">
      <Reveal>
        <GlassPanel>
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">기록</h2>
          <a
            href={blog.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--cosmos-muted)] underline underline-offset-4 hover:text-white"
          >
            {blog.label}
          </a>
        </GlassPanel>
      </Reveal>
    </section>
  );
}
