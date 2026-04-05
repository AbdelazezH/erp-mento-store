"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "px-1.5 py-1 rounded text-sm hover:bg-muted transition-colors",
        active && "bg-muted font-semibold"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Write something..." }),
    ],
    content: value ?? "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[120px] px-3 py-2 prose prose-sm max-w-none",
      },
    },
  });

  // Sync external value changes (e.g. when editing existing product)
  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn("border rounded-md overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b bg-background">
        <ToolbarButton
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↪
        </ToolbarButton>

        <span className="w-px bg-border mx-1" />

        <ToolbarButton
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>

        <span className="w-px bg-border mx-1" />

        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolbarButton>
        <ToolbarButton
          title="Code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          {"</>"}
        </ToolbarButton>

        <span className="w-px bg-border mx-1" />

        <ToolbarButton
          title="Ordered List"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          title="Bullet List"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          "
        </ToolbarButton>

        <span className="w-px bg-border mx-1" />

        <ToolbarButton
          title="Align Left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          ≡
        </ToolbarButton>
        <ToolbarButton
          title="Align Center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          ☰
        </ToolbarButton>
        <ToolbarButton
          title="Align Right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          ≣
        </ToolbarButton>

        <span className="w-px bg-border mx-1" />

        <ToolbarButton
          title="LTR"
          onClick={() => {
            const el = editor.view.dom as HTMLElement;
            el.style.direction = "ltr";
          }}
        >
          LTR
        </ToolbarButton>
        <ToolbarButton
          title="RTL"
          onClick={() => {
            const el = editor.view.dom as HTMLElement;
            el.style.direction = "rtl";
          }}
        >
          RTL
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
