// Markdown rendering + sanitization tests for the Premium Report viewer.
// Same convention as the backend tests: no framework, node:assert, non-zero
// exit on failure. Run with:
//   npm run test:markdown --workspace tredevastro-frontend
//
// DOMPurify needs a DOM, and this runs under Node, so a jsdom window is
// installed on globalThis before the module under test is imported.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).Node = dom.window.Node;
(globalThis as any).DocumentFragment = dom.window.DocumentFragment;
(globalThis as any).HTMLTemplateElement = dom.window.HTMLTemplateElement;
(globalThis as any).NodeFilter = dom.window.NodeFilter;

const { renderReportMarkdown, markdownPreview } = await import('./reportMarkdown.ts');

let failures = 0;
function check(label: string, fn: () => void) {
  try { fn(); console.log(`✓ ${label}`); }
  catch (e) { failures++; console.error(`✗ ${label}\n   ${(e as Error).message}`); }
}

// ── formatting the report actually uses ────────────────────────────────────
check('renders headings, paragraphs and emphasis', () => {
  const html = renderReportMarkdown('## Lagna\n\nYour **ascendant** is in *Leo*.');
  assert.match(html, /<h2[^>]*>Lagna<\/h2>/);
  assert.match(html, /<strong>ascendant<\/strong>/);
  assert.match(html, /<em>Leo<\/em>/);
});

check('renders unordered and ordered lists', () => {
  const ul = renderReportMarkdown('- Sun in Leo\n- Moon in Taurus');
  assert.match(ul, /<ul>/);
  assert.equal((ul.match(/<li>/g) ?? []).length, 2);
  const ol = renderReportMarkdown('1. First\n2. Second');
  assert.match(ol, /<ol>/);
});

check('renders GFM tables with headers and cells', () => {
  const html = renderReportMarkdown(
    '| Planet | Sign | House |\n| --- | --- | --- |\n| Sun | Leo | 1 |\n| Moon | Taurus | 10 |'
  );
  assert.match(html, /<table>/);
  assert.match(html, /<thead>/);
  assert.match(html, /<th[^>]*>Planet<\/th>/);
  assert.match(html, /<td[^>]*>Taurus<\/td>/);
  assert.equal((html.match(/<tr>/g) ?? []).length, 3, 'one header row + two body rows');
});

check('renders blockquotes and horizontal rules', () => {
  assert.match(renderReportMarkdown('> A classical maxim.'), /<blockquote>/);
  assert.match(renderReportMarkdown('text\n\n---\n\nmore'), /<hr\s*\/?>/);
});

// ── sanitization ───────────────────────────────────────────────────────────
check('strips <script> tags entirely', () => {
  const html = renderReportMarkdown('Hello\n\n<script>alert(1)</script>\n\nWorld');
  assert.ok(!/<script/i.test(html), `script survived: ${html}`);
  assert.ok(!html.includes('alert(1)'), 'script body survived');
});

check('strips inline event handlers', () => {
  const html = renderReportMarkdown('<img src=x onerror="alert(1)">');
  assert.ok(!/onerror/i.test(html), `onerror survived: ${html}`);
});

check('strips javascript: URLs from links', () => {
  const html = renderReportMarkdown('[click me](javascript:alert(1))');
  assert.ok(!/javascript:/i.test(html), `javascript: URL survived: ${html}`);
});

check('strips data: URLs from links', () => {
  const html = renderReportMarkdown('[x](data:text/html;base64,PHNjcmlwdD4=)');
  assert.ok(!/data:text\/html/i.test(html), `data: URL survived: ${html}`);
});

check('strips iframes, forms and style blocks', () => {
  const html = renderReportMarkdown('<iframe src="http://evil.test"></iframe><form><input></form><style>body{display:none}</style>');
  for (const tag of ['iframe', 'form', 'input', 'style']) {
    assert.ok(!new RegExp(`<${tag}`, 'i').test(html), `${tag} survived: ${html}`);
  }
});

check('strips style attributes', () => {
  const html = renderReportMarkdown('<p style="position:fixed;top:0">overlay</p>');
  assert.ok(!/style=/i.test(html), `style attribute survived: ${html}`);
  assert.ok(html.includes('overlay'), 'the text itself should be kept');
});

check('keeps safe https links and hardens them', () => {
  const html = renderReportMarkdown('[Tredev](https://tredevastro.com)');
  assert.match(html, /href="https:\/\/tredevastro\.com"/);
  assert.match(html, /rel="noopener noreferrer nofollow"/);
  assert.match(html, /target="_blank"/);
});

// ── edge cases ─────────────────────────────────────────────────────────────
check('empty and whitespace-only content render as empty string', () => {
  assert.equal(renderReportMarkdown(''), '');
  assert.equal(renderReportMarkdown('   \n  '), '');
  assert.equal(renderReportMarkdown(null), '');
  assert.equal(renderReportMarkdown(undefined), '');
});

check('content is never rewritten or truncated', () => {
  const body = 'Mars occupies the seventh house, which classical texts treat as a significant placement for partnership.';
  const html = renderReportMarkdown(body);
  assert.ok(html.includes(body), 'the sentence must survive verbatim');
});

// ── preview ────────────────────────────────────────────────────────────────
check('markdownPreview strips syntax and truncates', () => {
  assert.equal(markdownPreview('## Heading\n\nSome **bold** text.'), 'Heading Some bold text.');
  const long = markdownPreview('a'.repeat(300), 50);
  assert.equal(long.length, 50);
  assert.ok(long.endsWith('…'));
  assert.equal(markdownPreview(null), '');
});

console.log(failures === 0 ? '\nAll markdown tests passed.' : `\n${failures} test(s) FAILED.`);
if (failures > 0) process.exit(1);
