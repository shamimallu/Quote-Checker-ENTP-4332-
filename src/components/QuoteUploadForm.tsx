"use client";

import { useRef, useState } from "react";

export default function QuoteUploadForm({
  onUpload,
  uploading,
  error,
}: {
  onUpload: (file: File) => void;
  uploading: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-walnut bg-bark p-6">
      <h2 className="font-serif text-xl text-beige">Upload a quote</h2>
      <p className="mt-1 text-sm text-sand">PDF, JPEG, PNG, or WEBP — up to 10MB.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="block w-full max-w-xs text-sm text-sand file:mr-3 file:rounded-full file:border file:border-walnut file:bg-espresso file:px-3 file:py-1.5 file:text-sm file:text-beige file:transition-colors hover:file:border-caramel"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => {
            const file = inputRef.current?.files?.[0];
            if (!file) return;
            onUpload(file);
            if (inputRef.current) inputRef.current.value = "";
            setFileName(null);
          }}
          className="rounded-full border border-caramel bg-caramel/10 px-4 py-2 text-sm text-caramel transition-colors hover:bg-caramel/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Reading…" : "Add quote"}
        </button>
      </div>

      {fileName && !uploading && (
        <p className="mt-2 text-xs text-sand">Selected: {fileName}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
