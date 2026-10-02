// Google's "Website Translator" widget — applied on top of whatever's
// already rendered (including this app's own curated TRANSLATIONS, for
// languages/strings that system doesn't cover) rather than replacing it.
// Our language codes (en/hi/mr/bn/ta/te) are already Google's own ISO codes,
// so no mapping table is needed.
const COOKIE_NAME = 'googtrans';

// hi/mr have substantial native dictionary coverage in AppContext.tsx's own
// TRANSLATIONS — Google's widget has no "this text is already in the target
// language, leave it" mode (it's configured with a single fixed pageLanguage
// and blindly re-translates every text node it finds from that declared
// source). Verified live: with pageLanguage fixed at 'en', selecting Hindi
// made Google re-translate ALREADY-CORRECT Hindi dictionary text as if it
// were garbled English, replacing it with unrelated/wrong output (e.g. a
// report card's real title "करियर इंटेलिजेंस" became "ईसाई धर्म" —
// "Christianity"). Running that same blind pass only where the dictionary
// has near-zero coverage (bn/ta/te) still carries the same risk for the
// handful of keys that DO exist there, but that's a small, bounded exposure
// versus corrupting the (much larger) hi/mr dictionaries outright — so
// Google Translate is simply never engaged for hi/mr; the existing t()
// system alone (unchanged, pre-dating this integration) handles those two.
const GOOGLE_TRANSLATE_LANGS = new Set(['bn', 'ta', 'te']);

function setGoogTransCookie(value: string | null) {
  const host = window.location.hostname;
  const expire = value ? '' : 'expires=Thu, 01 Jan 1970 00:00:00 UTC; ';
  const entry = value ? `${COOKIE_NAME}=${value}` : `${COOKIE_NAME}=`;
  // Set on both the bare hostname and a leading-dot form — Google's own
  // bookmarklet does the same, since which form a given browser/host
  // combination honors isn't consistent.
  document.cookie = `${entry}; ${expire}path=/`;
  document.cookie = `${entry}; ${expire}path=/; domain=${host}`;
  document.cookie = `${entry}; ${expire}path=/; domain=.${host}`;
}

// Reads the combo box Google's widget renders into #google_translate_element
// once its script has loaded — present only after GoogleTranslate.tsx's
// script finishes initializing.
function getCombo(): HTMLSelectElement | null {
  return document.querySelector('select.goog-te-combo');
}

// Switching language is a same-page operation when the widget is already
// live (dispatch a change event on its own combo box, exactly what
// selecting it by hand would do) — falls back to a reload-with-cookie when
// the widget hasn't finished loading yet (e.g. a fresh page load where the
// user's last-picked language needs to apply before the script is ready).
export function applyGoogleTranslateLanguage(lang: string) {
  if (!GOOGLE_TRANSLATE_LANGS.has(lang)) {
    // en/hi/mr: no Google Translate pass at all (see GOOGLE_TRANSLATE_LANGS'
    // own comment) — clear the cookie and reload the same way reverting to
    // English always has, so a previously-engaged bn/ta/te translation
    // doesn't linger over whatever t() now renders for this language.
    setGoogTransCookie(null);
    window.location.reload();
    return;
  }

  setGoogTransCookie(`/en/${lang}`);
  const combo = getCombo();
  if (combo) {
    combo.value = lang;
    combo.dispatchEvent(new Event('change'));
    return;
  }
  window.location.reload();
}

// React's reconciler and Google's translate widget both mutate the same DOM
// nodes — Google wraps/splits text nodes it translates, so a subsequent
// React re-render of that subtree can call removeChild/insertBefore on a
// node that's no longer where React last left it, throwing a real
// NotFoundError that would otherwise crash the whole app. This is the
// standard, widely-used mitigation for this exact React+Google-Translate
// conflict: swallow just that specific failure instead of letting it
// propagate, since losing one DOM patch is harmless but an uncaught
// exception here takes down the whole React tree.
export function patchDomForGoogleTranslate() {
  const originalRemoveChild = Node.prototype.removeChild;
  // @ts-expect-error — intentionally widening removeChild's signature to match the real DOM override below.
  Node.prototype.removeChild = function removeChild(child) {
    if (child.parentNode !== this) {
      if (console) console.warn('Cannot remove a child from a different parent', child, this);
      return child;
    }
    // @ts-expect-error — see above.
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  // @ts-expect-error — see above.
  Node.prototype.insertBefore = function insertBefore(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) console.warn('Cannot insert before a reference node from a different parent', referenceNode, this);
      return newNode;
    }
    // @ts-expect-error — see above.
    return originalInsertBefore.apply(this, arguments);
  };
}
