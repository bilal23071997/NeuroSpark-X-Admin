"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button, { ButtonLink } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FilterSelect } from "@/components/ui/Field";
import PageHeader, { EmptyState, Panel } from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/ui/RequireAdmin";
import { LoadingBlock } from "@/components/ui/Spinner";
import { Badge, PublishBadge } from "@/components/ui/StatusBadge";
import type { Product, PublishStatus } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { formatPrice } from "@/lib/vault";
import { messageOf } from "@/store/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGroups } from "@/store/slices/groupsSlice";
import { deleteProduct, fetchProducts, publishProduct, unpublishProduct } from "@/store/slices/productsSlice";

function ProductsScreen() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.products);
  const groups = useAppSelector((state) => state.groups.items);

  const [statusFilter, setStatusFilter] = useState<"" | PublishStatus>("");
  const [groupFilter, setGroupFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchProducts({
        status: statusFilter || undefined,
        categoryId: groupFilter ? Number(groupFilter) : undefined,
      }),
    );
  }, [dispatch, statusFilter, groupFilter]);

  async function togglePublish(product: Product) {
    setBusyId(product.Id);
    setActionError(null);
    try {
      await dispatch((product.Status === "published" ? unpublishProduct : publishProduct)(product.Id)).unwrap();
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = statusFilter !== "" || groupFilter !== "";

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything in The Vault. Products start as drafts and only appear on the site once published."
        actions={<ButtonLink href="/vault/products/new">New product</ButtonLink>}
      />

      <div className="mb-5 flex flex-wrap gap-4">
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "" | PublishStatus)}
        >
          <option value="">All</option>
          <option value="draft">Drafts</option>
          <option value="published">Published</option>
        </FilterSelect>
        <FilterSelect label="Group" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
          <option value="">All groups</option>
          {groups.map((category) => (
            <optgroup key={category.Id} label={category.Name}>
              <option value={category.Id}>{category.Name} (including sub-groups)</option>
              {category.Children.map((child) => (
                <option key={child.Id} value={child.Id}>
                  {category.Name} › {child.Name}
                </option>
              ))}
            </optgroup>
          ))}
        </FilterSelect>
      </div>

      {(error || actionError) && <Alert className="mb-5">{actionError ?? error}</Alert>}

      <Panel className="overflow-hidden">
        {status === "loading" && items.length === 0 ? (
          <LoadingBlock />
        ) : items.length === 0 && status !== "failed" ? (
          <EmptyState
            title={filtered ? "No products match these filters" : "No products yet"}
            action={!filtered && <ButtonLink href="/vault/products/new">Add the first product</ButtonLink>}
          >
            {filtered ? "Try a different status or group." : "Products you create will appear here."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Products</caption>
              <thead className="border-b border-soft-white/10 text-xs text-soft-white/70 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Product</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Group</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">Price</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium lg:table-cell">Published</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-white/10">
                {items.map((product) => (
                  <tr key={product.Id} className="align-middle">
                    <td className="px-5 py-4">
                      <Link href={`/vault/products/${product.Id}`} className="font-medium hover:text-indigo-text">
                        {product.Name}
                      </Link>
                      {product.IsFeatured && (
                        <span className="ml-2 align-middle">
                          <Badge tone="violet">Featured</Badge>
                        </span>
                      )}
                      {product.IsPopular && (
                        <span className="ml-2 align-middle">
                          <Badge tone="teal">Popular</Badge>
                        </span>
                      )}
                      <p className="mt-0.5 text-xs text-soft-white/60">/{product.Slug}</p>
                    </td>
                    <td className="hidden px-5 py-4 text-soft-white/80 md:table-cell">{product.Category.Name}</td>
                    <td className="hidden px-5 py-4 text-soft-white/80 sm:table-cell">
                      {product.SalePriceCents !== null ? (
                        <>
                          <span className="text-soft-white">{formatPrice(product.SalePriceCents)}</span>{" "}
                          <span className="text-soft-white/60 line-through">{formatPrice(product.PriceCents)}</span>
                        </>
                      ) : (
                        formatPrice(product.PriceCents)
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <PublishBadge status={product.Status} />
                    </td>
                    <td className="hidden px-5 py-4 text-soft-white/80 lg:table-cell">
                      {formatDate(product.PublishedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <ButtonLink href={`/vault/products/${product.Id}`} variant="secondary" size="sm">
                          Edit
                        </ButtonLink>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyId === product.Id}
                          onClick={() => togglePublish(product)}
                        >
                          {product.Status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setToDelete(product)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this product?"
        confirmLabel="Delete product"
        onClose={() => setToDelete(null)}
        onConfirm={() => dispatch(deleteProduct(toDelete!.Id)).unwrap()}
      >
        <p>
          <strong>{toDelete?.Name}</strong> will be deleted permanently. This can&apos;t be undone. A file attached
          to it stays in storage.
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function ProductsPage() {
  return (
    <RequireAdmin>
      <ProductsScreen />
    </RequireAdmin>
  );
}
