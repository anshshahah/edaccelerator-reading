import { passages } from "@/data/passages";
import { notFound } from "next/navigation";
import PassageChunker from "@/components/reader/PassageChunker";

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
      <h1 className="text-2xl font-semibold">{passage.title}</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <PassageChunker
          passageId={passage.id}
          title={passage.title}
          paragraphs={passage.paragraphs}
        />

        <section className="rounded-xl border p-4">
          <h2 className="font-medium">Questions</h2>
          <p className="mt-2 text-sm text-neutral-600">
            AI generated questions placeholder.
          </p>
        </section>
      </div>
    </main>
  );
}
