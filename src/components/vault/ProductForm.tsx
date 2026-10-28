"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { z } from "zod";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/PageHeader";
import RichTextEditor from "@/components/ui/RichTextEditor";
import SortableList, { type RowControls } from "@/components/ui/SortableList";
import type { Product, SectionType, VaultGroup } from "@/lib/api/types";
import { emptyToUndefined } from "@/lib/format";
import { optionalSlug } from "@/lib/validation";
import {
  centsToDollars,
  destinations,
  dollarsToCents,
  PRICE_PATTERN,
  productSymbols,
  sectionLabel,
  sectionTypes,
} from "@/lib/vault";
import { messageOf } from "@/store/helpers";
import { useAppDispatch } from "@/store/hooks";
import { createProduct, updateProduct, type ProductInput, type SectionInput } from "@/store/slices/productsSlice";
import { ImageField, ProductFileField } from "./UploadFields";

const HTTPS = /^https:\/\/\S+$/;
const httpsOrEmpty = z
  .string()
  .trim()
  .refine((value) => value === "" || HTTPS.test(value), "Enter a full https:// address.");

// One section, checked the way the API checks it (vault/sections.ts), so mistakes show up beside the field.
const sectionSchema = z
  .object({
    sid: z.string().optional(),
    type: z.enum(["text", "bullets", "faq", "image"]),
    title: z.string(),
    body: z.string(),
    items: z.array(z.object({ text: z.string() })),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })),
    imageUrl: z.string(),
    alt: z.string(),
  })
  .superRefine((section, ctx) => {
    const add = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    if (section.type === "text" && !section.body.trim()) add(["body"], "Write some text.");
    if (section.type === "bullets" && !section.items.some((item) => item.text.trim())) {
      add(["items"], "Add at least one bullet.");
    }
    if (section.type === "faq") {
      if (!section.faq.some((entry) => entry.question.trim() && entry.answer.trim())) {
        add(["faq"], "Add at least one question with its answer.");
      }
      section.faq.forEach((entry, index) => {
        const q = entry.question.trim();
        const a = entry.answer.trim();
        if (q && !a) add(["faq", index, "answer"], "Add the answer.");
        if (a && !q) add(["faq", index, "question"], "Add the question.");
      });
    }
    if (section.type === "image") {
      if (!HTTPS.test(section.imageUrl.trim())) add(["imageUrl"], "Add an image (a full https:// address).");
      if (!section.alt.trim()) add(["alt"], "Describe the image for screen readers.");
    }
  });

const schema = z
  .object({
    name: z.string().trim().min(1, "Enter a name."),
    slug: optionalSlug,
    categoryId: z.string().min(1, "Choose a group."),
    summary: z.string().trim().min(1, "Enter a short summary."),
    description: z.string().trim().min(1, "Enter a description."),
    price: z.string().trim().regex(PRICE_PATTERN, "Enter a price like 19 or 19.99 (0 for free)."),
    salePrice: z
      .string()
      .trim()
      .refine((value) => value === "" || PRICE_PATTERN.test(value), "Enter a price like 15 or 14.99."),
    format: z.string().trim().min(1, "Enter a format, e.g. Digital Guide."),
    delivery: z.string().trim().min(1, "Enter how it is delivered, e.g. Instant download (PDF)."),
    destination: z.string(),
    symbol: z.string(),
    forWho: z.string(),
    included: z
      .array(z.object({ text: z.string() }))
      .refine((lines) => lines.some((line) => line.text.trim()), "Add at least one thing the buyer gets."),
    coverImageUrl: httpsOrEmpty,
    gallery: z.array(z.object({ url: httpsOrEmpty })).max(10, "Use 10 gallery images or fewer."),
    sections: z.array(sectionSchema).max(30, "Use 30 sections or fewer."),
    file: z.object({ fileKey: z.string(), fileName: z.string(), fileSizeBytes: z.number() }).nullable(),
    isFeatured: z.boolean(),
    isPopular: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.salePrice === "" || !PRICE_PATTERN.test(values.price) || !PRICE_PATTERN.test(values.salePrice)) return;
    if (dollarsToCents(values.salePrice) >= dollarsToCents(values.price)) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "The sale price must be lower than the regular price." });
    }
  });

type FormValues = z.infer<typeof schema>;
type SectionValues = FormValues["sections"][number];

function newSection(type: SectionType): SectionValues {
  return {
    type,
    title: "",
    body: "",
    items: type === "bullets" ? [{ text: "" }] : [],
    faq: type === "faq" ? [{ question: "", answer: "" }] : [],
    imageUrl: "",
    alt: "",
  };
}

function toFormValues(product: Product | undefined, defaultCategoryId: string): FormValues {
  return {
    name: product?.Name ?? "",
    slug: product?.Slug ?? "",
    categoryId: product ? String(product.CategoryId) : defaultCategoryId,
    summary: product?.Summary ?? "",
    description: product?.Description ?? "",
    price: product ? centsToDollars(product.PriceCents) : "",
    salePrice: centsToDollars(product?.SalePriceCents),
    format: product?.Format ?? "",
    delivery: product?.Delivery ?? "",
    destination: product?.Destination ?? "",
    symbol: product?.Symbol ?? "",
    forWho: product?.ForWho ?? "",
    included: (product?.Included?.length ? product.Included : [""]).map((text) => ({ text })),
    coverImageUrl: product?.CoverImageUrl ?? "",
    gallery: (product?.GalleryImages ?? []).map((url) => ({ url })),
    sections: (product?.Sections ?? []).map((section) => ({
      sid: section.Id,
      type: section.Type,
      title: section.Title ?? "",
      body: section.Body ?? "",
      items: (section.Items ?? []).map((text) => ({ text })),
      faq: (section.Faq ?? []).map((entry) => ({ question: entry.Question, answer: entry.Answer })),
      imageUrl: section.ImageUrl ?? "",
      alt: section.Alt ?? "",
    })),
    file:
      product?.FileKey && product.FileName && product.FileSizeBytes
        ? { fileKey: product.FileKey, fileName: product.FileName, fileSizeBytes: product.FileSizeBytes }
        : null,
    isFeatured: product?.IsFeatured ?? false,
    isPopular: product?.IsPopular ?? false,
  };
}

/** Only the fields that belong to a section's type go to the API. */
function toSectionInput(section: SectionValues): SectionInput {
  const base = { id: section.sid, type: section.type, title: emptyToUndefined(section.title) };
  switch (section.type) {
    case "text":
      return { ...base, body: section.body.trim() };
    case "bullets":
      return { ...base, items: section.items.map((item) => item.text.trim()).filter(Boolean) };
    case "faq":
      return {
        ...base,
        faq: section.faq
          .map((entry) => ({ question: entry.question.trim(), answer: entry.answer.trim() }))
          .filter((entry) => entry.question && entry.answer),
      };
    case "image":
      return { ...base, imageUrl: section.imageUrl.trim(), alt: section.alt.trim() };
  }
}

/** `isEdit` sends null for emptied optional fields so they are cleared; a new product just leaves them out. */
function toProductInput(values: FormValues, isEdit: boolean): ProductInput {
  const sale = values.salePrice.trim();
  const clear = isEdit ? null : undefined;
  return {
    name: values.name,
    slug: emptyToUndefined(values.slug),
    categoryId: Number(values.categoryId),
    summary: values.summary,
    description: values.description,
    priceCents: dollarsToCents(values.price),
    salePriceCents: sale ? dollarsToCents(sale) : clear,
    format: values.format,
    delivery: values.delivery,
    destination: values.destination || clear,
    symbol: values.symbol || clear,
    forWho: values.forWho.trim(),
    included: values.included.map((line) => line.text.trim()).filter(Boolean),
    coverImageUrl: values.coverImageUrl.trim() || clear,
    galleryImages: values.gallery.map((image) => image.url.trim()).filter(Boolean),
    sections: values.sections.map(toSectionInput),
    fileKey: values.file?.fileKey ?? clear,
    fileName: values.file?.fileName ?? clear,
    fileSizeBytes: values.file?.fileSizeBytes ?? clear,
    isFeatured: values.isFeatured,
    isPopular: values.isPopular,
  };
}

/** The message for a field or for an array-level rule on it. */
function messageAt(error: unknown): string | undefined {
  const entry = error as { message?: string; root?: { message?: string } } | undefined;
  return entry?.message ?? entry?.root?.message;
}

// ---------- Sections ----------

function SectionCard({
  index,
  section,
  control,
  register,
  errors,
  controls,
  onRemove,
}: {
  index: number;
  section: SectionValues;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  controls: RowControls;
  onRemove: () => void;
}) {
  const sectionErrors = errors.sections?.[index];
  // A list-level message is only true while the list is still empty; the form re-checks it on the next save.
  const hasBullet = section.items.some((item) => item.text.trim());
  const hasFaq = section.faq.some((entry) => entry.question.trim() && entry.answer.trim());
  const bullets = useFieldArray({ control, name: `sections.${index}.items` as const });
  const faq = useFieldArray({ control, name: `sections.${index}.faq` as const });

  return (
    <div className="rounded-xl border border-soft-white/10 bg-void-black p-4">
      <div className="flex flex-wrap items-center gap-2">
        {controls.handle}
        <h3 className="flex-1 text-sm font-semibold">
          Section {index + 1} · {sectionLabel(section.type)}
        </h3>
        {controls.buttons}
        <Button size="sm" variant="danger" onClick={onRemove} aria-label={`Remove section ${index + 1}`}>
          Remove
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <TextField
          label="Heading"
          hint="Optional."
          error={messageAt(sectionErrors?.title)}
          {...register(`sections.${index}.title` as const)}
        />

        {section.type === "text" && (
<Controller
          control={control}
          name={`sections.${index}.body` as const}
          render={({ field }) => (
            <RichTextEditor
              label="Text"
              required
              minHeight="min-h-40"
              error={messageAt(sectionErrors?.body)}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        )}

        {section.type === "bullets" && (
          <div className="flex flex-col gap-3">
            {bullets.fields.map((field, itemIndex) => (
              <div key={field.id} className="flex items-end gap-3">
                <div className="flex-1">
                  <TextField
                    label={`Bullet ${itemIndex + 1}`}
                    {...register(`sections.${index}.items.${itemIndex}.text` as const)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mb-1"
                  onClick={() => bullets.remove(itemIndex)}
                  aria-label={`Remove bullet ${itemIndex + 1} of section ${index + 1}`}
                >
                  Remove
                </Button>
              </div>
            ))}
            {!hasBullet && messageAt(sectionErrors?.items) && (
              <p className="text-xs text-danger">{messageAt(sectionErrors?.items)}</p>
            )}
            <div>
              <Button size="sm" variant="secondary" onClick={() => bullets.append({ text: "" })}>
                Add bullet
              </Button>
            </div>
          </div>
        )}

        {section.type === "faq" && (
          <div className="flex flex-col gap-4">
            {faq.fields.map((field, entryIndex) => (
              <div key={field.id} className="rounded-lg border border-soft-white/10 p-3">
                <div className="flex flex-col gap-3">
                  <TextField
                    label={`Question ${entryIndex + 1}`}
                    error={messageAt(sectionErrors?.faq?.[entryIndex]?.question)}
                    {...register(`sections.${index}.faq.${entryIndex}.question` as const)}
                  />
                  <TextAreaField
                    label={`Answer ${entryIndex + 1}`}
                    error={messageAt(sectionErrors?.faq?.[entryIndex]?.answer)}
                    {...register(`sections.${index}.faq.${entryIndex}.answer` as const)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => faq.remove(entryIndex)}
                  aria-label={`Remove question ${entryIndex + 1} of section ${index + 1}`}
                >
                  Remove question
                </Button>
              </div>
            ))}
            {!hasFaq && messageAt(sectionErrors?.faq) && (
              <p className="text-xs text-danger">{messageAt(sectionErrors?.faq)}</p>
            )}
            <div>
              <Button size="sm" variant="secondary" onClick={() => faq.append({ question: "", answer: "" })}>
                Add question
              </Button>
            </div>
          </div>
        )}

        {section.type === "image" && (
          <>
            <Controller
              control={control}
              name={`sections.${index}.imageUrl` as const}
              render={({ field }) => (
                <ImageField
                  label="Image"
                  required
                  value={field.value}
                  onChange={field.onChange}
                  error={messageAt(sectionErrors?.imageUrl)}
                />
              )}
            />
            <TextField
              label="Image description (alt text)"
              required
              hint="Describes the image for people using screen readers."
              error={messageAt(sectionErrors?.alt)}
              {...register(`sections.${index}.alt` as const)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SectionsEditor({
  control,
  register,
  errors,
  sections,
}: {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  sections: SectionValues[];
}) {
  const array = useFieldArray({ control, name: "sections" });

  return (
    <Panel className="p-6">
      <h2 className="text-base font-semibold">Page sections</h2>
      <p className="mt-1 text-sm text-soft-white/70">
        Blocks shown on the product page below the summary, in this order. The page keeps one consistent theme; you
        choose what goes in it. Drag a block by its handle (or use the arrows) to reorder.
      </p>

      {array.fields.length > 0 && (
        <SortableList
          className="mt-5 flex flex-col gap-4"
          items={array.fields}
          getId={(field) => field.id}
          getLabel={(_, index) => `section ${index + 1}`}
          onMove={(from, to) => array.move(from, to)}
          renderItem={(field, controls) => (
            <SectionCard
              index={controls.index}
              section={sections[controls.index] ?? (field as unknown as SectionValues)}
              control={control}
              register={register}
              errors={errors}
              controls={controls}
              onRemove={() => array.remove(controls.index)}
            />
          )}
        />
      )}

      {messageAt(errors.sections) && <p className="mt-3 text-xs text-danger">{messageAt(errors.sections)}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-sm text-soft-white/70">Add a section:</span>
        {sectionTypes.map((entry) => (
          <Button
            key={entry.type}
            size="sm"
            variant="secondary"
            title={entry.hint}
            disabled={array.fields.length >= 30}
            onClick={() => array.append(newSection(entry.type))}
          >
            {entry.label}
          </Button>
        ))}
      </div>
    </Panel>
  );
}

// ---------- The form ----------

function GroupOptions({ groups }: { groups: VaultGroup[] }) {
  return (
    <>
      {groups.map((category) => (
        <optgroup key={category.Id} label={category.Name}>
          <option value={category.Id}>{category.Name} (main group)</option>
          {category.Children.map((child) => (
            <option key={child.Id} value={child.Id}>
              {category.Name} › {child.Name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

/** Create (no `product`) or edit (with `product`) form for a Vault product. */
export default function ProductForm({ product, groups }: { product?: Product; groups: VaultGroup[] }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(product, ""),
  });

  const included = useFieldArray({ control, name: "included" });
  const gallery = useFieldArray({ control, name: "gallery" });
  const sections = useWatch({ control, name: "sections" });
  const includedLines = useWatch({ control, name: "included" });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setSaved(false);
    try {
      if (product) {
        const updated = await dispatch(
          updateProduct({ id: product.Id, body: toProductInput(values, true) }),
        ).unwrap();
        reset(toFormValues(updated, ""));
        setSaved(true);
      } else {
        const created = await dispatch(createProduct(toProductInput(values, false))).unwrap();
        // Land on the edit screen, where the product can be published.
        router.push(`/vault/products/${created.Id}`);
      }
    } catch (error) {
      setSubmitError(messageOf(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {submitError && <Alert>{submitError}</Alert>}
      {saved && <Alert tone="success">Saved.</Alert>}

      <Panel className="flex flex-col gap-5 p-6">
        <h2 className="text-base font-semibold">Basics</h2>
        <TextField label="Name" required error={errors.name?.message} {...register("name")} />
        <TextField
          label="Slug"
          error={errors.slug?.message}
          hint={
            product
              ? "The product's web address. Changing it breaks links to the old address."
              : "Leave empty to make it from the name."
          }
          {...register("slug")}
        />
        <SelectField label="Group" required error={errors.categoryId?.message} {...register("categoryId")}>
          <option value="">Choose a group…</option>
          <GroupOptions groups={groups} />
        </SelectField>
        <TextAreaField
          label="Summary"
          required
          hint="One or two lines, shown on product cards."
          error={errors.summary?.message}
          {...register("summary")}
        />
<Controller
          control={control}
          name="description"
          render={({ field }) => (
            <RichTextEditor
              label="Description"
              required
              error={errors.description?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Panel>

      <Panel className="flex flex-col gap-5 p-6">
        <h2 className="text-base font-semibold">Price and delivery</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Price (US dollars)"
            required
            inputMode="decimal"
            placeholder="19.00"
            hint="Use 0 for a free product."
            error={errors.price?.message}
            {...register("price")}
          />
          <TextField
            label="Sale price (US dollars)"
            inputMode="decimal"
            placeholder="15.00"
            hint="Optional. Must be lower than the price. Empty ends the sale."
            error={errors.salePrice?.message}
            {...register("salePrice")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Format"
            required
            placeholder="Digital Guide"
            error={errors.format?.message}
            {...register("format")}
          />
          <TextField
            label="Delivery"
            required
            placeholder="Instant download (PDF)"
            error={errors.delivery?.message}
            {...register("delivery")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField label="Ecosystem destination" hint="Which of the five destinations this supports." {...register("destination")}>
            <option value="">None</option>
            {destinations.map((destination) => (
              <option key={destination.slug} value={destination.slug}>
                {destination.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Cover symbol" hint="Drawn on the cover when there is no cover image." {...register("symbol")}>
            <option value="">None</option>
            {productSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </SelectField>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-5 p-6">
        <h2 className="text-base font-semibold">Who it&apos;s for and what&apos;s included</h2>
        <TextAreaField label="Who it's for" hint="Optional." {...register("forWho")} />
        <div>
          <p className="text-sm font-medium">What the buyer gets</p>
          <p className="mt-1 text-xs text-soft-white/60">One item per line. At least one is needed.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {included.fields.map((field, index) => (
              <li key={field.id} className="flex items-end gap-3">
                <div className="flex-1">
                  <TextField label={`Item ${index + 1}`} {...register(`included.${index}.text` as const)} />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mb-1"
                  onClick={() => included.remove(index)}
                  aria-label={`Remove item ${index + 1}`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          {!includedLines.some((line) => line.text.trim()) && messageAt(errors.included) && (
            <p className="mt-2 text-xs text-danger">{messageAt(errors.included)}</p>
          )}
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => included.append({ text: "" })}>
            Add item
          </Button>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-5 p-6">
        <h2 className="text-base font-semibold">Images</h2>
        <Controller
          control={control}
          name="coverImageUrl"
          render={({ field }) => (
            <ImageField
              label="Cover image"
              value={field.value}
              onChange={field.onChange}
              error={errors.coverImageUrl?.message}
              hint="Shown on cards and at the top of the page. Optional: without it the cover symbol is drawn."
            />
          )}
        />
        <div>
          <p className="text-sm font-medium">Gallery</p>
          <p className="mt-1 text-xs text-soft-white/60">Up to 10 images, shown in this order.</p>
          {gallery.fields.length > 0 && (
            <SortableList
              className="mt-3 flex flex-col gap-3"
              items={gallery.fields}
              getId={(field) => field.id}
              getLabel={(_, index) => `gallery image ${index + 1}`}
              onMove={(from, to) => gallery.move(from, to)}
              renderItem={(_, controls) => (
                <div className="rounded-xl border border-soft-white/10 bg-void-black p-3">
                  <div className="flex items-center gap-2">
                    {controls.handle}
                    <span className="flex-1 text-sm font-medium">Image {controls.index + 1}</span>
                    {controls.buttons}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => gallery.remove(controls.index)}
                      aria-label={`Remove gallery image ${controls.index + 1}`}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Controller
                      control={control}
                      name={`gallery.${controls.index}.url` as const}
                      render={({ field }) => (
                        <ImageField
                          label={`Gallery image ${controls.index + 1}`}
                          value={field.value}
                          onChange={field.onChange}
                          error={errors.gallery?.[controls.index]?.url?.message}
                        />
                      )}
                    />
                  </div>
                </div>
              )}
            />
          )}
          {messageAt(errors.gallery) && <p className="mt-2 text-xs text-danger">{messageAt(errors.gallery)}</p>}
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            disabled={gallery.fields.length >= 10}
            onClick={() => gallery.append({ url: "" })}
          >
            Add gallery image
          </Button>
        </div>
      </Panel>

      <SectionsEditor control={control} register={register} errors={errors} sections={sections} />

      <Panel className="flex flex-col gap-4 p-6">
        <h2 className="text-base font-semibold">Product file</h2>
        <p className="text-sm text-soft-white/70">
          The file the buyer receives. It is stored privately and is never public; nothing serves it until checkout
          exists.
        </p>
        <Controller
          control={control}
          name="file"
          render={({ field }) => <ProductFileField value={field.value} onChange={field.onChange} />}
        />
      </Panel>

      <Panel className="flex flex-col gap-4 p-6">
        <CheckboxField label="Featured product" hint="Highlighted on the Vault page." {...register("isFeatured")} />
        <CheckboxField label="Popular choice" hint="Listed under Popular Choices." {...register("isPopular")} />
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          {product ? "Save changes" : "Create product"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/vault/products")} disabled={isSubmitting}>
          {product ? "Back to products" : "Cancel"}
        </Button>
      </div>
      {!product && <p className="text-xs text-soft-white/60">New products start as drafts. Publish from the next screen.</p>}
    </form>
  );
}
