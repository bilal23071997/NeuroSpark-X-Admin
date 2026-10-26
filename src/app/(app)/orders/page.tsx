"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import { FilterSelect } from "@/components/ui/Field";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";
import { LoadingBlock } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/StatusBadge";
import type { OrderStatus } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { formatPrice } from "@/lib/vault";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOrders } from "@/store/slices/paymentsSlice";

const tones: Record<OrderStatus, "teal" | "amber" | "neutral" | "red"> = {
  paid: "teal",
  pending: "amber",
  expired: "neutral",
  refunded: "red",
};

function OrdersScreen() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.payments.orders);
  const [filter, setFilter] = useState<"" | OrderStatus>("");

  useEffect(() => {
    dispatch(fetchOrders(filter || undefined));
  }, [dispatch, filter]);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every checkout started on the website. An order is paid once Stripe confirms the payment; refunds are made in the Stripe dashboard."
      />

      <div className="mb-5 flex flex-wrap gap-4">
        <FilterSelect label="Show" value={filter} onChange={(event) => setFilter(event.target.value as "" | OrderStatus)}>
          <option value="">All orders</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
          <option value="refunded">Refunded</option>
        </FilterSelect>
      </div>

      {error && <Alert className="mb-5">{error}</Alert>}

      {status === "loading" && items.length === 0 ? (
        <LoadingBlock />
      ) : items.length === 0 && status !== "failed" ? (
        <Panel>
          <EmptyState title={filter ? "No orders match this filter" : "No orders yet"}>
            {filter ? "Try showing all orders." : "Orders appear here as soon as someone starts a checkout."}
          </EmptyState>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((order) => (
            <li key={order.id}>
              <Panel className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {order.number}
                      <Badge tone={tones[order.status]}>{order.status}</Badge>
                      {order.mode === "test" && <Badge tone="violet">Test</Badge>}
                    </p>
                    <p className="mt-0.5 text-sm text-soft-white/70">
                      {order.email ? (
                        <a href={`mailto:${order.email}`} className="text-indigo-text hover:underline">
                          {order.email}
                        </a>
                      ) : (
                        "No email yet"
                      )}{" "}
                      · {formatDate(order.paidAt ?? order.createdAt)}
                    </p>
                  </div>
                  <p className="font-heading text-lg font-semibold">{formatPrice(order.totalCents)}</p>
                </div>
                <ul className="mt-4 divide-y divide-soft-white/10 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4 py-2">
                      <span>{item.name}</span>
                      <span className="text-soft-white/70">{formatPrice(item.unitPriceCents)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function OrdersPage() {
  return (
    <RequireAdmin>
      <OrdersScreen />
    </RequireAdmin>
  );
}
