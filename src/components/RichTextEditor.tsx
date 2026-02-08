import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Highlighter,
  Undo,
  Redo,
  Minus,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

const highlightColors = [
  { name: "Yellow", color: "#fef08a" },
  { name: "Green", color: "#bbf7d0" },
  { name: "Blue", color: "#bfdbfe" },
  { name: "Pink", color: "#fbcfe8" },
  { name: "Orange", color: "#fed7aa" },
  { name: "Purple", color: "#ddd6fe" },
];

const textColors = [
  { name: "Default", color: "" },
  { name: "Red", color: "#ef4444" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Green", color: "#22c55e" },
  { name: "Purple", color: "#8b5cf6" },
  { name: "Orange", color: "#f97316" },
];

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none",
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("rounded-md border", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
        {/* Undo/Redo */}
        <Toggle
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Toggle>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Headings */}
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 1 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 3 })}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Text Formatting */}
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("code")}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </Toggle>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive("highlight") && "bg-accent"
              )}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex flex-wrap gap-1">
              {highlightColors.map((item) => (
                <button
                  key={item.name}
                  className="h-6 w-6 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: item.color }}
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .toggleHighlight({ color: item.color })
                      .run()
                  }
                  title={item.name}
                />
              ))}
              <button
                className="h-6 w-6 rounded border bg-background hover:scale-110 transition-transform flex items-center justify-center text-xs"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                title="Remove highlight"
              >
                ✕
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title="Text Color"
            >
              <span className="text-sm font-medium">A</span>
              <div
                className="ml-1 h-1 w-4 rounded"
                style={{
                  backgroundColor:
                    editor.getAttributes("textStyle").color || "currentColor",
                }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex flex-wrap gap-1">
              {textColors.map((item) => (
                <button
                  key={item.name}
                  className={cn(
                    "h-6 w-6 rounded border hover:scale-110 transition-transform flex items-center justify-center",
                    !item.color && "bg-background"
                  )}
                  style={{ backgroundColor: item.color || undefined }}
                  onClick={() => {
                    if (item.color) {
                      editor.chain().focus().setColor(item.color).run();
                    } else {
                      editor.chain().focus().unsetColor().run();
                    }
                  }}
                  title={item.name}
                >
                  {!item.color && <span className="text-xs">Aa</span>}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Lists */}
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* Block elements */}
        <Toggle
          size="sm"
          pressed={editor.isActive("blockquote")}
          onPressedChange={() =>
            editor.chain().focus().toggleBlockquote().run()
          }
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("codeBlock")}
          onPressedChange={() =>
            editor.chain().focus().toggleCodeBlock().run()
          }
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}

// Component to render rich text content (for viewing)
export function RichTextContent({ content }: { content: string }) {
  return (
    <div
      className="rich-text-content prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
