import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Check, Upload } from "lucide-react";

export type ProofUploadProps = {
  label?: string;
  helperText?: string;
  accept?: string;
  disabled?: boolean;
  onFileSelected?: (file: File | null) => void;
  onChange?: (file: File | null) => void;
};

export function ProofUpload({
  label = "Bill proof",
  helperText = "Upload a clear photo or PDF of the bill so an admin can verify it.",
  accept = "image/*,application/pdf",
  disabled = false,
  onFileSelected,
  onChange,
}: ProofUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const next =
      event.target.files && event.target.files.length > 0 ? event.target.files[0] : null;
    setFile(next);
    onFileSelected?.(next);
    onChange?.(next);
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="max-w-sm text-xs text-slate-500">{helperText}</p>
        </div>
        <input
          ref={inputRef}
          id="bill-proof-input"
          data-testid="bill-proof-input"
          type="file"
          accept={accept}
          aria-label={label}
          className="sr-only"
          disabled={disabled}
          onChange={handleFileChange}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Choose file
        </button>
      </div>

      <div aria-live="polite" className="space-y-1">
        {file ? (
          <>
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" aria-hidden="true" />
              Proof uploaded
            </p>
            <p className="truncate text-xs text-slate-600">{file.name}</p>
          </>
        ) : (
          <p className="text-xs text-slate-500">No proof uploaded yet</p>
        )}
      </div>
    </div>
  );
}
