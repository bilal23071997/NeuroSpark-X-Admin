"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

/** What a row gets to draw its own reorder controls. */
export interface RowControls {
  index: number;
  count: number;
  /** The drag handle: drag with a pointer, or press Space and use the arrow keys. */
  handle: ReactNode;
  /** The accessible fallback: plain up/down buttons. */
  buttons: ReactNode;
}

function Grip() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

function Arrow({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const iconButton =
  "rounded-md p-1.5 text-soft-white/70 hover:bg-soft-white/10 hover:text-soft-white disabled:cursor-not-allowed disabled:opacity-30";

function Row({
  id,
  index,
  count,
  label,
  onMove,
  children,
}: {
  id: UniqueIdentifier;
  index: number;
  count: number;
  label: string;
  onMove: (from: number, to: number) => void;
  children: (controls: RowControls) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={`Drag to reorder ${label}`}
      className={`${iconButton} cursor-grab touch-none active:cursor-grabbing`}
      {...attributes}
      {...listeners}
    >
      <Grip />
    </button>
  );

  const buttons = (
    <span className="inline-flex">
      <button
        type="button"
        className={iconButton}
        disabled={index === 0}
        aria-label={`Move ${label} up`}
        onClick={() => onMove(index, index - 1)}
      >
        <Arrow up />
      </button>
      <button
        type="button"
        className={iconButton}
        disabled={index === count - 1}
        aria-label={`Move ${label} down`}
        onClick={() => onMove(index, index + 1)}
      >
        <Arrow up={false} />
      </button>
    </span>
  );

  return (
    <li
      ref={setNodeRef}
      // The drag offset changes on every pointer move, so it can't be a class.
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-80 shadow-xl" : "relative"}
    >
      {children({ index, count, handle, buttons })}
    </li>
  );
}

/**
 * A list that can be reordered by dragging (pointer or keyboard) or with up/down
 * buttons. It never changes the data itself: `onMove(from, to)` tells the owner.
 */
export default function SortableList<T>({
  items,
  getId,
  getLabel,
  onMove,
  renderItem,
  className = "",
}: {
  items: T[];
  getId: (item: T, index: number) => string | number;
  /** Names a row for screen readers, e.g. "Section 2: FAQ". */
  getLabel: (item: T, index: number) => string;
  onMove: (from: number, to: number) => void;
  renderItem: (item: T, controls: RowControls) => ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);

  function indexOfId(id: UniqueIdentifier) {
    return ids.findIndex((candidate) => candidate === id);
  }

  function labelOf(id: UniqueIdentifier) {
    const index = indexOfId(id);
    return index === -1 ? "item" : getLabel(items[index], index);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onMove(indexOfId(active.id), indexOfId(over.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${labelOf(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over ? `${labelOf(active.id)} is over position ${indexOfId(over.id) + 1} of ${items.length}.` : undefined,
          onDragEnd: ({ active, over }) =>
            over ? `${labelOf(active.id)} was moved to position ${indexOfId(over.id) + 1} of ${items.length}.` : `${labelOf(active.id)} was dropped.`,
          onDragCancel: ({ active }) => `Moving ${labelOf(active.id)} was cancelled.`,
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item, index) => (
            <Row
              key={ids[index]}
              id={ids[index]}
              index={index}
              count={items.length}
              label={getLabel(item, index)}
              onMove={onMove}
            >
              {(controls) => renderItem(item, controls)}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
