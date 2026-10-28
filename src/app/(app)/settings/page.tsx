"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import PageHeader, { Panel } from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";
import { LoadingBlock } from "@/components/ui/Spinner";
import type { SiteSetting } from "@/lib/api/types";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSettings, saveSetting } from "@/store/slices/engagementSlice";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The same checks the API makes, so a typo is caught before the request.
function problemWith(setting: SiteSetting, value: string) {
  const text = value.trim();
  if (!text) return null; // empty clears the setting
  if (setting.kind === "email") return EMAIL.test(text) ? null : `${setting.label} must be an email address.`;
  try {
    return new URL(text).protocol === "https:" ? null : `${setting.label} must be a full https link.`;
  } catch {
    return `${setting.label} must be a full https link.`;
  }
}

function SettingRow({ setting }: { setting: SiteSetting }) {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState(setting.value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const unchanged = value.trim() === (setting.value ?? "");

  async function save() {
    setSaved(false);
    const problem = problemWith(setting, value);
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      const updated = await dispatch(saveSetting({ key: setting.key, value })).unwrap();
      setValue(updated.value ?? "");
      setSaved(true);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      noValidate
    >
      <div className="flex-1">
        <TextField
          label={setting.label}
          type={setting.kind === "email" ? "email" : "url"}
          placeholder={setting.kind === "email" ? "name@example.com" : "https://…"}
          hint={`${setting.description} Leave empty to clear it.`}
          value={value}
          error={error ?? undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
            setError(null);
          }}
        />
      </div>
      <div className="flex items-center gap-3 sm:mb-6">
        <Button type="submit" loading={busy} disabled={unchanged}>
          Save
        </Button>
        {saved && <span className="text-sm text-teal">Saved</span>}
      </div>
    </form>
  );
}

function SettingsScreen() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.engagement.settings);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  return (
    <>
      <PageHeader
        title="General settings"
        description="Contact details and links shown on the website. Nothing is shown for a setting that is empty."
      />

      {error && <Alert className="mb-5">{error}</Alert>}

      {status === "loading" && items.length === 0 ? (
        <LoadingBlock />
      ) : (
        <Panel className="flex flex-col gap-7 p-6">
          {items.map((setting) => (
            <SettingRow key={setting.key} setting={setting} />
          ))}
        </Panel>
      )}
    </>
  );
}

export default function SettingsPage() {
  return (
    <RequireAdmin>
      <SettingsScreen />
    </RequireAdmin>
  );
}
