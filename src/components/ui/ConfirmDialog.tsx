"use client";

import { useState, type ReactNode } from "react";
import { messageOf } from "@/store/helpers";
import Alert from "./Alert";
import Button from "./Button";
import Modal from "./Modal";

/** Asks before a destructive or hard-to-undo action and shows the API's error if it fails. */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = true,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title={title}>
      <div className="text-sm leading-6 text-soft-white/80">{children}</div>
      {error && <Alert className="mt-4">{error}</Alert>}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={confirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
