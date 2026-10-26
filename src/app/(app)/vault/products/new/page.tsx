"use client";

import Link from "next/link";
import { useEffect } from "react";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";
import { LoadingBlock } from "@/components/ui/Spinner";
import ProductForm from "@/components/vault/ProductForm";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGroups } from "@/store/slices/groupsSlice";

function NewProductScreen() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.groups);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  return (
    <>
      <PageHeader
        title="New product"
        description="Fill in the details, add images and page sections, then publish when it's ready."
        actions={
          <Link href="/vault/products" className="text-sm text-soft-white/70 hover:text-soft-white">
            ← All products
          </Link>
        }
      />
      {status === "failed" ? (
        <Alert>{error}</Alert>
      ) : status !== "succeeded" ? (
        <LoadingBlock />
      ) : (
        <ProductForm groups={items} />
      )}
    </>
  );
}

export default function NewProductPage() {
  return (
    <RequireAdmin>
      <NewProductScreen />
    </RequireAdmin>
  );
}
