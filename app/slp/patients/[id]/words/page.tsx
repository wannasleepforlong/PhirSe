import { notFound, redirect } from "next/navigation";
import { currentSlp, slpDb } from "@/lib/db/server";
import Shell from "../../../_components/Shell";
import WordEditor, { type WordRow } from "./WordEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Words · PhirSe" };

export default async function WordsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentSlp();
  if (!me) redirect("/slp/login");
  const db = await slpDb();
  const { data: patient } = await db.from("patient").select("id, display_name").eq("id", id).maybeSingle();
  if (!patient) notFound();
  const { data: words } = await db
    .from("word_item")
    .select("id, target_deva, set, accepted_forms, prompt_text, semantic_cue_text, phonemic_cue_text, model_text, approved_at, leitner_box")
    .eq("patient_id", id)
    .order("created_at");
  return (
    <Shell
      name={me.name}
      crumbs={[
        { href: `/slp/patients/${id}`, label: patient.display_name },
        { href: `/slp/patients/${id}/words`, label: "Words" },
      ]}
    >
      <div>
        <h1 className="text-2xl font-bold">Words for {patient.display_name}</h1>
        <p className="text-sm text-muted">
          Only approved words are used in sessions. Untreated words are never practised; they appear only in probes to show
          whether gains carry over. Leave a cue empty to use the default wording.
        </p>
      </div>
      <WordEditor patientId={id} words={(words ?? []) as WordRow[]} />
    </Shell>
  );
}
