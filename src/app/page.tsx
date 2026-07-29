import { About } from '@/components/sections/About';
import { Channels } from '@/components/sections/Channels';
import { Hero } from '@/components/sections/Hero';
import { Projects } from '@/components/sections/Projects';
import { Writing } from '@/components/sections/Writing';
import { ScrollProgress } from '@/components/ui/ScrollProgress';

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <main className="mx-auto max-w-5xl">
        <Hero />
        <About />
        <Projects />
        <Writing />
        <Channels />
      </main>
      <footer className="px-6 py-12 text-center text-sm text-[color:var(--cosmos-muted)] sm:px-12">
        © {new Date().getFullYear()} 오드
      </footer>
    </>
  );
}
