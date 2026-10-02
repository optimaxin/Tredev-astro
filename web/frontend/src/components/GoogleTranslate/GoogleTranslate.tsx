import { useEffect } from 'react';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: { translate: { TranslateElement: new (opts: Record<string, unknown>, containerId: string) => unknown } };
  }
}

const SCRIPT_SRC = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';

// Mounted exactly once, at the app root (App.tsx) — never conditionally
// unmounted, since Google's script attaches itself to the single
// #google_translate_element div by id and expects it to stay put for the
// life of the page. The widget itself stays visually hidden (see CSS below);
// the existing language dropdown (Navigation.tsx) is the only UI a visitor
// ever sees — it drives this through applyGoogleTranslateLanguage
// (utils/googleTranslate.ts), not Google's own banner/select.
export default function GoogleTranslate() {
  useEffect(() => {
    if (document.getElementById('google-translate-script')) return;

    window.googleTranslateElementInit = () => {
      if (!window.google) return;
      // hi/mr excluded — this site's own TRANSLATIONS dictionary already
      // covers them substantially, and Google has no "already in the target
      // language, leave it" mode (it blindly re-translates every text node
      // from the declared pageLanguage), which was corrupting that already-
      // correct text. See utils/googleTranslate.ts's own comment.
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', includedLanguages: 'bn,ta,te', autoDisplay: false },
        'google_translate_element'
      );
    };

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return <div id="google_translate_element" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }} />;
}
