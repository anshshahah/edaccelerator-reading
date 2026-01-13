import Link from "next/link";
import { passages } from "@/data/passages";

export default function HomePage() {
  const list = Object.values(passages);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Reading Comprehension Builder</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Choose a passage to begin.
      </p>

      <div className="mt-6 space-y-3">
        {list.map((p) => (
          <div key={p.id} className="rounded-xl border p-4">
            <div className="text-lg font-medium">{p.title}</div>
            <Link
              className="mt-3 inline-block rounded-lg border px-3 py-2 text-sm hover:bg-neutral-900/20"
              href={`/passages/${p.id}`}
            >
              Start →
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
