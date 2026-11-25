import { useEffect, useRef, useState } from 'react';
import { BACKGROUNDS, FRAMES, type FrameConfig } from './data/frames';
import { CanvasPreview } from './components/CanvasPreview';
import { renderFinal, prepareCanvas, savePrepared, downloadFile, type CanvasKind, type Filter } from './lib/composer';

type Screen = 'welcome' | 'frames' | 'camera' | 'preview' | 'decorate';
type Editing = { kind: CanvasKind; filter: Filter; paper: string };
type SaveStatus = { kind: 'success' | 'error'; text: string } | null;
const initialEditing: Editing = { kind: 'portrait', filter: 'normal', paper: BACKGROUNDS[0].image };

function Logo() { return <div className="logo" aria-label="gici studio">gici studio</div>; }
function Button({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`button ${className}`} {...props}>{children}</button>; }
function Back({ onClick, label = 'back' }: { onClick: () => void; label?: string }) { return <button className="back" onClick={onClick}>← {label}</button>; }

function Welcome({ start }: { start: () => void }) { return <main className="welcome screen"><div className="booth-lines" /><div className="eyebrow">—&nbsp; PHOTOBOOTH &nbsp;—</div><Logo /><p className="tagline">a little photobooth, just for you</p><div className="booth-illustration" aria-hidden="true"><div className="booth-side" /><div className="booth-door"><i /><i /><i /></div><div className="booth-stool" /></div><Button onClick={start}>click to start <b>→</b></Button><span className="tape tape-bottom" /></main> }

function FramePicker({ selected, choose, back, next }: { selected?: FrameConfig; choose: (f: FrameConfig) => void; back: () => void; next: () => void }) { return <main className="screen picker"><header><Back onClick={back} /><Logo /><span /></header><div className="taped-title">choose a frame</div><p className="hint">Pick a favourite. Your photos will fill its cut-out windows.</p><section className="frame-grid">{FRAMES.map((frame) => <button className={`frame-card ${selected?.id === frame.id ? 'selected' : ''}`} key={frame.id} onClick={() => choose(frame)}><span className="frame-thumb"><img src={frame.image} alt="" /></span><strong>{frame.name}</strong><small>{frame.photos} photos</small>{selected?.id === frame.id && <em>selected ✦</em>}</button>)}</section><div className="picker-actions"><span>{selected ? `${selected.photos} photos in this session` : 'Choose one of 7 custom frames'}</span><Button disabled={!selected} onClick={next}>continue →</Button></div></main> }

function Camera({ frame, done, back }: { frame: FrameConfig; done: (photos: string[]) => void; back: () => void }) {
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const [devices, setDevices] = useState<MediaDeviceInfo[]>([]); const [device, setDevice] = useState(''); const [error, setError] = useState(''); const [active, setActive] = useState(false); const [count, setCount] = useState<number | null>(null); const shots = useRef<string[]>([]); const [current, setCurrent] = useState(0);
  const session = useRef(false); const mounted = useRef(false); const timers = useRef<number[]>([]); const [captured, setCaptured] = useState(0); const [flash, setFlash] = useState(0);
  const cameraError = (cause: unknown) => {
    const name = cause instanceof DOMException ? cause.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access is blocked. In Safari, tap aA → Website Settings → Camera → Allow, then try again.';
    if (name === 'NotFoundError') return 'No camera was found on this device. Connect or enable a camera, then try again.';
    if (name === 'NotReadableError' || name === 'AbortError') return 'Your camera is busy. Close any other app or browser tab using it, then try again.';
    if (name === 'OverconstrainedError') return 'That camera is no longer available. We’ll switch back to the default camera.';
    return 'We could not start the camera. Check Safari camera permissions and try again.';
  };
  const connect = async (id = device, allowFallback = true): Promise<boolean> => {
    if (!window.isSecureContext) { setError('Camera access requires HTTPS. Open Gici Studio from a secure https:// address, then try again.'); return false; }
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera access is not supported in this browser. Please use an up-to-date Safari or Chrome browser.'); return false; }
    try {
      setError(''); stream.current?.getTracks().forEach((track) => track.stop());
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id } } : { facingMode: 'user' }, audio: false });
      stream.current = nextStream;
      if (video.current) { video.current.srcObject = nextStream; await video.current.play().catch(() => undefined); }
      const all = await navigator.mediaDevices.enumerateDevices(); setDevices(all.filter((item) => item.kind === 'videoinput'));
      return true;
    } catch (cause) {
      if (id && allowFallback && cause instanceof DOMException && cause.name === 'OverconstrainedError') { setDevice(''); return connect('', false); }
      setError(cameraError(cause)); return false;
    }
  };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; session.current = false; timers.current.forEach(window.clearTimeout); stream.current?.getTracks().forEach((track) => track.stop()); }; }, []);
  const later = (callback: () => void, delay: number) => { const timer = window.setTimeout(callback, delay); timers.current.push(timer); };
  const snap = () => { if (!session.current || !video.current) return; const v = video.current; const c = document.createElement('canvas'); c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720; c.getContext('2d')!.drawImage(v, 0, 0); shots.current = [...shots.current, c.toDataURL('image/jpeg', .96)]; const n = shots.current.length; setCurrent(n); setFlash(n); setCaptured(n); if (n >= frame.photos) later(() => { session.current = false; done(shots.current); }, 900); else later(() => { setCaptured(0); run(); }, 1000); };
  const run = () => { if (!session.current) return; let n = 3; setCount(n); const tick = () => { if (!session.current) return; n -= 1; if (n === 0) { setCount(null); snap(); } else { setCount(n); later(tick, 1000); } }; later(tick, 1000); };
  const start = async () => { if (session.current) return; session.current = true; setActive(true); const ready = await connect(); if (!mounted.current) { stream.current?.getTracks().forEach((track) => track.stop()); return; } if (!ready) { session.current = false; setActive(false); return; } shots.current = []; setCurrent(0); setCaptured(0); run(); };
  return <main className="screen camera"><header><Back onClick={back} label="choose a frame" /><Logo /><span /></header><div className="taped-title">get ready!</div><p className="hint">We’ll take {frame.photos} photos with a little pause between each one.</p><div className="camera-layout"><div className="video-wrap"><video ref={video} autoPlay playsInline muted /><div className="corner c1" /><div className="corner c2" /><div className="corner c3" /><div className="corner c4" />{count !== null && <div className="countdown">{count}</div>}{flash > 0 && <div key={flash} className="camera-flash" aria-hidden="true" />}{captured > 0 && <div className="capture-message" role="status">Photo {captured}/{frame.photos} captured!</div>}</div><aside className="camera-controls"><label>Camera<select disabled={active} value={device} onChange={(e) => { setDevice(e.target.value); void connect(e.target.value); }}><option value="">Built-in camera</option>{devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}</select></label>{error && <p className="error" role="alert">{error}</p>}<div className="progress"><span>Photo {Math.min(current + 1, frame.photos)} of {frame.photos}</span><i style={{ width: `${(current / frame.photos) * 100}%` }} /></div><Button onClick={() => void start()} disabled={active}>{active ? 'photo session in progress' : 'start photo session →'}</Button><small>Look at the lens, hold your pose, and we’ll do the rest.</small></aside></div></main>;
}

function SaveNotice({ status }: { status: SaveStatus }) { return status ? <p className={`save-message ${status.kind}`} role="status">{status.text}</p> : null; }
function usePrepared(frame: FrameConfig, photos: string[], filter: Filter, kind: CanvasKind, paper?: string, debug = false) {
  const [prepared, setPrepared] = useState<{ frame: FrameConfig; photos: string[]; filter: Filter; kind: CanvasKind; paper?: string; debug: boolean; file: File } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true; setPrepared(null); setFailed(false);
    const filename = `gici-studio-${kind === 'strip' ? 'photostrip' : kind}.png`;
    renderFinal(frame, photos, filter, kind, paper, debug).then((canvas) => prepareCanvas(canvas, filename))
      .then((file) => { if (current) setPrepared({ frame, photos, filter, kind, paper, debug, file }); })
      .catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [frame, photos, filter, kind, paper, debug]);
  const file = prepared && prepared.frame === frame && prepared.photos === photos && prepared.filter === filter && prepared.kind === kind && prepared.paper === paper && prepared.debug === debug ? prepared.file : null;
  return { file, failed };
}
function useSave(file: File | null) {
  const [status, setStatus] = useState<SaveStatus>(null); const [fallback, setFallback] = useState(false);
  useEffect(() => { setStatus(null); setFallback(false); }, [file]);
  const save = () => {
    if (!file) return;
    setStatus(null); setFallback(false);
    try {
      savePrepared(file).then((result) => setStatus({ kind: 'success', text: result.message }))
        .catch(() => { setFallback(true); setStatus({ kind: 'error', text: 'Sharing did not complete. Tap Download PNG to save a copy.' }); });
    } catch { setFallback(true); setStatus({ kind: 'error', text: 'Sharing did not complete. Tap Download PNG to save a copy.' }); }
  };
  const download = () => { if (!file) return; try { const result = downloadFile(file); setStatus({ kind: 'success', text: result.message }); setFallback(false); } catch { setStatus({ kind: 'error', text: 'The download could not be started. Please try again.' }); } };
  return { status, fallback, save, download };
}
function SaveFeedback({ status, fallback, download }: { status: SaveStatus; fallback: boolean; download: () => void }) { return <><SaveNotice status={status} />{fallback && <Button className="secondary" onClick={download}>Download PNG</Button>}</>; }
function Preview({ frame, photos, retake, decorate }: { frame: FrameConfig; photos: string[]; retake: () => void; decorate: () => void }) {
  const prepared = usePrepared(frame, photos, 'normal', 'strip'); const saving = useSave(prepared.file);
  return <main className="screen preview"><header><Back onClick={retake} label="retake" /><Logo /><span /></header><div className="taped-title">photos delivered here</div><CanvasPreview frame={frame} photos={photos} filter="normal" kind="strip" className="strip-preview" /><p>your little moment, all tucked in ✦</p><div className="button-row"><Button onClick={decorate}>decorate ✦</Button><Button className="secondary" onClick={saving.save} disabled={!prepared.file}>{prepared.file ? 'save image ↓' : 'preparing image…'}</Button></div>{prepared.failed && <p className="error" role="alert">The image could not be prepared. Please return to the camera and try again.</p>}<SaveFeedback {...saving} /></main>;
}

function Editor({ frame, photos, back }: { frame: FrameConfig; photos: string[]; back: () => void }) {
  const [state, setState] = useState<Editing>(initialEditing); const [history, setHistory] = useState<Editing[]>([]); const [debug, setDebug] = useState(false); const [slotIndex, setSlotIndex] = useState(0); const [calibrated, setCalibrated] = useState(frame);
  const update = (patch: Partial<Editing>) => { setHistory((old) => [...old, state]); setState((old) => ({ ...old, ...patch })); };
  const nudge = (field: 'x' | 'y' | 'width' | 'height', amount: number) => setCalibrated((old) => ({ ...old, slots: old.slots.map((slot, i) => i === slotIndex ? { ...slot, [field]: Math.max(0, slot[field] + amount) } : slot) }));
  const prepared = usePrepared(calibrated, photos, state.filter, state.kind, state.kind === 'strip' ? undefined : state.paper, debug); const saving = useSave(prepared.file);
  return <main className="editor"><header><Back onClick={back} label="back to preview" /><Logo /><div className="header-actions"><Button className="secondary" disabled={!history.length} onClick={() => { const previous = history.at(-1); if (previous) { setState(previous); setHistory((h) => h.slice(0, -1)); } }}>↶ undo</Button><Button onClick={saving.save} disabled={!prepared.file}>{prepared.file ? 'save image ↓' : 'preparing image…'}</Button></div></header>{prepared.failed && <p className="error" role="alert">The image could not be prepared. Please try changing a setting.</p>}<SaveFeedback {...saving} /><div className="editor-main"><section className="artboard"><span className="clip" /><div className="paper-stack"><CanvasPreview frame={calibrated} photos={photos} filter={state.filter} kind={state.kind} paper={state.kind === 'strip' ? undefined : state.paper} debug={debug} className={`final-preview ${state.kind}`} /></div><label className="debug"><input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} /> slot calibration overlay</label>{debug && <div className="calibration"><b>Dev calibration</b><select value={slotIndex} onChange={(e) => setSlotIndex(Number(e.target.value))}>{calibrated.slots.map((_, i) => <option key={i} value={i}>Slot {i + 1}</option>)}</select><div>{(['x', 'y', 'width', 'height'] as const).map((field) => <span key={field}><button onClick={() => nudge(field, -2)}>−</button>{field}<button onClick={() => nudge(field, 2)}>+</button></span>)}</div></div>}</section><section className="controls"><div className="taped-title">decorate your strip</div><Control title="01" label="choose the canvas"><div className="option-row">{([['strip', 'Just the strip', 'transparent PNG'], ['portrait', 'Portrait', '1080 × 1350'], ['story', 'Story', '1080 × 1920']] as const).map(([kind, title, sub]) => <button key={kind} className={`canvas-option ${state.kind === kind ? 'selected' : ''}`} onClick={() => update({ kind })}><i className={kind} /><b>{title}</b><small>{sub}</small></button>)}</div></Control><Control title="02" label="choose the filter"><div className="option-row filter-row">{([['bw', 'B&W'], ['normal', 'Normal'], ['vintage', 'Vintage']] as const).map(([filter, label]) => <button className={`filter-option ${state.filter === filter ? 'selected' : ''}`} key={filter} onClick={() => update({ filter })}><CanvasPreview frame={calibrated} photos={photos.slice(0, 1)} filter={filter} kind="strip" className="filter-sample" /><b>{label}</b></button>)}</div></Control>{state.kind !== 'strip' && <Control title="03" label="pick some paper"><div className="paper-row">{BACKGROUNDS.map((paper) => <button key={paper.id} className={state.paper === paper.image ? 'selected' : ''} onClick={() => update({ paper: paper.image })}><img src={paper.image} alt={`Paper ${paper.id}`} /></button>)}</div></Control>}</section></div></main> }
function Control({ title, label, children }: { title: string; label: string; children: React.ReactNode }) { return <section className="control"><h2><span>{title}</span>{label}</h2>{children}</section>; }

export default function App() { const [screen, setScreen] = useState<Screen>('welcome'); const [frame, setFrame] = useState<FrameConfig>(); const [photos, setPhotos] = useState<string[]>([]); if (screen === 'welcome') return <Welcome start={() => setScreen('frames')} />; if (screen === 'frames') return <FramePicker selected={frame} choose={setFrame} back={() => setScreen('welcome')} next={() => setScreen('camera')} />; if (!frame) return null; if (screen === 'camera') return <Camera frame={frame} back={() => setScreen('frames')} done={(next) => { setPhotos(next); setScreen('preview'); }} />; if (screen === 'preview') return <Preview frame={frame} photos={photos} retake={() => setScreen('camera')} decorate={() => setScreen('decorate')} />; return <Editor frame={frame} photos={photos} back={() => setScreen('preview')} />; }
