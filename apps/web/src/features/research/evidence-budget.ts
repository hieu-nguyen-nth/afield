import type { Evidence } from "@/features/research/models";
/** Keep review and repairs inside the same bounded free-tier input budget. */
export function modelEvidence(documents: Evidence[]) {
  const perDocument = Math.min(
    8000,
    Math.floor(24000 / Math.max(1, documents.length)),
  );
  let excerpted = false;
  const evidence = documents.map((doc) => {
    if (doc.text.length <= perDocument) return doc;
    excerpted = true;
    return { ...doc, text: doc.text.slice(0, perDocument) };
  });
  return { evidence, excerpted };
}
