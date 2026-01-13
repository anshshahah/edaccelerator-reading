import Link from "next/link";
import passage from "@/data/passages/sample.json";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Reading Comprehension Builder</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Choose a passage to begin.
      </p>

      <div className="mt-6 rounded-xl border p-4">
        <div className="text-lg font-medium">{passage.title}</div>
        <Link
          className="mt-3 inline-block rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
          href={`/passages/${passage.id}`}
        >
          Start →
        </Link>
      </div>
    </main>
  );
}
