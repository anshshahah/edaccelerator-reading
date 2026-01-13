import Link from "next/link";
import { passages } from "@/data/passages";
import { notFound } from "next/navigation";
import PassageWorkspace from "@/components/passage/PassageWorkspace";

export const runtime = "nodejs";

export function generateStaticParams() {
  return Object.keys(passages).map((id) => ({ id }));
}

export const dynamicParams = false;

export default async function PassagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const passage = passages[id as keyof typeof passages];
  if (!passage) notFound();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-neutral-900/20"
      >
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{passage.title}</h1>
      <PassageWorkspace passage={passage} />
    </main>
  );
}
