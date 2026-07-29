import { Hero } from '@/components/sections/Hero';
import { Projects } from '@/components/sections/Projects';

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl">
      <Hero />
      <Projects />
    </main>
  );
}
