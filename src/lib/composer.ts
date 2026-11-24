import type { FrameConfig, PhotoSlot } from '../data/frames';

export type Filter = 'normal' | 'bw' | 'vintage';
export type CanvasKind = 'strip' | 'portrait' | 'story';
const SIZE = { strip: [591, 1772], portrait: [1080, 1350], story: [1080, 1920] } as const;

export const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source;
});

function cover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, iw: number, ih: number, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / iw, h / ih); const dw = iw * scale; const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function clipSlot(ctx: CanvasRenderingContext2D, slot: PhotoSlot) {
  ctx.beginPath();
  if (slot.shape === 'ellipse') ctx.ellipse(slot.x + slot.width / 2, slot.y + slot.height / 2, slot.width / 2, slot.height / 2, 0, 0, Math.PI * 2);
  else ctx.rect(slot.x, slot.y, slot.width, slot.height);
  ctx.clip();
}
function drawStrip(ctx: CanvasRenderingContext2D, frame: FrameConfig, photos: HTMLImageElement[], filter: Filter) {
  frame.slots.forEach((slot, i) => {
    const photo = photos[i]; if (!photo) return;
    ctx.save(); clipSlot(ctx, slot);
    if (filter === 'bw') ctx.filter = 'grayscale(1) contrast(1.05)';
    if (filter === 'vintage') ctx.filter = 'sepia(.42) saturate(.78) contrast(.92) brightness(1.08)';
    cover(ctx, photo, photo.naturalWidth, photo.naturalHeight, slot.x, slot.y, slot.width, slot.height);
    ctx.restore();
  });
}

export async function renderStrip(frame: FrameConfig, photoSources: string[], filter: Filter, debug = false) {
  const [overlay, ...photos] = await Promise.all([loadImage(frame.image), ...photoSources.map(loadImage)]);
  const canvas = document.createElement('canvas'); canvas.width = 591; canvas.height = 1772;
  const ctx = canvas.getContext('2d')!;
  drawStrip(ctx, frame, photos, filter); ctx.drawImage(overlay, 0, 0, 591, 1772);
  if (debug) {
    ctx.save(); ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 3;
    frame.slots.forEach((slot, i) => { ctx.beginPath(); slot.shape === 'ellipse' ? ctx.ellipse(slot.x + slot.width / 2, slot.y + slot.height / 2, slot.width / 2, slot.height / 2, 0, 0, Math.PI * 2) : ctx.rect(slot.x, slot.y, slot.width, slot.height); ctx.stroke(); ctx.fillStyle = '#00d4ff'; ctx.font = 'bold 28px Arial'; ctx.fillText(String(i + 1), slot.x + 8, slot.y + 32); }); ctx.restore();
  }
  return canvas;
}

export async function renderFinal(frame: FrameConfig, photoSources: string[], filter: Filter, kind: CanvasKind, paper?: string, debug = false) {
  const strip = await renderStrip(frame, photoSources, filter, debug);
  if (kind === 'strip') return strip;
  const [width, height] = SIZE[kind]; const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d')!;
  if (paper) { const image = await loadImage(paper); cover(ctx, image, image.naturalWidth, image.naturalHeight, 0, 0, width, height); }
  else { ctx.fillStyle = '#f5eae1'; ctx.fillRect(0, 0, width, height); }
  const maxH = height * .78, maxW = width * .56, scale = Math.min(maxW / 591, maxH / 1772);
  const sw = 591 * scale, sh = 1772 * scale; ctx.save(); ctx.shadowColor = 'rgba(74,37,28,.24)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 13; ctx.drawImage(strip, (width - sw) / 2, (height - sh) / 2, sw, sh); ctx.restore();
  return canvas;
}

export const canvasDimensions = (kind: CanvasKind) => SIZE[kind];
