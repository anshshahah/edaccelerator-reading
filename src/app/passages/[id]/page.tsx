import { passages } from "@/data/passages";
import { chunkByParagraphs } from "@/lib/chunking";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return Object.keys(passages).map((id) => ({ id }));
}

// Optional: ensures only known ids are valid
export const dynamicParams = false;

export default async function PassagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const passage = passages[id as keyof typeof passages];
  if (!passage) notFound();

  const content = passage.paragraphs.join("\n\n");
  const chunks = chunkByParagraphs(content, 3);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">{passage.title}</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border p-4">
          <h2 className="font-medium">Reader (chunks)</h2>
          <div className="mt-2 text-xs text-neutral-500">
            {chunks.length} sections • {passage.paragraphs.length} paragraphs
          </div>

          <div className="mt-3 space-y-4 text-sm leading-6">
            {chunks.map((c) => (
              <div key={c.id}>
                <div className="text-xs font-semibold text-neutral-500">
                  {c.label}
                </div>
                <p className="whitespace-pre-wrap">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

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
