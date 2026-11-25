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
function applyPhotoFilter(ctx: CanvasRenderingContext2D, width: number, height: number, filter: Filter) {
  if (filter === 'normal') return;
  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index]; const green = data[index + 1]; const blue = data[index + 2];
    if (filter === 'bw') {
      // Luminance keeps faces and highlights natural instead of a flat desaturation.
      const luminance = Math.round(red * .299 + green * .587 + blue * .114);
      data[index] = luminance; data[index + 1] = luminance; data[index + 2] = luminance;
    } else {
      // Warm the image, soften contrast, then lift it slightly with a cream fade.
      const warmRed = Math.min(255, red * .78 + green * .18 + 34);
      const warmGreen = Math.min(255, red * .13 + green * .70 + 17);
      const warmBlue = Math.min(255, green * .14 + blue * .56 + 8);
      data[index] = Math.round(warmRed * .9 + 245 * .1);
      data[index + 1] = Math.round(warmGreen * .9 + 234 * .1);
      data[index + 2] = Math.round(warmBlue * .9 + 225 * .1);
    }
  }
  ctx.putImageData(pixels, 0, 0);
}
function drawStrip(ctx: CanvasRenderingContext2D, frame: FrameConfig, photos: HTMLImageElement[], filter: Filter) {
  frame.slots.forEach((slot, i) => {
    const photo = photos[i]; if (!photo) return;
    // Render and transform each capture on its own temporary layer. This avoids
    // browser-specific CanvasRenderingContext2D.filter behavior and guarantees
    // that frame artwork, papers, and decorations are never filtered.
    const layer = document.createElement('canvas'); layer.width = Math.ceil(slot.width); layer.height = Math.ceil(slot.height);
    const layerContext = layer.getContext('2d')!;
    cover(layerContext, photo, photo.naturalWidth, photo.naturalHeight, 0, 0, layer.width, layer.height);
    applyPhotoFilter(layerContext, layer.width, layer.height, filter);
    ctx.save(); clipSlot(ctx, slot);
    ctx.drawImage(layer, slot.x, slot.y, slot.width, slot.height);
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

export type SaveResult = { mode: 'shared' | 'downloaded'; message: string };

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export async function prepareCanvas(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('The PNG could not be created.')), 'image/png'));
  return new File([blob], filename, { type: 'image/png' });
}

export function downloadFile(file: File): SaveResult {
  const url = URL.createObjectURL(file); const link = document.createElement('a');
  link.href = url; link.download = file.name; link.style.display = 'none'; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  return { mode: 'downloaded', message: isIOS() ? 'Download started. Check Safari Downloads in Files; if the image opens, use Share to save it.' : 'PNG download started. Look in your Downloads folder.' };
}

export function savePrepared(file: File): Promise<SaveResult> {
  if (isIOS() && navigator.share && navigator.canShare?.({ files: [file] })) {
    // Invoke share synchronously inside the user's tap, before any await.
    return navigator.share({ files: [file], title: 'Gici Studio photo' }).then(() => ({ mode: 'shared', message: 'Share complete. If you chose Save Image, look in Photos; if you chose Save to Files, look in Files.' }));
  }
  return Promise.resolve(downloadFile(file));
}
