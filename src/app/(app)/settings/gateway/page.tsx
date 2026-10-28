"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TextField } from "@/components/ui/Field";
import PageHeader, { Panel } from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";
import { LoadingBlock } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/StatusBadge";
import type { PaymentKeyStatus, PaymentMode, PaymentSettings } from "@/lib/api/types";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearPaymentKeys,
  fetchPaymentSettings,
  savePaymentSettings,
  testPaymentConnection,
} from "@/store/slices/paymentsSlice";

const prefixes: Record<PaymentMode, string> = { test: "sk_test_ or rk_test_", live: "sk_live_ or rk_live_" };

function KeysForm({
  mode,
  status,
  locked,
  onClear,
}: {
  mode: PaymentMode;
  status: PaymentKeyStatus;
  locked: boolean;
  onClear: () => void;
}) {
  const dispatch = useAppDispatch();
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nothingToSave = !secretKey.trim() && !webhookSecret.trim() && !publishableKey.trim();
  const hasKeys = Boolean(status.SecretKey || status.WebhookSecretSet || status.PublishableKey);

  async function save() {
    setError(null);
    setSaved(false);
    const key = secretKey.trim();
    const hook = webhookSecret.trim();
    const pub = publishableKey.trim();
    const wrongPrefix = mode === "test" ? !/^(sk|rk)_test_/.test(key) : !/^(sk|rk)_live_/.test(key);
    if (key && wrongPrefix) {
      setError(`A ${mode} secret key starts with ${prefixes[mode]}.`);
      return;
    }
    if (hook && !hook.startsWith("whsec_")) {
      setError("A webhook signing secret starts with whsec_.");
      return;
    }
    if (pub && !pub.startsWith(`pk_${mode}_`)) {
      setError(`A ${mode} publishable key starts with pk_${mode}_.`);
      return;
    }
    setBusy(true);
    try {
      await dispatch(
        savePaymentSettings({ [mode]: { secretKey: key || undefined, webhookSecret: hook || undefined, publishableKey: pub || undefined } }),
      ).unwrap();
      setSecretKey("");
      setWebhookSecret("");
      setPublishableKey("");
      setSaved(true);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold capitalize">{mode} keys</h2>
        {status.SecretKey && status.WebhookSecretSet && status.PublishableKey ? (
          <Badge tone="teal">Saved</Badge>
        ) : (
          <Badge tone="amber">Incomplete</Badge>
        )}
      </div>

      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextField
          label="Secret key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          disabled={locked}
          placeholder={status.SecretKey ?? `${mode === "test" ? "sk_test_" : "sk_live_"}…`}
          hint={
            status.SecretKey
              ? `Saved as ${status.SecretKey}. Type a new key only if you want to replace it.`
              : "Stripe dashboard > Developers > API keys."
          }
          value={secretKey}
          onChange={(event) => {
            setSecretKey(event.target.value);
            setSaved(false);
          }}
        />
        <TextField
          label="Publishable key"
          autoComplete="off"
          spellCheck={false}
          disabled={locked}
          placeholder={status.PublishableKey ?? `pk_${mode}_…`}
          hint={
            status.PublishableKey
              ? "Saved. Type a new one only if you want to replace it."
              : "Stripe dashboard > Developers > API keys. This one is public; it shows the payment form on your website."
          }
          value={publishableKey}
          onChange={(event) => {
            setPublishableKey(event.target.value);
            setSaved(false);
          }}
        />
        <TextField
          label="Webhook signing secret"
          type="password"
          autoComplete="off"
          spellCheck={false}
          disabled={locked}
          placeholder={status.WebhookSecretSet ? "whsec_••••••••" : "whsec_…"}
          hint={
            status.WebhookSecretSet
              ? "Saved. Type a new one only if you want to replace it."
              : "Stripe shows it after you add the webhook (see the steps above)."
          }
          value={webhookSecret}
          onChange={(event) => {
            setWebhookSecret(event.target.value);
            setSaved(false);
          }}
        />
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={busy} disabled={locked || nothingToSave}>
            Save {mode} keys
          </Button>
          {hasKeys && !locked && (
            <Button type="button" variant="danger" onClick={onClear}>
              Remove {mode} keys
            </Button>
          )}
          {saved && <span className="text-sm text-teal">Saved</span>}
        </div>
      </form>
    </Panel>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text is selectable, so nothing else to do.
    }
  }
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg border border-soft-white/15 bg-void-black px-3 py-2 text-sm select-all">
        {value}
      </code>
      <Button type="button" size="sm" variant="secondary" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function PaymentsScreen() {
  const dispatch = useAppDispatch();
  const { item, status, error } = useAppSelector((state) => state.payments.settings);
  const [actionError, setActionError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ Ok: boolean; Message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [switchTo, setSwitchTo] = useState<PaymentMode | null>(null);
  const [clearMode, setClearMode] = useState<PaymentMode | null>(null);

  useEffect(() => {
    dispatch(fetchPaymentSettings());
  }, [dispatch]);

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(await dispatch(testPaymentConnection()).unwrap());
    } catch (err) {
      setTestResult({ Ok: false, Message: messageOf(err) });
    } finally {
      setTesting(false);
    }
  }

  async function changeMode(mode: PaymentMode) {
    setActionError(null);
    try {
      await dispatch(savePaymentSettings({ mode })).unwrap();
      setTestResult(null);
    } catch (err) {
      setActionError(messageOf(err));
    }
  }

  const settings: PaymentSettings | null = item;

  return (
    <>
      <PageHeader
        title="Gateway configuration"
        description="Connect your Stripe account so customers can pay at checkout. Card details never touch this site: the payment form is Stripe's own, shown inside your website."
      />

      {(error || actionError) && <Alert className="mb-5">{actionError ?? error}</Alert>}

      {status === "loading" && !settings ? (
        <LoadingBlock />
      ) : settings ? (
        <div className="flex flex-col gap-6">
          <Panel className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-semibold">Checkout is {settings.Enabled ? "on" : "off"}</h2>
                <p className="mt-1 text-sm text-soft-white/70">
                  {settings.Enabled
                    ? `Buyers can pay now, in ${settings.Mode} mode.`
                    : "Save the secret key and webhook secret for the current mode to switch it on."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={settings.Mode === "live" ? "red" : "amber"}>
                  {settings.Mode === "live" ? "Live: real money" : "Test mode"}
                </Badge>
                <Button type="button" variant="secondary" loading={testing} onClick={runTest}>
                  Test connection
                </Button>
              </div>
            </div>
            {testResult && (
              <Alert tone={testResult.Ok ? "success" : "error"} className="mt-4">
                {testResult.Message}
              </Alert>
            )}
            {!settings.FromEnvironment && (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-soft-white/10 pt-5">
                <span className="text-sm text-soft-white/70">Mode:</span>
                <Button
                  type="button"
                  size="sm"
                  variant={settings.Mode === "test" ? "primary" : "secondary"}
                  disabled={settings.Mode === "test"}
                  onClick={() => changeMode("test")}
                >
                  Test
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={settings.Mode === "live" ? "primary" : "secondary"}
                  disabled={settings.Mode === "live"}
                  onClick={() => setSwitchTo("live")}
                >
                  Live
                </Button>
                <span className="text-xs text-soft-white/60">
                  Use test mode first: Stripe gives test cards and no real money moves.
                </span>
              </div>
            )}
          </Panel>

          {settings.FromEnvironment && (
            <Alert tone="info">
              Stripe is set up through the server&apos;s environment variables, so the keys cannot be changed here.
            </Alert>
          )}
          {!settings.CanStoreKeys && !settings.FromEnvironment && (
            <Alert tone="warning">
              The server has no PAYMENTS_ENCRYPTION_KEY, so keys cannot be saved here yet. Ask the developer to set it.
            </Alert>
          )}

          <Panel className="p-6">
            <h2 className="font-heading text-lg font-semibold">Set up the webhook in Stripe</h2>
            <p className="mt-1 text-sm text-soft-white/70">
              The webhook is how Stripe tells this site an order was paid. Do this once per mode.
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-soft-white/85">
              <li>
                In Stripe open <strong>Developers &gt; Webhooks &gt; Add endpoint</strong> (switch Stripe to Test mode
                first when setting up test keys).
              </li>
              <li>
                Endpoint URL: paste this address.
                <div className="mt-2">
                  <CopyField value={settings.WebhookUrl} />
                </div>
              </li>
              <li>
                Choose these events: <code>checkout.session.completed</code>, <code>checkout.session.expired</code>, <code>checkout.session.async_payment_succeeded</code>, <code>checkout.session.async_payment_failed</code> and <code>charge.refunded</code>.
              </li>
              <li>
                Copy the <strong>Signing secret</strong> (starts with <code>whsec_</code>) into the form below.
              </li>
            </ol>
            {/localhost|127\.0\.0\.1/.test(settings.WebhookUrl) && (
              <Alert tone="warning" className="mt-4">
                This address is only reachable from this computer, so Stripe cannot call it. It works once the API is
                deployed (or with the Stripe CLI while developing).
              </Alert>
            )}
          </Panel>

          <KeysForm
            mode="test"
            status={settings.Test}
            locked={settings.FromEnvironment || !settings.CanStoreKeys}
            onClear={() => setClearMode("test")}
          />
          <KeysForm
            mode="live"
            status={settings.Live}
            locked={settings.FromEnvironment || !settings.CanStoreKeys}
            onClear={() => setClearMode("live")}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={switchTo !== null}
        title="Switch to live mode?"
        confirmLabel="Switch to live"
        onClose={() => setSwitchTo(null)}
        onConfirm={() => changeMode("live")}
      >
        <p>
          Customers will be charged <strong>real money</strong> from now on. Make sure you have tested a full purchase
          in test mode first.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={clearMode !== null}
        title={`Remove the ${clearMode} keys?`}
        confirmLabel="Remove keys"
        onClose={() => setClearMode(null)}
        onConfirm={() => dispatch(clearPaymentKeys(clearMode!)).unwrap()}
      >
        <p>
          The saved {clearMode} keys are deleted from the server.
          {clearMode === "live" && settings?.Mode === "live" ? " Checkout goes back to test mode." : ""} Existing orders
          are not affected.
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function PaymentsPage() {
  return (
    <RequireAdmin>
      <PaymentsScreen />
    </RequireAdmin>
  );
}
