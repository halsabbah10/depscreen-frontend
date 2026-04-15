/**
 * AvatarCropModal — crop + zoom overlay for profile-picture uploads.
 *
 * Matches the UX of Instagram / WhatsApp / LinkedIn: pick a file, preview
 * it with a circular crop viewport, pan by dragging, zoom with pinch or a
 * slider, save. The cropped region is rendered to a canvas, converted to
 * a JPEG blob, and handed back to the caller for upload.
 *
 * Dialog semantics: role="dialog" + aria-modal, Escape closes, body scroll
 * locked while open, initial focus on the zoom slider. Animation via
 * framer-motion to match the rest of the app.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { motion } from 'framer-motion'
import { X, ZoomOut, ZoomIn } from 'lucide-react'
import { BreathingDot } from './BreathingCircle'

interface AvatarCropModalProps {
  file: File
  onClose: () => void
  onConfirm: (blob: Blob) => Promise<void>
}

const OUTPUT_SIZE = 1024 // render the crop into a 1024×1024 JPEG; backend will downscale to 512.

export function AvatarCropModal({ file, onClose, onConfirm }: AvatarCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const zoomInputRef = useRef<HTMLInputElement>(null)

  // Read the file into a data URL for the Cropper. We keep it in state rather
  // than URL.createObjectURL because data URLs survive React re-renders without
  // the revocation ceremony, and the overhead is negligible at avatar sizes.
  useEffect(() => {
    let cancelled = false
    const reader = new FileReader()
    reader.onload = () => {
      if (!cancelled) setImageSrc(reader.result as string)
    }
    reader.readAsDataURL(file)
    return () => {
      cancelled = true
    }
  }, [file])

  // Escape closes, body scroll-locked while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus the zoom slider after the mount animation settles
    const focusTimer = setTimeout(() => zoomInputRef.current?.focus(), 150)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(focusTimer)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, submitting])

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc || submitting) return
    setSubmitting(true)
    try {
      const blob = await renderCrop(imageSrc, croppedAreaPixels)
      await onConfirm(blob)
    } finally {
      // Parent decides whether to close on success; we only lift submitting
      // so if the upload failed the user can retry without re-picking.
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !submitting && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id="crop-title" className="font-display text-lg text-foreground font-light">
            Position your picture
          </h2>
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            aria-label="Close"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop area — react-easy-crop needs a positioned container with explicit height */}
        <div className="relative w-full bg-muted" style={{ aspectRatio: '1 / 1' }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition
              style={{
                containerStyle: { backgroundColor: 'hsl(35 12% 88%)' },
                cropAreaStyle: {
                  border: '2px solid hsl(175 45% 40%)',
                  boxShadow: '0 0 0 9999px hsl(220 15% 8% / 0.55)',
                },
              }}
            />
          )}
        </div>

        {/* Zoom slider */}
        <div className="px-6 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <ZoomOut
              className="w-4 h-4 text-muted-foreground shrink-0"
              aria-hidden
            />
            <input
              ref={zoomInputRef}
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              disabled={submitting}
              className="flex-1 accent-primary cursor-pointer disabled:opacity-50"
            />
            <ZoomIn
              className="w-4 h-4 text-muted-foreground shrink-0"
              aria-hidden
            />
          </div>
          <p className="text-[11px] text-muted-foreground font-body mt-2 leading-relaxed">
            Drag to reposition · Pinch or slide to zoom
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="text-sm font-body text-muted-foreground hover:text-foreground px-4 py-2 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || !croppedAreaPixels}
            className="btn-primary text-sm min-w-[90px] justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <BreathingDot className="w-1.5 h-1.5" />
                Saving…
              </span>
            ) : (
              'Save picture'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Canvas rendering ──────────────────────────────────────────────────────────

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = src
  })
}

/**
 * Take the user's crop selection and render it into a square JPEG blob at
 * OUTPUT_SIZE × OUTPUT_SIZE. The backend re-encodes to WebP at 512, so this
 * is deliberately larger than final to preserve detail during the server
 * round-trip. JPEG (not PNG) because the photo content is almost always
 * lossy-friendly and JPEG saves ~4× the bytes.
 */
async function renderCrop(src: string, area: Area): Promise<Blob> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Draw the cropped region of the source image into a 1024×1024 square.
  // `area` is in source-pixel coordinates thanks to react-easy-crop.
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Canvas export failed'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      0.92,
    )
  })
}
