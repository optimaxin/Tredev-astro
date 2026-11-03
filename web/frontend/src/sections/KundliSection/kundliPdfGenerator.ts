// Shared multi-page client-side PDF generator for Kundli reports
// Reused by both user-facing KundliSection and astrologer-facing ClientKundliPanel.

export interface GenerateKundliPdfOptions {
  root: HTMLElement;
  subjectName: string;
  fileName: string;
  preparedForAstrologer?: string;
  onProgress?: (progress: { weightDone: number; totalWeight: number }) => void;
  isCancelled?: () => boolean;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '').trim() || 'User';
}

export function blockWeight(el: HTMLElement): number {
  const declared = Number(el.dataset.pdfWeight);
  return Number.isFinite(declared) && declared > 0 ? declared : 1;
}

export function estimatePdfRemainingSec(
  elapsedSec: number,
  progress: { weightDone: number; totalWeight: number } | null
): number {
  const INITIAL_ESTIMATE_SEC = 240;
  if (!progress || progress.weightDone === 0) return Math.max(Math.round(INITIAL_ESTIMATE_SEC - elapsedSec), 5);
  const secPerWeight = elapsedSec / progress.weightDone;
  const paddedTotalEstimate = secPerWeight * progress.totalWeight * 1.15;
  return Math.max(Math.round(paddedTotalEstimate - elapsedSec), 2);
}

export const PDF_STATUS_MESSAGES = [
  'Analysing your Grahas…',
  'Reading your Dasha timeline…',
  'Mapping your Nakshatras…',
  'Weighing your planetary strengths…',
  'Analysing your health outlook…',
  'Checking your doshas…',
  'Charting your divisional houses…',
  'Consulting the stars…',
  'Aligning your houses and lords…',
  'Finalising your predictions…',
];

export async function generateKundliPdf({
  root,
  subjectName,
  fileName,
  preparedForAstrologer,
  onProgress,
  isCancelled = () => false,
}: GenerateKundliPdfOptions): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const [logoImg, acharyaImg] = await Promise.all([loadImage('/logo.png'), loadImage('/images/acharya.png')]);

  const rawBlocks = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-block]'));
  if (rawBlocks.length === 0) {
    throw new Error('No PDF content blocks found to capture.');
  }

  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const footerSpace = 40;
  const usableWidth = pageWidth - margin * 2;
  const contentBottom = pageHeight - margin - footerSpace;
  const blockGap = 14;
  const HEADER_RESERVE = 62;
  const contentTopFor = (p: number) => (p === 1 ? margin : margin + HEADER_RESERVE);

  const blocks = rawBlocks;
  const weights = blocks.map(blockWeight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  onProgress?.({ weightDone: 0, totalWeight });

  let cursorY = contentTopFor(1);
  let pageNum = 1;
  let isFirstOnPage = true;
  let forceBreakBeforeNext = false;

  const drawWatermark = () => {
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

  const HEADER_LINE_Y = 74;
  const HEADER_LOGO_SIZE = 44;
  const ACHARYA_ASPECT = 433 / 577;

  const drawHeader = () => {
    if (pageNum === 1) return;
    const textLeft = margin + HEADER_LOGO_SIZE + 10;
    if (logoImg) {
      try {
        pdf.addImage(logoImg, 'PNG', margin, (HEADER_LINE_Y - HEADER_LOGO_SIZE) / 2, HEADER_LOGO_SIZE, HEADER_LOGO_SIZE);
      } catch (e) {
        console.error('Header logo draw failed, continuing without it:', e);
      }
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
      try {
        pdf.addImage(acharyaImg, 'PNG', pageWidth - margin - photoW, 4, photoW, photoH);
      } catch (e) {
        console.error('Header photo draw failed, continuing without it:', e);
      }
    }

    if (preparedForAstrologer) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(120, 105, 75);
      pdf.text(`${subjectName || 'Kundli'}'s Kundli`, pageWidth / 2, 30, { align: 'center' });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(181, 138, 59);
      pdf.text(`for ${preparedForAstrologer}`, pageWidth / 2, 45, { align: 'center' });
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(120, 105, 75);
      pdf.text(`${subjectName || 'Kundli'}'s Kundli`, pageWidth / 2, HEADER_LINE_Y / 2 + 4, { align: 'center' });
    }

    pdf.setDrawColor(181, 138, 59);
    pdf.setLineWidth(1);
    pdf.line(margin, HEADER_LINE_Y, pageWidth - margin, HEADER_LINE_Y);
  };

  const OTHER_APPS = 'Visit our other sites: Store · Learn';
  const drawFooter = () => {
    pdf.setDrawColor(181, 138, 59);
    pdf.setLineWidth(1);
    pdf.line(margin, pageHeight - margin, pageWidth - margin, pageHeight - margin);
    pdf.setFontSize(9.5);
    pdf.setTextColor(140, 128, 106);
    const forText = preparedForAstrologer ? `  ·  for ${preparedForAstrologer}` : '';
    if (pageNum === 1) {
      pdf.text(`${OTHER_APPS}${forText}  ·  Page ${pageNum}`, pageWidth / 2, pageHeight - margin + 15, { align: 'center' });
    } else {
      pdf.text(`${OTHER_APPS}${forText}`, margin, pageHeight - margin + 15);
      pdf.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - margin + 15, { align: 'right' });
    }
  };

  const fillPageBackground = () => {
    pdf.setFillColor(250, 247, 240);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  const goToNextPage = () => {
    drawWatermark();
    drawFooter();
    pdf.addPage();
    pageNum += 1;
    fillPageBackground();
    cursorY = contentTopFor(pageNum);
    isFirstOnPage = true;
    drawHeader();
  };

  fillPageBackground();

  const CAPTURE_SCALE = 1.25;
  const GROUP_MAX_PX = 2400;
  const captureGroup = async (group: HTMLElement[]): Promise<HTMLCanvasElement[]> => {
    let rects: { x: number; y: number; w: number; h: number }[] = [];
    const whole = await html2canvas(root, {
      scale: CAPTURE_SCALE,
      backgroundColor: '#FAF7F0',
      logging: false,
      ignoreElements: node =>
        !(document.head.contains(node) || node.contains(root) || group.some(b => b.contains(node) || node.contains(b))),
      onclone: (_doc, clonedRoot) => {
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
      if (cur.length && curH + h > GROUP_MAX_PX) {
        groups.push(cur);
        cur = [];
        curH = 0;
      }
      cur.push(i);
      curH += h;
    });
    if (cur.length) groups.push(cur);
  }

  const canvases: (HTMLCanvasElement | null | undefined)[] = [];
  let weightDone = 0;

  for (let i = 0; i < blocks.length; i++) {
    if (isCancelled()) break;
    const el = blocks[i];
    await new Promise(resolve => window.setTimeout(resolve, 0));
    if (isCancelled()) break;

    if (canvases[i] === undefined) {
      const group = groups.find(g => g.includes(i))!;
      const els = group.map(j => blocks[j]);
      let captured: (HTMLCanvasElement | null)[] | null = null;
      for (let attempt = 0; attempt < 2 && !captured; attempt++) {
        try {
          captured = await captureGroup(els);
        } catch (e) {
          if (attempt === 1) console.error('PDF group capture failed, falling back to per-block:', e);
        }
      }
      if (!captured) {
        captured = [];
        for (const one of els) {
          try {
            captured.push((await captureGroup([one]))[0]);
          } catch (e) {
            console.error('PDF block failed to capture, skipping:', e);
            captured.push(null);
          }
        }
      }
      group.forEach((j, k) => {
        canvases[j] = captured![k];
      });
    }

    const canvas = canvases[i];
    canvases[i] = null;
    weightDone += weights[i];
    if (!canvas) {
      onProgress?.({ weightDone, totalWeight });
      continue;
    }

    const imgHeight = (canvas.height * usableWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.82);
    onProgress?.({ weightDone, totalWeight });

    const mustBreakBefore =
      (forceBreakBeforeNext || el.dataset.pdfClosing === 'true' || el.dataset.pdfNewpage === 'true') && !isFirstOnPage;
    forceBreakBeforeNext = false;
    if (mustBreakBefore) goToNextPage();

    if (imgHeight <= contentBottom - contentTopFor(Math.max(pageNum, 2))) {
      if (!isFirstOnPage && cursorY + imgHeight > contentBottom) goToNextPage();
      pdf.addImage(imgData, 'JPEG', margin, cursorY, usableWidth, imgHeight);
      cursorY += imgHeight + blockGap;
      isFirstOnPage = false;
    } else {
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
      cursorY = contentBottom;
      isFirstOnPage = false;
    }

    if (el.dataset.pdfCover === 'true') forceBreakBeforeNext = true;
  }

  if (!isCancelled()) {
    drawWatermark();
    drawFooter();
    pdf.save(fileName);
  }
}
