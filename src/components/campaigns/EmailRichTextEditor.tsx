"use client"

import * as React from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  ImageIcon,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const EMAIL_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif"
export const EMAIL_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = EMAIL_IMAGE_ACCEPT.split(",")

export function emailImageFilesFrom(list: FileList | File[] | null | undefined): File[] {
  return Array.from(list || []).filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type))
}

export function emailImageSizeError(file: File): string | null {
  return file.size > EMAIL_IMAGE_MAX_BYTES ? `${file.name} is larger than 5 MB. Please choose a smaller image.` : null
}

const CONTENT_CLASSES = cn(
  "[&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-xl [&_h1]:font-bold",
  "[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:font-bold",
  "[&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-bold",
  "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-0.5",
  "[&_strong]:font-bold [&_em]:italic [&_u]:underline",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_img]:my-2 [&_img]:block [&_img]:max-w-full [&_img]:rounded-md",
)

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
      )}
    >
      {children}
    </button>
  )
}

function Toolbar({
  editor,
  onPickImage,
  imageUploading,
}: {
  editor: Editor
  onPickImage?: () => void
  imageUploading: boolean
}) {
  const setLink = React.useCallback(() => {
    const previousUrl = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL", previousUrl || "https://")
    if (url === null) return
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run()
  }, [editor])

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/20 px-1.5 py-1">
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton label="Add link" active={editor.isActive("link")} onClick={setLink}>
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Remove link" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}>
        <Unlink className="h-3.5 w-3.5" />
      </ToolbarButton>
      {onPickImage && (
        <>
          <span className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton label="Insert image from your device" disabled={imageUploading} onClick={onPickImage}>
            {imageUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
          </ToolbarButton>
        </>
      )}
    </div>
  )
}

export function describeEmailImageUploadError(error: unknown): string {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error instanceof Error ? error.message : "")
  return message || "The image could not be uploaded. Please try again."
}

export function EmailRichTextEditor({
  value,
  onChange,
  placeholder = "Write your message…",
  onUploadImage,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  onUploadImage?: (file: File) => Promise<string>
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const editorRef = React.useRef<Editor | null>(null)
  const uploadRef = React.useRef(onUploadImage)
  const [uploadingCount, setUploadingCount] = React.useState(0)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    uploadRef.current = onUploadImage
  }, [onUploadImage])

  const insertImageFiles = React.useCallback(async (files: File[], position?: number) => {
    const upload = uploadRef.current
    if (!upload || !files.length) return
    setUploadError(null)
    for (const file of files) {
      const sizeError = emailImageSizeError(file)
      if (sizeError) {
        setUploadError(sizeError)
        continue
      }
      setUploadingCount((count) => count + 1)
      try {
        const src = await upload(file)
        const current = editorRef.current
        if (!current) continue
        if (typeof position === "number") {
          current.chain().focus().insertContentAt(position, { type: "image", attrs: { src } }).run()
        } else {
          current.chain().focus().setImage({ src }).run()
        }
      } catch (error) {
        setUploadError(describeEmailImageUploadError(error))
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1))
      }
    }
  }, [])

  const insertImageFilesRef = React.useRef(insertImageFiles)
  React.useEffect(() => {
    insertImageFilesRef.current = insertImageFiles
  }, [insertImageFiles])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow" } }),
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          "min-h-32 max-h-80 overflow-y-auto px-3 py-2.5 text-sm text-foreground outline-none",
          "[&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-muted-foreground [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          CONTENT_CLASSES,
        ),
      },
      handlePaste: (_view, event) => {
        if (!uploadRef.current) return false
        const files = emailImageFilesFrom(event.clipboardData?.files)
        if (!files.length) return false
        event.preventDefault()
        void insertImageFilesRef.current(files)
        return true
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !uploadRef.current) return false
        const files = emailImageFilesFrom(event.dataTransfer?.files)
        if (!files.length) return false
        event.preventDefault()
        const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        void insertImageFilesRef.current(files, position)
        return true
      },
    },
  })

  React.useEffect(() => {
    editorRef.current = editor
  }, [editor])

  React.useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) editor.commands.setContent(value || "", { emitUpdate: false })
  }, [value, editor])

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = emailImageFilesFrom(event.target.files)
    event.target.value = ""
    if (!files.length) {
      setUploadError("Please choose a JPG, PNG, WEBP, or GIF image.")
      return
    }
    void insertImageFiles(files)
  }

  if (!editor) {
    return <div className="h-40 animate-pulse rounded-md border bg-muted/30" />
  }

  const uploading = uploadingCount > 0

  return (
    <div className="space-y-1.5">
      <div className="overflow-hidden rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <Toolbar
          editor={editor}
          onPickImage={onUploadImage ? () => fileInputRef.current?.click() : undefined}
          imageUploading={uploading}
        />
        <EditorContent editor={editor} />
      </div>
      {onUploadImage && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={EMAIL_IMAGE_ACCEPT}
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <p className="text-[11px] text-muted-foreground">
            {uploading
              ? "Uploading image…"
              : "Add images from your device with the image button, or paste/drag them in. JPG, PNG, WEBP, or GIF up to 5 MB."}
          </p>
          {uploadError && <p className="text-[11px] text-red-600 dark:text-red-400">{uploadError}</p>}
        </>
      )}
    </div>
  )
}

export function emailRichTextToPreviewClassName(): string {
  return CONTENT_CLASSES
}
