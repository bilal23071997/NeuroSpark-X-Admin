import { redirect } from "next/navigation";

// The Stripe setup moved to Settings > Gateway configuration.
export default function PaymentsRedirect() {
  redirect("/settings/gateway");
}
