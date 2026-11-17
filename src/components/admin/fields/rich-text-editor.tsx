"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/admin/upload";
import { cn, errorMessage } from "@/lib/utils";

export function RichTextEditor({
  value,
  onChange,
  folder = "content",
  invalid,
  placeholder = "Start writing…",
}: {
  value: string;
  onChange: (html: string) => void;
  folder?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:font-display prose-a:text-primary prose-img:rounded-xl px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Sync when the form is reset with a different record.
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(value === "" && editor.isEmpty)) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15",
        invalid && "border-red-500",
      )}
    >
      {editor ? <Toolbar editor={editor} folder={folder} /> : <div className="h-11 border-b border-border bg-muted/40" />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, folder }: { editor: Editor; folder: string }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove)", prev ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = async (file?: File) => {
    if (!file) return;
    const id = toast.loading("Uploading image…");
    try {
      const url = await uploadFile(file, folder, "image");
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      toast.success("Image inserted", { id });
    } catch (err) {
      toast.error(errorMessage(err), { id });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const btn = (label: string, Icon: React.ComponentType<{ className?: string }>, action: () => void, active = false, disabled = false) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40",
        active && "bg-primary/10 text-primary",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  const c = () => editor.chain().focus();
  return (
    <div className="flex gap-0.5 overflow-x-auto border-b border-border bg-muted/40 p-1 [scrollbar-width:thin]">
      {btn("Bold", Bold, () => c().toggleBold().run(), editor.isActive("bold"))}
      {btn("Italic", Italic, () => c().toggleItalic().run(), editor.isActive("italic"))}
      {btn("Strikethrough", Strikethrough, () => c().toggleStrike().run(), editor.isActive("strike"))}
      <span className="mx-1 w-px shrink-0 bg-border" />
      {btn("Heading 2", Heading2, () => c().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
      {btn("Heading 3", Heading3, () => c().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
      {btn("Bullet list", List, () => c().toggleBulletList().run(), editor.isActive("bulletList"))}
      {btn("Numbered list", ListOrdered, () => c().toggleOrderedList().run(), editor.isActive("orderedList"))}
      {btn("Quote", Quote, () => c().toggleBlockquote().run(), editor.isActive("blockquote"))}
      {btn("Code block", Code2, () => c().toggleCodeBlock().run(), editor.isActive("codeBlock"))}
      {btn("Divider", Minus, () => c().setHorizontalRule().run())}
      <span className="mx-1 w-px shrink-0 bg-border" />
      {btn("Link", Link2, setLink, editor.isActive("link"))}
      {btn("Insert image", ImagePlus, () => fileRef.current?.click())}
      <span className="mx-1 w-px shrink-0 bg-border" />
      {btn("Undo", Undo2, () => c().undo().run(), false, !editor.can().undo())}
      {btn("Redo", Redo2, () => c().redo().run(), false, !editor.can().redo())}
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => addImage(e.target.files?.[0])} />
    </div>
  );
}
