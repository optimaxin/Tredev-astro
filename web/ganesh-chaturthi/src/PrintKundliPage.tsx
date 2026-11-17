import { useEffect, useState } from 'react';
import { calculatorService, CalculatorApiError } from '../../frontend/src/services/calculatorService';
import type { KundliFullResult } from '../../frontend/src/services/calculatorService';
import KundliPrintLayout from '../../frontend/src/sections/KundliSection/KundliPrintLayout';

// Headless-browser-only route — never linked to or visited by a real user.
// The backend's /api/kundli-pdf endpoint (backend/app/api/kundliPdf.routes.ts)
// launches Playwright, navigates here with the birth details as query params,
// waits for document.title to flip to PDF_READY/PDF_ERROR, then calls
// page.pdf() on whatever's rendered — real vector text/charts via Chromium's
// own print engine, instead of the client-side html2canvas raster capture
// KundliSection normally does (that path stays as-is for the main site).
export default function PrintKundliPage() {
  const [result, setResult] = useState<KundliFullResult | null>(null);
  const [error, setError] = useState('');

  const params = new URLSearchParams(window.location.search);
  const name = params.get('name') || 'Kundli';
  const dob = params.get('dob') || '';
  const tob = params.get('tob') || '';
  const place = params.get('place') || '';
  const latitude = Number(params.get('lat'));
  const longitude = Number(params.get('lng'));
  const timezoneOffsetMinutes = Number(params.get('tz'));
  const language: 'en' | 'hi' = params.get('lang') === 'hi' ? 'hi' : 'en';
  const timeUnknown = params.get('timeUnknown') === '1';

  useEffect(() => {
    calculatorService
      .kundliFull({ date: dob, time: tob, timezoneOffsetMinutes, latitude, longitude }, language)
      .then(setResult)
      .catch(err => setError(err instanceof CalculatorApiError ? err.message : 'Kundli computation failed'));
    // Query params are fixed for the lifetime of this page (it's loaded once
    // per PDF request, never navigated within) — deliberately not re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result) document.title = 'PDF_READY';
    else if (error) document.title = 'PDF_ERROR';
  }, [result, error]);

  // AppShell normally sets this on the real <html> element based on theme
  // state; this route bypasses AppShell entirely, so without this the page
  // (and <body>) defaults to the dark theme's background — invisible on
  // screen (KundliPrintLayout paints over it), but page.pdf() rasterizes
  // the FULL page canvas, so any leftover space past the report's own
  // content bled through as a solid black block on the last page.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    // Exact match to KundliPrintLayout's own cream background (light
    // theme's --bg-primary is a close but different warm ivory) — any
    // bled-through sliver reads as a seam otherwise, not just wrong color.
    // Set on <html> too, not just <body> — the default browser body margin
    // (8px) sits outside the body's own background box, so a body-only fix
    // still left a thin white margin around every page's true edge; <html>
    // paints underneath that gap.
    document.documentElement.style.background = '#FAF7F0';
    document.body.style.background = '#FAF7F0';
    document.body.style.margin = '0';
  }, []);

  if (error) return <div>{error}</div>;
  if (!result) return <div>Loading…</div>;

  return (
    <>
      {/* Faint centered mark repeated on every printed page — matches the
          original client-side jsPDF report's per-page watermark. A
          position:fixed element repeats on every page of a Chromium print
          job, which is what makes this work without any per-page JS. The
          backend (kundliPdf.routes.ts) hides this via page.evaluate for the
          cover-only pass, since the original design never showed it there. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic */}
      <img
        id="pdf-watermark"
        src="/logo.png"
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 260, height: 260, objectFit: 'contain', opacity: 0.08, pointerEvents: 'none', zIndex: 9999 }}
      />
      <KundliPrintLayout
        name={name}
        dob={dob}
        tob={tob}
        timeUnknown={timeUnknown}
        place={place}
        timezoneOffsetMinutes={timezoneOffsetMinutes}
        latitude={latitude}
        longitude={longitude}
        result={result}
        bannerImageSrc="/images/hero-banner.jpg"
        language={language}
      />
    </>
  );
}
