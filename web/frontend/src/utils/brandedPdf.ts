// The branded, paginated PDF engine behind every TredevaAstro report download
// — originally written inside KundliSection.tsx for the free Kundli PDF, and
// moved here verbatim so the Premium Report's PDF is produced by the SAME
// pipeline rather than a second one (same running header with logo, tagline
// and Acharya portrait, same footer, watermark, page packing and capture
// grouping).
//
// Contract with the caller's layout (see KundliPrintLayout.tsx and
// PremiumReport/PremiumReportPrintLayout.tsx): every top-level unit is a
// `[data-pdf-block]` element inside `root`, in reading order.
//   data-pdf-cover="true"    — the cover; whatever follows starts a new page
//   data-pdf-newpage="true"  — a numbered section; always starts a new page
//   data-pdf-closing="true"  — the closing page; always starts a new page
//   data-pdf-weight="<n>"    — optional relative capture cost (progress only)
//
// This module only reads the DOM it is given. It never fetches data or
// talks to any API, so a failed export can't affect the report itself.

export interface BrandedPdfOptions {
  root: HTMLElement;
  /** Centred text in the running header of every page after the cover. */
  headerTitle: string;
  fileName: string;
  blockWeight?: (el: HTMLElement) => number;
  onProgress?: (weightDone: number, totalWeight: number) => void;
  /** Polled between blocks; returning true stops the run without saving. */
  isCancelled?: () => boolean;
}

const defaultWeight = (el: HTMLElement) => {
  const declared = Number(el.dataset.pdfWeight);
  return Number.isFinite(declared) && declared > 0 ? declared : 1;
};

export async function generateBrandedPdf(opts: BrandedPdfOptions): Promise<'saved' | 'cancelled'> {
  const { headerTitle, fileName, onProgress } = opts;
  const blockWeight = opts.blockWeight ?? defaultWeight;
  const isCancelled = opts.isCancelled ?? (() => false);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  // Loaded once and drawn directly by jsPDF on every page (rather than
  // as an HTML overlay behind the content) — an HTML watermark only
  // ever covered one page when the whole document was one big capture,
  // and disappears entirely now that each section is captured on its
  // own (see the block loop below): an absolutely-positioned overlay
  // living outside a block's own DOM subtree is never included in
  // that block's capture. Drawing it straight onto the PDF guarantees
  // exactly one per page regardless of how sections fall across pages.
  const loadImage = (src: string) => new Promise<HTMLImageElement | null>(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  // acharyaImg is the same real Acharya portrait already used on the
  // live site (Panchang.tsx) and on this report's cover — repeated
  // small in the running header of every page as a brand/trust mark.
  const [logoImg, acharyaImg] = await Promise.all([loadImage('/logo.png'), loadImage('/images/acharya.png')]);

  const root = opts.root;
  const rawBlocks = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-block]'));

  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const footerSpace = 40; // two lines, and both a little larger/bolder now
  const usableWidth = pageWidth - margin * 2;
  const contentBottom = pageHeight - margin - footerSpace;
  const blockGap = 14;
  // Every page except the cover reserves a strip for the running
  // header (see drawHeader) — the cover carries its own large
  // letterhead-style branding instead, so it alone starts flush at
  // `margin`.
  const HEADER_RESERVE = 62;
  const contentTopFor = (p: number) => (p === 1 ? margin : margin + HEADER_RESERVE);

  // Blocks are placed in plain document order — cover first, closing
  // last, exactly as querySelectorAll already returns them. An earlier
  // version tried to pack pages tighter by re-ordering blocks within
  // each numbered section (a bounded look-ahead first-fit bin-packer),
  // deciding that order from each block's *estimated* height
  // (getBoundingClientRect, measured before capture). The loop below
  // then places blocks using each block's *real* captured height,
  // which routinely didn't match the estimate closely enough — e.g.
  // the KP chart block would be planned as "fits with the next table
  // below it," but the real capture didn't fit, so the table got
  // pushed to the next page anyway, leaving the KP chart's page with
  // dead space and the pushed table looking orphaned on the next page.
  // Reordering also meant two originally-adjacent blocks (Kundli
  // charts + Planetary Positions) could land on separate pages if
  // something else got planned in between. Two independent
  // height-computation passes that can disagree is the actual bug;
  // one real-height pass in natural order can't produce either
  // failure mode. `data-pdf-newpage`/`data-pdf-closing` still force a
  // fresh page exactly as before (read directly off each block below).
  const blocks = rawBlocks;
  const weights = blocks.map(blockWeight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  onProgress?.(0, totalWeight);

  let cursorY = contentTopFor(1);
  let pageNum = 1;
  let isFirstOnPage = true;
  let forceBreakBeforeNext = false;

  // A faint mark centered on the page — drawn LAST, right before
  // leaving a page (see goToNextPage and the final save below),
  // instead of first. Every content block has an OPAQUE background
  // (it's a JPEG capture, which can't carry transparency at all), so
  // drawing the watermark first meant every block placed on top of it
  // simply erased whatever part of the mark was underneath —
  // wherever content was dense, the watermark came out looking
  // chopped into fragments instead of one whole mark. Drawn on top,
  // at low opacity, it reads as a single translucent watermark over
  // the finished page instead of a shape peeking through gaps in it.
  // Wrapped in its own try/catch: a cosmetic nice-to-have that must
  // never be able to take down PDF generation as a whole if the
  // opacity/GState call or the image draw fails for any reason.
  const drawWatermark = () => {
    // The cover already carries its own large, dedicated logo — the
    // same faint mark behind it too read as a cluttered double logo.
    if (pageNum === 1 || !logoImg) return;
    try {
      const size = 260;
      pdf.saveGraphicsState();
      pdf.setGState(pdf.GState({ opacity: 0.05 }));
      pdf.addImage(logoImg, 'PNG', (pageWidth - size) / 2, (pageHeight - size) / 2, size, size);
      pdf.restoreGraphicsState();
    } catch (e) {
      console.error('Watermark draw failed, continuing without it:', e);
    }
  };

  // Running header on every page but the cover — brand mark + name on
  // the left, the subject ("<name>'s Kundli") centered, and the real
  // Acharya cutout (already transparent PNG, so no clipping needed)
  // on the right, sized off its own real aspect ratio so it's never
  // stretched, spanning the full header height edge-to-edge down to
  // the gold rule. Twice the height of the original single-line
  // header so all of this has room to breathe.
  const HEADER_LINE_Y = 74;
  const HEADER_LOGO_SIZE = 44;
  const ACHARYA_ASPECT = 433 / 577; // real width/height of /images/acharya.png — never stretch it
  const drawHeader = () => {
    if (pageNum === 1) return;
    const textLeft = margin + HEADER_LOGO_SIZE + 10;
    if (logoImg) {
      try { pdf.addImage(logoImg, 'PNG', margin, (HEADER_LINE_Y - HEADER_LOGO_SIZE) / 2, HEADER_LOGO_SIZE, HEADER_LOGO_SIZE); } catch (e) { console.error('Header logo draw failed, continuing without it:', e); }
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(90, 70, 40);
    pdf.text('TredevaAstro', textLeft, HEADER_LINE_Y / 2 + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(150, 140, 120);
    pdf.text('Your Sky. Your Story.', textLeft, HEADER_LINE_Y / 2 + 20);

    if (acharyaImg) {
      const photoH = HEADER_LINE_Y - 4;
      const photoW = photoH * ACHARYA_ASPECT;
      try { pdf.addImage(acharyaImg, 'PNG', pageWidth - margin - photoW, 4, photoW, photoH); } catch (e) { console.error('Header photo draw failed, continuing without it:', e); }
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(120, 105, 75);
    pdf.text(headerTitle, pageWidth / 2, HEADER_LINE_Y / 2 + 4, { align: 'center' });

    pdf.setDrawColor(181, 138, 59);
    pdf.setLineWidth(1);
    pdf.line(margin, HEADER_LINE_Y, pageWidth - margin, HEADER_LINE_Y);
  };

  // One footer line — cross-promoting the rest of the site, on the
  // left where the "TredevAstro — Your Sky. Your Story." line used to
  // be (that's already said once, in the header, on every page) —
  // and the page number on the right. Sits a few points clear of the
  // page's actual bottom edge (pageHeight): landing exactly ON it
  // (margin cancels an offset of +28 exactly, since margin=28) made
  // some viewers render it as visibly clipped rather than just tight.
  const OTHER_APPS = 'Visit our other sites: Store · Learn';
  const drawFooter = () => {
    pdf.setDrawColor(181, 138, 59);
    pdf.setLineWidth(1);
    pdf.line(margin, pageHeight - margin, pageWidth - margin, pageHeight - margin);
    pdf.setFontSize(9.5);
    pdf.setTextColor(140, 128, 106);
    if (pageNum === 1) {
      // The cover's own content above is centered — a left/right
      // split footer read as off-balance under it, so both pieces
      // are centered together here instead (every other page keeps
      // the left/right split, which reads fine under the running
      // header's own left/center/right layout).
      pdf.text(`${OTHER_APPS}  ·  Page ${pageNum}`, pageWidth / 2, pageHeight - margin + 15, { align: 'center' });
    } else {
      pdf.text(OTHER_APPS, margin, pageHeight - margin + 15);
      pdf.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - margin + 15, { align: 'right' });
    }
  };

  // jsPDF pages are white by default — every captured block already
  // has its own beige (#FAF7F0) background baked in, but without this
  // the margins and gutters BETWEEN blocks stay white, so the page
  // reads as beige rectangles sitting on a white sheet instead of one
  // uniform beige page. Filled first, on every page, before anything
  // else is drawn on top of it.
  const fillPageBackground = () => {
    pdf.setFillColor(250, 247, 240);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  // Every one of the 4 places this report used to need its own
  // 6-line addPage/header/footer/watermark sequence, collapsed to one
  // call — also means the beige page-fill only had to be added once.
  const goToNextPage = () => {
    drawWatermark(); // last thing drawn on the page being left — see drawWatermark's comment
    drawFooter();
    pdf.addPage();
    pageNum += 1;
    fillPageBackground();
    cursorY = contentTopFor(pageNum);
    isFirstOnPage = true;
    drawHeader();
  };

  fillPageBackground();

  // Charts and prediction cards are batched several-per-block (a grid
  // captured as one image) rather than one-per-block — brings this
  // down to ~25-35 captures for the full report instead of ~70-90.
  // scale:1.5 (still print-crisp — a block isn't meaningfully sharper
  // at 2x once placed at print size on an A4 page) and logging:false
  // trim per-capture cost further.
  //
  // Each block's capture is wrapped on its own: one block throwing
  // (a chart with a rendering quirk, a transient canvas failure) used
  // to abort the entire PDF after however much time had already been
  // spent on everything before it. Now it's logged and skipped —
  // worst case, one section is missing from an otherwise-complete PDF
  // instead of the whole generation failing.
  // Capturing speed: html2canvas pays a big FIXED cost per call — it
  // builds a fresh iframe, clones the document into it, re-parses
  // every stylesheet and waits on fonts/images (~0.3-0.5s even for a
  // 3-element block). Capturing ~40 blocks one by one was ~20s of pure
  // overhead, and cloning the whole live site each time (WebGL
  // backdrop, nav, every section) made each call far worse. So blocks
  // are captured in groups of ~2400px: one call clones only <head>
  // plus that group's blocks, then the group canvas is sliced back
  // into per-block canvases using each block's position measured in
  // the clone itself. The rest of the pipeline is unchanged.
  const CAPTURE_SCALE = 1.25; // legible print quality (0.8/1 both visibly blurred once printed/zoomed)
  const GROUP_MAX_PX = 2400; // keeps each group canvas ~3MP — well inside iOS Safari's canvas-area limit
  const captureGroup = async (group: HTMLElement[]): Promise<HTMLCanvasElement[]> => {
    let rects: { x: number; y: number; w: number; h: number }[] = [];
    const whole = await html2canvas(root, {
      scale: CAPTURE_SCALE,
      backgroundColor: '#FAF7F0',
      logging: false,
      ignoreElements: node => !(document.head.contains(node) || node.contains(root) || group.some(b => b.contains(node) || node.contains(b))),
      onclone: (_doc, clonedRoot) => {
        // The live root sits in a 0x0 clipping wrapper, so its own box is
        // 0px wide (blocks just overflow it) — give the clone its real
        // content width or html2canvas renders an empty 0-width canvas.
        clonedRoot.style.width = `${root.scrollWidth}px`;
        const r = clonedRoot.getBoundingClientRect();
        rects = Array.from(clonedRoot.querySelectorAll<HTMLElement>('[data-pdf-block]'), b => {
          const br = b.getBoundingClientRect();
          return { x: br.left - r.left, y: br.top - r.top, w: br.width, h: br.height };
        });
      },
    });
    if (rects.length !== group.length) throw new Error(`Cloned ${rects.length} blocks, expected ${group.length}`);
    return rects.map(({ x, y, w, h }) => {
      const c = document.createElement('canvas');
      c.width = Math.round(w * CAPTURE_SCALE);
      c.height = Math.round(h * CAPTURE_SCALE);
      c.getContext('2d')!.drawImage(whole, Math.round(x * CAPTURE_SCALE), Math.round(y * CAPTURE_SCALE), c.width, c.height, 0, 0, c.width, c.height);
      return c;
    });
  };
  const groups: number[][] = [];
  {
    let cur: number[] = [];
    let curH = 0;
    blocks.forEach((b, i) => {
      const h = b.offsetHeight;
      if (cur.length && curH + h > GROUP_MAX_PX) { groups.push(cur); cur = []; curH = 0; }
      cur.push(i);
      curH += h;
    });
    if (cur.length) groups.push(cur);
  }
  const canvases: (HTMLCanvasElement | null | undefined)[] = [];

  let weightDone = 0;
  for (let i = 0; i < blocks.length; i++) {
    if (isCancelled()) break; // safety timer fired — stop instead of capturing against a DOM React already unmounted
    const el = blocks[i];
    // Hands control back to the browser between every block. html2canvas
    // itself is mostly synchronous main-thread work (DOM walk + canvas
    // draws), and a plain `await html2canvas(...)` doesn't actually give
    // the browser a chance to paint or handle input between iterations —
    // it just chains microtasks, which a busy main thread still runs
    // back-to-back without yielding. That's what made the entire page
    // (this now starts automatically the moment the chart renders, not
    // just on click) feel completely frozen for the whole generation
    // instead of just slow. A `setTimeout` schedules a real macrotask,
    // so the event loop gets a turn to repaint/handle clicks/scroll
    // before the next capture starts.
    await new Promise(resolve => window.setTimeout(resolve, 0));
    if (isCancelled()) break;
    if (canvases[i] === undefined) {
      const group = groups.find(g => g.includes(i))!;
      const els = group.map(j => blocks[j]);
      let captured: (HTMLCanvasElement | null)[] | null = null;
      // One retry before giving up on the grouped capture, then fall
      // back to capturing each block on its own — a transient failure
      // or one quirky block must never drop a whole group of sections.
      for (let attempt = 0; attempt < 2 && !captured; attempt++) {
        try { captured = await captureGroup(els); } catch (e) {
          if (attempt === 1) console.error(`PDF group capture failed, falling back to per-block:`, e);
        }
      }
      if (!captured) {
        captured = [];
        for (const one of els) {
          try { captured.push((await captureGroup([one]))[0]); } catch (e) {
            console.error('PDF block failed to capture, skipping:', e);
            captured.push(null);
          }
        }
      }
      group.forEach((j, k) => { canvases[j] = captured![k]; });
    }
    const canvas = canvases[i];
    canvases[i] = null; // release the pixels once placed
    weightDone += weights[i];
    if (!canvas) {
      onProgress?.(weightDone, totalWeight);
      continue;
    }
    const imgHeight = (canvas.height * usableWidth) / canvas.width;
    // Every block has an opaque background (backgroundColor above), so
    // there's no transparency to lose — JPEG encodes noticeably faster
    // than PNG for this much pixel data and produces a much smaller
    // embedded image, which speeds up both the remaining generation
    // and the final pdf.save() (a real PNG-heavy 70+ page report was
    // getting into the tens of MB; that's real save/download time too).
    const imgData = canvas.toDataURL('image/jpeg', 0.82);
    onProgress?.(weightDone, totalWeight);

    // Every new topic (data-pdf-newpage) and the closing "thank you"
    // block always get their own fresh page, same as the cover
    // forcing a break before whatever follows it (see
    // forceBreakBeforeNext below) — all the same "give this block the
    // whole page to itself" rule.
    const mustBreakBefore = (forceBreakBeforeNext || el.dataset.pdfClosing === 'true' || el.dataset.pdfNewpage === 'true') && !isFirstOnPage;
    forceBreakBeforeNext = false;
    if (mustBreakBefore) goToNextPage();

    if (imgHeight <= contentBottom - contentTopFor(Math.max(pageNum, 2))) {
      // Normal case: the whole block goes on one page, whole — this is
      // what guarantees nothing is ever cut mid-way through.
      if (!isFirstOnPage && cursorY + imgHeight > contentBottom) goToNextPage();
      pdf.addImage(imgData, 'JPEG', margin, cursorY, usableWidth, imgHeight);
      cursorY += imgHeight + blockGap;
      isFirstOnPage = false;
    } else {
      // Rare oversized block (e.g. the full Mahadasha timeline is
      // taller than one whole page on its own) — the one case allowed
      // to split across pages, via jsPDF's own negative-offset
      // repeated-image technique, rather than silently overflowing.
      if (!isFirstOnPage) goToNextPage();
      let heightLeft = imgHeight;
      let position = cursorY;
      const pageContentHeight = contentBottom - contentTopFor(pageNum);
      pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
      heightLeft -= pageContentHeight;
      while (heightLeft > 0) {
        position -= pageContentHeight;
        goToNextPage();
        pdf.addImage(imgData, 'JPEG', margin, position, usableWidth, imgHeight);
        heightLeft -= pageContentHeight;
      }
      cursorY = contentBottom; // guarantees the next block's overflow check trips
      isFirstOnPage = false; // this block filled to the bottom of its last page — next one needs a fresh page
    }

    if (el.dataset.pdfCover === 'true') forceBreakBeforeNext = true;
  }
  if (isCancelled()) return 'cancelled';
  drawWatermark();
  drawFooter();
  pdf.save(fileName);
  return 'saved';
}
