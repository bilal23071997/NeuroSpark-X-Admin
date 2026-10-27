import { createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/client";
import type {
  Order,
  OrderStatus,
  PaymentMode,
  PaymentSettings,
  PaymentTestResult,
} from "@/lib/api/types";
import { apiThunk, emptyDetail, emptyList, type DetailState, type ListState } from "../helpers";

export interface PaymentKeysInput {
  secretKey?: string;
  webhookSecret?: string;
  publishableKey?: string;
}

export interface PaymentSettingsInput {
  mode?: PaymentMode;
  test?: PaymentKeysInput;
  live?: PaymentKeysInput;
}

export const fetchPaymentSettings = apiThunk(
  "payments/settings/fetch",
  async () => (await api.get<PaymentSettings>("/admin/payments/settings")).data,
);

export const savePaymentSettings = apiThunk(
  "payments/settings/save",
  async (body: PaymentSettingsInput) => (await api.put<PaymentSettings>("/admin/payments/settings", body)).data,
);

export const clearPaymentKeys = apiThunk(
  "payments/settings/clear",
  async (mode: PaymentMode) => (await api.delete<PaymentSettings>(`/admin/payments/settings/${mode}`)).data,
);

/** Not stored: the caller shows the result. */
export const testPaymentConnection = apiThunk(
  "payments/settings/test",
  async () => (await api.post<PaymentTestResult>("/admin/payments/test")).data,
);

export const fetchOrders = apiThunk(
  "payments/orders/fetch",
  async (status?: OrderStatus) => (await api.get<Order[]>("/admin/orders", { params: { status } })).data,
);

interface PaymentsState {
  settings: DetailState<PaymentSettings>;
  orders: ListState<Order>;
}

const initialState: PaymentsState = { settings: emptyDetail(), orders: emptyList() };

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentSettings.pending, (state) => {
        state.settings.status = "loading";
        state.settings.error = null;
      })
      .addCase(fetchPaymentSettings.fulfilled, (state, { payload }) => {
        state.settings = { item: payload, status: "succeeded", error: null };
      })
      .addCase(fetchPaymentSettings.rejected, (state, { payload }) => {
        state.settings.status = "failed";
        state.settings.error = payload ?? "Could not load the payment settings";
      })
      .addCase(savePaymentSettings.fulfilled, (state, { payload }) => {
        state.settings.item = payload;
      })
      .addCase(clearPaymentKeys.fulfilled, (state, { payload }) => {
        state.settings.item = payload;
      })
      .addCase(fetchOrders.pending, (state) => {
        state.orders.status = "loading";
        state.orders.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, { payload }) => {
        state.orders = { items: payload, status: "succeeded", error: null };
      })
      .addCase(fetchOrders.rejected, (state, { payload }) => {
        state.orders.status = "failed";
        state.orders.error = payload ?? "Could not load the orders";
      });
  },
});

export default paymentsSlice.reducer;
