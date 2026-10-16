import { redirect } from "next/navigation";
import { currentSlp } from "@/lib/db/server";
import Shell from "../../_components/Shell";
import NewPatientForm from "./NewPatientForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New patient · PhirSe" };

export default async function NewPatientPage() {
  const me = await currentSlp();
  if (!me) redirect("/slp/login");
  return (
    <Shell name={me.name} crumbs={[{ href: "/slp/patients/new", label: "New patient" }]}>
      <h1 className="text-2xl font-bold">New patient</h1>
      <p className="max-w-2xl text-sm text-muted">
        Add a patient you already treat. Record consent only after explaining PhirSe to the patient and family in their
        language, with the aphasia-friendly form, and confirming the patient understood.
      </p>
      <NewPatientForm />
    </Shell>
  );
}
