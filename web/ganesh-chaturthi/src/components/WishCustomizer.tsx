import { useEffect, useRef, useState } from 'react';
import { WISH_TEMPLATES, CANVAS_W, CANVAS_H, type WishTemplate } from '../data/wishTemplates';
import { trackEvent } from '../analytics';
import { removeBackground } from '../utils/removeBackground';

type Step = 'templates' | 'photo' | 'preview';
type Cutout = HTMLCanvasElement | null;

const templateImageCache = new Map<string, Promise<HTMLImageElement>>();
function loadTemplateImage(src: string): Promise<HTMLImageElement> {
  let promise = templateImageCache.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    templateImageCache.set(src, promise);
  }
  return promise;
}

// Draws the full wish card onto `canvas`: the template's real designed
// background image, then the user's background-removed photo cover-fit into
// that template's exact photoBox — anchored to the TOP of the box (not
// centered), so a full-body photo keeps the head/upper-body instead of being
// center-cropped when it doesn't match the box's aspect ratio.
async function drawWishCard(canvas: HTMLCanvasElement, template: WishTemplate, cutout: Cutout) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const bg = await loadTemplateImage(template.imageSrc);
  ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H);

  const box = {
    x: template.photoBox.xFrac * CANVAS_W,
    y: template.photoBox.yFrac * CANVAS_H,
    w: template.photoBox.wFrac * CANVAS_W,
    h: template.photoBox.hFrac * CANVAS_H,
  };

  if (cutout) {
    const scale = Math.max(box.w / cutout.width, box.h / cutout.height);
    const w = cutout.width * scale;
    const h = cutout.height * scale;
    const dx = box.x + (box.w - w) / 2;
    const dy = box.y; // top-anchored, not vertically centered
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.drawImage(cutout, dx, dy, w, h);
    ctx.restore();
  } else {
    // Subtle placeholder hint only — never the annotated reference art itself.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `${Math.round(box.w * 0.16)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', box.x + box.w / 2, box.y + box.h / 2);
    ctx.restore();
  }
}

function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const CAPTION = '🙏 श्री गणेशाय नमः 🙏\n\nMay Lord Ganesha bless you and your family with happiness, prosperity, good health, and success.Wishing you and your loved ones a very Happy and Blessed Ganesh Chaturthi! 🐘🌺✨\n\nगणपति बप्पा मोरया! 🙏❤️\n\n#GaneshChaturthi #GanpatiBappaMorya #SpiritualJourney #FestiveWishes #TredevaAstro';

export default function WishCustomizer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('templates');
  const [template, setTemplate] = useState<WishTemplate>(WISH_TEMPLATES[0]);
  const [cutout, setCutout] = useState<Cutout>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'shared' | 'unsupported' | 'error'>('idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-renders the canvas whenever the chosen template or photo cutout
  // changes — covers both the live template-picker preview (no photo yet)
  // and the final preview step (photo present).
  useEffect(() => {
    if (canvasRef.current) void drawWishCard(canvasRef.current, template, cutout);
  }, [template, cutout]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setBusyLabel('Removing background…');
    try {
      const img = await loadImageFile(file);
      const bgRemoved = await removeBackground(img);
      setCutout(bgRemoved);
      setStep('preview');
      trackEvent('wish_photo_added', template.id);
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  // JPEG, not PNG — the finished card is a flat poster with zero need for
  // transparency, and several phones' share sheets / WhatsApp's own image
  // pipeline handle a PNG's alpha channel unpredictably (reports of the
  // shared image losing its background even though the source canvas is
  // fully opaque). A JPEG can't carry an alpha channel at all, which
  // removes that whole class of problem outright rather than chasing which
  // specific app/OS combination mishandles PNGs.
  const getBlob = (): Promise<Blob | null> => new Promise(resolve => canvasRef.current?.toBlob(b => resolve(b), 'image/jpeg', 0.92));

  const handleDownload = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ganesh-chaturthi-wishes.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    trackEvent('wish_download', template.id);
  };

  // Web Share API (Level 2, file sharing) is the only real way a website can
  // reach WhatsApp — including WhatsApp's own "My Status" target, which only
  // appears INSIDE WhatsApp's share sheet once the OS share sheet hands it
  // the image. There's no separate public API/URL scheme to post to Status
  // directly from a page, so this one Share button covers "share to
  // WhatsApp/anywhere" AND "share to Status" — the user picks WhatsApp, then
  // Status, from the native sheet. Falls back to Download on desktop
  // browsers that don't support sharing files.
  const handleShare = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], 'ganesh-chaturthi-wishes.jpg', { type: 'image/jpeg' });
    const shareData = { files: [file], text: `${CAPTION}\n${window.location.origin}`, title: 'Ganesh Chaturthi Wishes' };
    if (navigator.canShare?.({ files: [file] })) {
      setShareState('sharing');
      try {
        await navigator.share(shareData);
        setShareState('shared');
        trackEvent('wish_share', template.id);
      } catch {
        setShareState('idle'); // user cancelled the share sheet — not an error
      }
    } else {
      setShareState('unsupported');
      await handleDownload();
    }
  };

  return (
    <div className="wishOverlay" onClick={onClose}>
      <div className="wishCard" onClick={e => e.stopPropagation()}>
        <button type="button" className="wishClose" onClick={onClose} aria-label="Close">✕</button>

        {step === 'templates' && (
          <>
            <h2 className="wishTitle">Customize Your Wishes</h2>
            <p className="wishSubtitle">Pick a template, add your photo, and share a personalized Ganesh Chaturthi greeting.</p>
            <div className="wishLayout">
              <canvas ref={canvasRef} className="wishCanvasPreview" />
              <div className="wishTemplateGrid">
                {WISH_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`wishTemplateCard ${template.id === t.id ? 'wishTemplateCardActive' : ''}`}
                    onClick={() => setTemplate(t)}
                  >
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="btn btn-gold btn-lg" style={{ width: '100%' }} onClick={() => { setStep('photo'); trackEvent('wish_template_chosen', template.id); }}>
              Continue →
            </button>
          </>
        )}

        {step === 'photo' && (
          <>
            <h2 className="wishTitle">Add Your Photo</h2>
            <p className="wishSubtitle">Choose a clear photo — we'll remove the background and place it into the template automatically.</p>
            <canvas ref={canvasRef} className="wishCanvasPreview" />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            <button type="button" className="btn btn-gold btn-lg" style={{ width: '100%' }} disabled={busy} onClick={() => fileInputRef.current?.click()}>
              {busy ? busyLabel || 'Loading…' : '📷 Choose Photo'}
            </button>
            <button type="button" className="wishBackLink" onClick={() => setStep('templates')}>← Back to templates</button>
          </>
        )}

        {step === 'preview' && (
          <>
            <h2 className="wishTitle">Your Wish Card</h2>
            <canvas ref={canvasRef} className="wishCanvasPreview" />
            <div className="wishActions">
              <button type="button" className="btn btn-gold btn-lg" onClick={handleShare} disabled={shareState === 'sharing'}>
                {shareState === 'sharing' ? 'Opening share…' : '📤 Share'}
              </button>
              <button type="button" className="btn btn-outline-gold btn-lg" onClick={handleDownload}>
                ⬇ Download
              </button>
            </div>
            {shareState === 'unsupported' && (
              <p className="wishHint">Your browser can't share images directly — the image has been downloaded. Open WhatsApp, start a new Status or chat, and attach it from your gallery.</p>
            )}
            {shareState === 'shared' && <p className="wishHint">Shared! To post it as your WhatsApp Status: pick WhatsApp in the share sheet, then choose "My Status".</p>}
            <button type="button" className="wishBackLink" onClick={() => setStep('photo')}>← Choose a different photo</button>
          </>
        )}
      </div>
    </div>
  );
}
