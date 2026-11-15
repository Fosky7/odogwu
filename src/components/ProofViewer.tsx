export interface ProofViewerProof {
  id?: string;
  label?: string;
  imageUrl?: string;
  caption?: string;
  uploadedAt?: string;
}

export interface ProofViewerProps {
  proofs?: ProofViewerProof[];
  proof?: ProofViewerProof | ProofViewerProof[];
  src?: string;
  title?: string;
  [key: string]: unknown;
}

function normalise(props: ProofViewerProps): ProofViewerProof[] {
  const { proofs, proof, src } = props;
  if (Array.isArray(proofs) && proofs.length > 0) return proofs;
  if (Array.isArray(proof) && proof.length > 0) return proof;
  if (proof && !Array.isArray(proof)) return [proof];
  if (typeof src === "string" && src.length > 0) return [{ imageUrl: src }];
  return [];
}

/**
 * Displays uploaded proof-of-bill images with a clear label so a visitor
 * always knows they are looking at the actual bill.
 */
export function ProofViewer(props: ProofViewerProps) {
  const items = normalise(props);

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
        No proof has been uploaded for this bill yet.
      </p>
    );
  }

  return (
    <ul className="space-y-6">
      {items.map((item, index) => {
        const label = item.label ?? "Bill proof";
        const imageUrl = item.imageUrl ?? props.src ?? "";
        return (
          <li
            key={item.id ?? `${label}-${index}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">{label}</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Uploaded
              </span>
            </div>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={label}
                loading="lazy"
                className="h-auto w-full object-cover"
              />
            ) : null}
            {item.caption ? (
              <p className="px-4 py-3 text-sm leading-relaxed text-slate-600">{item.caption}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default ProofViewer;
