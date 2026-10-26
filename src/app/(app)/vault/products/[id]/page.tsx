"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PageHeader, { Panel } from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";
import { LoadingBlock } from "@/components/ui/Spinner";
import { PublishBadge } from "@/components/ui/StatusBadge";
import ProductForm from "@/components/vault/ProductForm";
import { formatDate } from "@/lib/format";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGroups } from "@/store/slices/groupsSlice";
import {
  clearProductDetail,
  deleteProduct,
  fetchProduct,
  publishProduct,
  unpublishProduct,
} from "@/store/slices/productsSlice";

function EditProductScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { item: product, status, error } = useAppSelector((state) => state.products.detail);
  const groups = useAppSelector((state) => state.groups);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchProduct(id));
    return () => {
      dispatch(clearProductDetail());
    };
  }, [dispatch, id]);

  async function togglePublish() {
    if (!product) return;
    setBusy(true);
    setActionError(null);
    try {
      await dispatch((product.status === "published" ? unpublishProduct : publishProduct)(product.id)).unwrap();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  if (status === "failed") {
    return (
      <>
        <PageHeader title="Product" />
        <Alert>{error}</Alert>
        <p className="mt-4">
          <Link href="/vault/products" className="text-sm text-indigo-text hover:underline">
            ← Back to products
          </Link>
        </p>
      </>
    );
  }

  if (!product || groups.status !== "succeeded") return <LoadingBlock label="Loading product…" />;

  return (
    <>
      <PageHeader
        title="Edit product"
        description={product.name}
        actions={
          <Link href="/vault/products" className="text-sm text-soft-white/70 hover:text-soft-white">
            ← All products
          </Link>
        }
      />

      {actionError && <Alert className="mb-5">{actionError}</Alert>}

      <Panel className="mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <PublishBadge status={product.status} />
            <span className="text-sm text-soft-white/70">
              {product.status === "published"
                ? `Live since ${formatDate(product.publishedAt)}`
                : "Not visible on the site yet"}
            </span>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" loading={busy} onClick={togglePublish}>
              {product.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-soft-white/60">
          Publish and Unpublish use the last saved version. Save your changes first.
        </p>
      </Panel>

      <ProductForm key={product.id} product={product} groups={groups.items} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this product?"
        confirmLabel="Delete product"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await dispatch(deleteProduct(product.id)).unwrap();
          router.replace("/vault/products");
        }}
      >
        <p>
          <strong>{product.name}</strong> will be deleted permanently. This can&apos;t be undone. A file attached to
          it stays in storage.
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function EditProductPage() {
  return (
    <RequireAdmin>
      <EditProductScreen />
    </RequireAdmin>
  );
}
