"use client";

import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { useId } from "react";

interface RichTextEditorProps {
  label: string;
  /** The text as Markdown. Plain text written before this editor existed is valid Markdown too. */
  value: string;
  onChange: (markdown: string) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Height of the writing area, as a Tailwind min-height class. */
  minHeight?: string;
}

function ToolButton({
  label,
  icon: Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the selection in the editor when a toolbar button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors disabled:opacity-35 motion-reduce:transition-none ${
        active ? "bg-electric-indigo/30 text-soft-white" : "text-soft-white/70 hover:bg-soft-white/10 hover:text-soft-white"
      }`}
    >
      <Icon aria-hidden strokeWidth={1.75} className="size-4" />
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  // The toolbar re-renders when the selection changes so the active buttons stay right.
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      bullets: current.isActive("bulletList"),
      numbers: current.isActive("orderedList"),
      quote: current.isActive("blockquote"),
      link: current.isActive("link"),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address (https://…)", previous ?? "https://");
    if (url === null) return;
    const address = url.trim();
    if (!address) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^(https?:\/\/|mailto:)/i.test(address)) {
      window.alert("The link must start with https://, http:// or mailto:");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: address }).run();
  }

  const chain = () => editor.chain().focus();
  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-soft-white/15 p-1.5">
      <ToolButton label="Bold" icon={Bold} active={state.bold} onClick={() => chain().toggleBold().run()} />
      <ToolButton label="Italic" icon={Italic} active={state.italic} onClick={() => chain().toggleItalic().run()} />
      <span aria-hidden className="mx-1 h-5 w-px bg-soft-white/15" />
      <ToolButton label="Heading" icon={Heading2} active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <ToolButton label="Subheading" icon={Heading3} active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      <span aria-hidden className="mx-1 h-5 w-px bg-soft-white/15" />
      <ToolButton label="Bulleted list" icon={List} active={state.bullets} onClick={() => chain().toggleBulletList().run()} />
      <ToolButton label="Numbered list" icon={ListOrdered} active={state.numbers} onClick={() => chain().toggleOrderedList().run()} />
      <ToolButton label="Quote" icon={Quote} active={state.quote} onClick={() => chain().toggleBlockquote().run()} />
      <span aria-hidden className="mx-1 h-5 w-px bg-soft-white/15" />
      <ToolButton label="Add link" icon={Link2} active={state.link} onClick={setLink} />
      <ToolButton
        label="Remove link"
        icon={Unlink}
        disabled={!state.link}
        onClick={() => chain().extendMarkRange("link").unsetLink().run()}
      />
      <span aria-hidden className="mx-1 h-5 w-px bg-soft-white/15" />
      <ToolButton label="Undo" icon={Undo2} disabled={!state.canUndo} onClick={() => chain().undo().run()} />
      <ToolButton label="Redo" icon={Redo2} disabled={!state.canRedo} onClick={() => chain().redo().run()} />
    </div>
  );
}

/**
 * The portal's rich text field: headings, bold, italic, lists, quotes and links.
 * It reads and writes Markdown, so the website can show it safely (no raw HTML).
 */
export default function RichTextEditor({
  label,
  value,
  onChange,
  required,
  hint,
  error,
  minHeight = "min-h-64",
}: RichTextEditorProps) {
  const id = useId();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Not part of the Markdown the website understands.
        underline: false,
        strike: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow" } },
      }),
      Markdown,
    ],
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        class: `rich-text ${minHeight} px-4 py-3 text-sm text-soft-white focus:outline-none`,
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getMarkdown()),
  });

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-soft-white"
        onClick={() => editor?.commands.focus()}
      >
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      <div
        className={`overflow-hidden rounded-lg border bg-void-black transition-colors focus-within:border-electric-indigo ${
          error ? "border-danger/70" : "border-soft-white/15 hover:border-soft-white/30"
        }`}
      >
        {editor && <Toolbar editor={editor} />}
        {/* Long text scrolls inside the box; the toolbar above stays in view. */}
        <div className="max-h-[32rem] overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
      {hint && !error && <p className="text-xs text-soft-white/60">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
