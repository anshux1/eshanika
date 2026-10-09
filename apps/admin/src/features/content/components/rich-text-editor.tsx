"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@eshanika/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@eshanika/ui/components/tooltip";
import { cn } from "@eshanika/ui/lib/utils";
import {
  type Editor,
  EditorContent,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { useState } from "react";

// Same rule as the server sanitiser: site paths, https, mail, and phone links only.
const LINK_PATTERN = /^(\/(?!\/)|https:\/\/[^\s/]+|mailto:|tel:)/;

type RichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  invalid?: boolean;
};

export function RichTextEditor({
  id,
  value,
  onChange,
  invalid,
}: RichTextEditorProps) {
  const editor = useEditor({
    // Rendering waits for the browser, so server and client markup match.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        "aria-invalid": invalid ? "true" : "false",
        class:
          "prose prose-sm dark:prose-invert min-h-64 max-w-none px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) =>
      onChange(current.isEmpty ? "" : current.getHTML()),
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        invalid && "border-destructive",
      )}
    >
      {editor ? <Toolbar editor={editor} /> : <div className="h-10 border-b" />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linking, setLinking] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
      quote: current.isActive("blockquote"),
      link: current.isActive("link"),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const tools: Array<{
    label: string;
    icon: LucideIcon;
    active?: boolean;
    disabled?: boolean;
    run: () => void;
  }> = [
    {
      label: "Bold",
      icon: Bold,
      active: state.bold,
      run: () => chain().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: state.italic,
      run: () => chain().toggleItalic().run(),
    },
    {
      label: "Underline",
      icon: Underline,
      active: state.underline,
      run: () => chain().toggleUnderline().run(),
    },
    {
      label: "Heading",
      icon: Heading2,
      active: state.h2,
      run: () => chain().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Subheading",
      icon: Heading3,
      active: state.h3,
      run: () => chain().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Bulleted list",
      icon: List,
      active: state.bullet,
      run: () => chain().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      active: state.ordered,
      run: () => chain().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      icon: Quote,
      active: state.quote,
      run: () => chain().toggleBlockquote().run(),
    },
    {
      label: "Divider",
      icon: Minus,
      run: () => chain().setHorizontalRule().run(),
    },
    {
      label: "Link",
      icon: Link2,
      active: state.link,
      run: () => setLinking(true),
    },
    {
      label: "Undo",
      icon: Undo2,
      disabled: !state.canUndo,
      run: () => chain().undo().run(),
    },
    {
      label: "Redo",
      icon: Redo2,
      disabled: !state.canRedo,
      run: () => chain().redo().run(),
    },
  ];

  return (
    <div
      aria-label="Formatting"
      className="flex flex-wrap gap-0.5 border-b bg-muted/40 p-1"
      role="toolbar"
    >
      {tools.map((tool) => (
        <Tooltip key={tool.label}>
          <TooltipTrigger
            render={
              <Button
                aria-label={tool.label}
                aria-pressed={tool.active}
                className={cn(
                  tool.active && "bg-accent text-accent-foreground",
                )}
                disabled={tool.disabled}
                onClick={tool.run}
                size="icon-sm"
                type="button"
                variant="ghost"
              />
            }
          >
            <tool.icon aria-hidden />
          </TooltipTrigger>
          <TooltipContent>{tool.label}</TooltipContent>
        </Tooltip>
      ))}
      {linking ? (
        <LinkDialog
          current={editor.getAttributes("link").href as string | undefined}
          onClose={() => setLinking(false)}
          onSave={(href) => {
            if (href) chain().extendMarkRange("link").setLink({ href }).run();
            else chain().extendMarkRange("link").unsetLink().run();
            setLinking(false);
          }}
        />
      ) : null}
    </div>
  );
}

function LinkDialog({
  current,
  onSave,
  onClose,
}: {
  current: string | undefined;
  onSave: (href: string) => void;
  onClose: () => void;
}) {
  const [href, setHref] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const next = href.trim();
            if (next && !LINK_PATTERN.test(next)) {
              setError(
                "Use a path like /about, or a link starting with https://",
              );
              return;
            }
            onSave(next);
          }}
        >
          <DialogHeader>
            <DialogTitle>{current ? "Edit link" : "Add link"}</DialogTitle>
            <DialogDescription>
              Select text first, then link it. Leave empty to remove the link.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="link-href">Link</FieldLabel>
            <Input
              aria-invalid={!!error}
              autoFocus
              id="link-href"
              inputMode="url"
              onChange={(event) => setHref(event.target.value)}
              placeholder="/about or https://"
              value={href}
            />
            <FieldError errors={error ? [{ message: error }] : []} />
          </Field>
          <DialogFooter>
            <Button onClick={onClose} type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">Save link</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
