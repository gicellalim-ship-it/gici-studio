import { useEffect, useRef } from 'react';
import type { CanvasKind, Filter } from '../lib/composer';
import { renderFinal } from '../lib/composer';
import type { FrameConfig } from '../data/frames';

export function CanvasPreview({ frame, photos, filter, kind, paper, debug, className = '' }: { frame: FrameConfig; photos: string[]; filter: Filter; kind: CanvasKind; paper?: string; debug?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { let alive = true; renderFinal(frame, photos, filter, kind, paper, debug).then((output) => { if (!alive || !ref.current) return; const target = ref.current; target.width = output.width; target.height = output.height; target.getContext('2d')!.drawImage(output, 0, 0); }).catch(console.error); return () => { alive = false; }; }, [frame, photos, filter, kind, paper, debug]);
  return <canvas ref={ref} className={className} aria-label="Photostrip preview" />;
}
