// @mediapipe/selfie_segmentation ships as a legacy global-registration script
// (no real ESM/CJS exports — it attaches `window.SelfieSegmentation` as a
// side effect), so it's loaded as a plain <script> tag from the CDN rather
// than `import`ed, exactly like Google's own usage examples do.
const SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';

interface SelfieSegmentationResults {
  image: CanvasImageSource;
  segmentationMask: CanvasImageSource;
}

interface SelfieSegmentationInstance {
  setOptions(options: { modelSelection?: number }): void;
  onResults(cb: (results: SelfieSegmentationResults) => void): void;
  send(input: { image: HTMLImageElement }): Promise<void>;
  close(): void;
}

declare global {
  interface Window {
    SelfieSegmentation: new (config: { locateFile: (file: string) => string }) => SelfieSegmentationInstance;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load selfie_segmentation script'));
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

// Runs Google's Selfie Segmentation model once against a single photo and
// returns a same-size canvas with the background made transparent, so the
// caller can drawImage() the result straight into a template's photo box.
// modelSelection: 0 = the "general" model, tuned for a single person at
// portrait/half-body-and-closer framing — matches the wish-photo use case
// better than modelSelection 1 (landscape/multi-person, wider framing).
export async function removeBackground(photo: HTMLImageElement): Promise<HTMLCanvasElement> {
  await loadScript();
  const segmentation = new window.SelfieSegmentation({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
  });
  segmentation.setOptions({ modelSelection: 0 });

  const canvas = document.createElement('canvas');
  canvas.width = photo.naturalWidth || photo.width;
  canvas.height = photo.naturalHeight || photo.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  await new Promise<void>((resolve) => {
    segmentation.onResults((results) => {
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw the mask's alpha first, then keep only the parts of the real
      // photo that land on top of it (source-in) — the standard mediapipe
      // segmentation-mask compositing recipe, leaving the cut-out subject on
      // a transparent background.
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      resolve();
    });
    void segmentation.send({ image: photo });
  });

  segmentation.close();
  return canvas;
}
