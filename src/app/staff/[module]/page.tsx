import { requireModule } from "@/lib/permissions";
import { Card, PageTitle } from "@/components/ui";

// Permission-checked entry for modules that are scheduled for later phases.
export default async function ModulePage({ params }: { params: { module: string } }) {
  const { module: m } = await requireModule(params.module);
  return (
    <>
      <PageTitle>{m.label}</PageTitle>
      <Card><p className="text-sm">{m.about}</p><p className="mt-3 text-sm text-brand-700">This module is built in Phase {m.phase}. Your role has access to it.</p></Card>
    </>
  );
}
