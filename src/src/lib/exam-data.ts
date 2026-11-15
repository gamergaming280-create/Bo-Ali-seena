export const STATUS_LABEL: Record<string, string> = { draft: "Draft", marks_open: "Marks open", under_review: "Under review", approved: "Approved", published: "Published" };

/** Buttons offered per status. The database function advance_exam decides who may actually use them. */
export function nextSteps(status: string, perms: string[]): { to: string; label: string }[] {
  const mgr = perms.includes("marks_review"), pub = perms.includes("results_publish");
  const out: { to: string; label: string }[] = [];
  if (status === "draft" && perms.includes("exams")) out.push({ to: "marks_open", label: "Open for marks entry" });
  if (status === "marks_open" && (mgr || perms.includes("marks_enter"))) out.push({ to: "under_review", label: "Submit for review" });
  if (status === "under_review" && mgr) { out.push({ to: "approved", label: "Approve results" }); out.push({ to: "marks_open", label: "Return for correction" }); }
  if (status === "approved" && mgr) out.push({ to: "under_review", label: "Reopen review" });
  if (status === "approved" && pub) out.push({ to: "published", label: "Publish to students" });
  return out;
}
