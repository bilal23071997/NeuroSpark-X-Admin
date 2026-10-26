"use client";

import { useRef, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { formatBytes } from "@/lib/vault";
import { StorageNotConfiguredError, UPLOAD_LIMITS, uploadFile, validateUpload } from "@/lib/uploads";

function isHttps(value: string) {
  return /^https:\/\/\S+$/.test(value.trim());
}

/** Runs one upload and turns the outcome into state the two fields below share. */
function useUpload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  async function run<T>(task: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    setNotConfigured(false);
    try {
      return await task();
    } catch (err) {
      if (err instanceof StorageNotConfiguredError) setNotConfigured(true);
      else setError(err instanceof Error ? err.message : "The upload failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function fail(message: string) {
    setNotConfigured(false);
    setError(message);
  }

  function clearMessages() {
    setError(null);
    setNotConfigured(false);
  }

  return { busy, error, notConfigured, run, fail, clearMessages };
}

/**
 * An image URL field with an Upload button. Uploading fills the URL in; if file
 * storage isn't configured the URL can still be pasted by hand.
 */
export function ImageField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUpload();

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = validateUpload("image", file);
    if (problem) return upload.fail(problem);
    const result = await upload.run(() => uploadFile("image", file));
    if (!result) return;
    if (result.publicUrl) onChange(result.publicUrl);
    else upload.fail("Storage did not return a public image address.");
  }

  return (
    <div className="flex flex-col gap-2">
      <TextField
        label={label}
        type="url"
        required={required}
        placeholder="https://…"
        value={value}
        onChange={(event) => {
          upload.clearMessages();
          onChange(event.target.value);
        }}
        error={error}
        hint={hint ?? "Paste an image address, or upload a file."}
      />
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_LIMITS.image.contentTypes.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label={`${label}: choose an image file`}
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button size="sm" variant="secondary" loading={upload.busy} onClick={() => inputRef.current?.click()}>
          Upload image
        </Button>
        {value && (
          <Button size="sm" variant="ghost" onClick={() => onChange("")}>
            Remove
          </Button>
        )}
        <span className="text-xs text-soft-white/60">{UPLOAD_LIMITS.image.label}</span>
      </div>
      {upload.notConfigured && (
        <Alert tone="warning">
          File storage is not set up yet — ask the developer to configure it. You can still paste an image address
          above.
        </Alert>
      )}
      {upload.error && <Alert>{upload.error}</Alert>}
      {isHttps(value) && (
        // Previews arbitrary https addresses typed by an admin, which next/image can't optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value.trim()} alt="" className="max-h-40 w-auto max-w-full rounded-lg border border-soft-white/10" />
      )}
    </div>
  );
}

export interface FileValue {
  fileKey: string;
  fileName: string;
  fileSizeBytes: number;
}

/** The paid file for a product. It is stored privately and nothing serves it until checkout exists. */
export function ProductFileField({
  value,
  onChange,
}: {
  value: FileValue | null;
  onChange: (file: FileValue | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUpload();

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = validateUpload("product-file", file);
    if (problem) return upload.fail(problem);
    const result = await upload.run(() => uploadFile("product-file", file));
    if (result) onChange({ fileKey: result.key, fileName: file.name, fileSizeBytes: file.size });
  }

  return (
    <div className="flex flex-col gap-3">
      {value ? (
        <p className="text-sm">
          <span className="font-medium">{value.fileName}</span>{" "}
          <span className="text-soft-white/70">({formatBytes(value.fileSizeBytes)})</span>
        </p>
      ) : (
        <p className="text-sm text-soft-white/70">No file attached yet.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_LIMITS["product-file"].contentTypes.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose the product file"
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button size="sm" variant="secondary" loading={upload.busy} onClick={() => inputRef.current?.click()}>
          {value ? "Replace file" : "Upload file"}
        </Button>
        {value && (
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            Remove file
          </Button>
        )}
        <span className="text-xs text-soft-white/60">{UPLOAD_LIMITS["product-file"].label}</span>
      </div>
      {upload.notConfigured && (
        <Alert tone="warning">File storage is not set up yet — ask the developer to configure it.</Alert>
      )}
      {upload.error && <Alert>{upload.error}</Alert>}
    </div>
  );
}
