import { profile } from '@/data/profile';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-[color:var(--cosmos-muted)]">
        {profile.displayName} · {profile.role}
      </p>
    </main>
  );
}
