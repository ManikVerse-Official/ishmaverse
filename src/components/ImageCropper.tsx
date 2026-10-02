import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X, ZoomIn, Move, RotateCcw, Loader2 } from 'lucide-react';

/** Visible crop square (px). Keeps the exported photo a clean 1:1 frame. */
const CROP_SIZE = 288;
/** Exported image size (px). Large enough to stay crisp on retina screens. */
const OUTPUT_SIZE = 800;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export interface CropResult {
  /** Ready-to-display JPEG data URL (used for the on-card preview). */
  dataUrl: string;
  /** File wrapping the same cropped JPEG (used for upload). */
  file: File;
}

interface ImageCropperProps {
  /** Source image as a data URL or object URL. */
  src: string;
  onCancel: () => void;
  onApply: (result: CropResult) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Interactive crop / pan tool shown after a photo is chosen for a greeting.
 *
 * Without it the card's fixed aspect ratio cut faces off. Here the sender drags
 * the photo to pan, zooms with the slider or the mouse wheel, and confirms the
 * exact visible square — the same idea as cropping a profile picture.
 */
export const ImageCropper: React.FC<ImageCropperProps> = ({ src, onCancel, onApply }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  // Cover scale = the smallest scale that fills the square without gaps.
  const coverScale =
    natural.width && natural.height
      ? Math.max(CROP_SIZE / natural.width, CROP_SIZE / natural.height)
      : 1;
  const displayScale = coverScale * zoom;
  const drawWidth = natural.width * displayScale;
  const drawHeight = natural.height * displayScale;

  const maxOffsetX = Math.max(0, (drawWidth - CROP_SIZE) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - CROP_SIZE) / 2);

  const clampedX = clamp(offset.x, -maxOffsetX, maxOffsetX);
  const clampedY = clamp(offset.y, -maxOffsetY, maxOffsetY);

  // When the image loads, start centred and full-bleed.
  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  // Re-centre any overflow when the zoom changes so the frame never shows a gap.
  useEffect(() => {
    setOffset((prev) => ({
      x: clamp(prev.x, -maxOffsetX, maxOffsetX),
      y: clamp(prev.y, -maxOffsetY, maxOffsetY),
    }));
  }, [maxOffsetX, maxOffsetY]);

  // Wheel-to-zoom. Attached natively so preventDefault works (React's onWheel
  // is passive at the root and cannot stop the page scrolling).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((prev) =>
        clamp(Number((prev - event.deltaY * 0.0015).toFixed(3)), MIN_ZOOM, MAX_ZOOM),
      );
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!natural.width) return;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, ox: clampedX, oy: clampedY };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: clamp(drag.ox + (event.clientX - drag.x), -maxOffsetX, maxOffsetX),
      y: clamp(drag.oy + (event.clientY - drag.y), -maxOffsetY, maxOffsetY),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const reset = () => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  const apply = useCallback(() => {
    const img = imgRef.current;
    const ctxSize = CROP_SIZE;
    if (!img || !natural.width) return;

    setBusy(true);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setBusy(false);
      return;
    }

    // Map the visible square back to the source image's pixel coordinates.
    const sx = natural.width / 2 - ctxSize / (2 * displayScale) - clampedX / displayScale;
    const sy = natural.height / 2 - ctxSize / (2 * displayScale) - clampedY / displayScale;
    const sw = ctxSize / displayScale;
    const sh = ctxSize / displayScale;

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setBusy(false);
          return;
        }
        const file = new File([blob], 'greeting-photo.jpg', { type: 'image/jpeg' });
        onApply({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), file });
        setBusy(false);
      },
      'image/jpeg',
      0.92,
    );
  }, [clampedX, clampedY, displayScale, natural.width, natural.height, onApply]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-sm px-3 py-8">
      <div className="relative w-full max-w-md bg-gradient-to-br from-bg-dark-start to-bg-dark-end border border-neon-purple/50 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <h3 className="text-lg font-bold text-white">Adjust your photo</h3>
            <p className="text-xs text-gray-400">Drag to reposition · zoom to fit the face</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Cancel crop"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Crop stage */}
          <div className="flex justify-center">
            <div
              ref={stageRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="relative overflow-hidden rounded-xl border border-neon-purple/40 bg-black/60 cursor-grab active:cursor-grabbing touch-none select-none"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
            >
              <img
                ref={imgRef}
                src={src}
                alt="Crop preview"
                onLoad={handleImgLoad}
                draggable={false}
                className="absolute max-w-none pointer-events-none select-none"
                style={{
                  width: drawWidth || CROP_SIZE,
                  height: drawHeight || CROP_SIZE,
                  left: (CROP_SIZE - drawWidth) / 2 + clampedX,
                  top: (CROP_SIZE - drawHeight) / 2 + clampedY,
                }}
              />

              {/* Rule-of-thirds guides */}
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {[1, 2].map((i) => (
                  <span
                    key={`v${i}`}
                    className="absolute top-0 bottom-0 w-px bg-white/25"
                    style={{ left: `${(i * 100) / 3}%` }}
                  />
                ))}
                {[1, 2].map((i) => (
                  <span
                    key={`h${i}`}
                    className="absolute left-0 right-0 h-px bg-white/25"
                    style={{ top: `${(i * 100) / 3}%` }}
                  />
                ))}
              </div>

              {!natural.width && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-neon-purple animate-spin" />
                </div>
              )}

              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                <Move className="w-3 h-3" /> Drag to move
              </span>
            </div>
          </div>

          {/* Zoom control */}
          <label className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-neon-purple shrink-0" />
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="flex-1 accent-[#8b5cf6]"
              aria-label="Zoom"
            />
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-300 hover:text-white transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </label>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-5 py-3 rounded-xl border border-gray-700 text-gray-300 font-semibold hover:border-gray-500 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={busy || !natural.width}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neon-purple text-white font-semibold hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Use this crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
