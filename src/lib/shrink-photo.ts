import { SUPPORT_EMAIL } from "@/lib/support-contact"

/*
 * Phone photos are often several MB, more than an upload allows or a phone's
 * data plan likes. These helpers shrink a photo in the browser to a JPEG
 * before it's sent. If the browser can't, the original file is used.
 */

export interface ShrinkOptions {
  /** The longest side, in pixels. */
  maxSide: number
  /** JPEG quality, 0 to 1. */
  quality: number
  /** A photo already this small and within maxSide is sent as it is. */
  keepUnder: number
}

/** Vehicle condition photos: quick on mobile data. */
export const CONDITION_PHOTO: ShrinkOptions = { maxSide: 1600, quality: 0.82, keepUnder: 1_500_000 }

/** License, insurance and other documents: big and sharp enough to read every line. */
export const DOCUMENT_PHOTO: ShrinkOptions = { maxSide: 2400, quality: 0.88, keepUnder: 2_000_000 }

/** The server's limit for a driver document (photo or PDF). */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024

/** Shrinks a photo to a JPEG within the options; returns the original file when it can't. */
export async function shrinkPhoto(file: File, options: ShrinkOptions = CONDITION_PHOTO): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, options.maxSide / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < options.keepUnder) return file
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", options.quality))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" })
  } catch {
    return file
  }
}

const PHOTO_NAME = /\.(jpe?g|png|webp|heic|heif)$/i

/** A photo (shrunk before upload), as opposed to a PDF or another file. */
export function isPhotoFile(file: { name: string; type: string }): boolean {
  return file.type.startsWith("image/") || PHOTO_NAME.test(file.name)
}

/** What to do when a document is still over the limit, in plain English. */
export function documentTooLargeMessage(file: { name: string; type: string }): string {
  return isPhotoFile(file)
    ? `This photo is still larger than 5 MB after making it smaller. Take the photo again, a little further away, or upload a PDF under 5 MB. If it still won't upload, contact Suprah AI support at ${SUPPORT_EMAIL}.`
    : `This PDF is larger than 5 MB. Take a photo of the document instead (photos are made smaller automatically), or save a smaller PDF. If it still won't upload, contact Suprah AI support at ${SUPPORT_EMAIL}.`
}

/**
 * Gets a driver document ready to upload: photos are shrunk first, then the
 * size is checked. Returns the file to send, or what to tell the driver.
 */
export async function prepareDocumentFile(
  file: File,
  shrink: (file: File, options: ShrinkOptions) => Promise<File> = shrinkPhoto,
): Promise<{ file: File; error?: undefined } | { file?: undefined; error: string }> {
  const ready = isPhotoFile(file) ? await shrink(file, DOCUMENT_PHOTO) : file
  if (ready.size > MAX_DOCUMENT_BYTES) return { error: documentTooLargeMessage(file) }
  return { file: ready }
}
