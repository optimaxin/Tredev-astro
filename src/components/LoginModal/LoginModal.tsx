import { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

/**
 * Every gated action (Kundli, Consult, Ask TredevAstro, Panchang location,
 * etc.) sets pendingAction + calls setShowLoginModal(true). Rather than
 * popping up a separate compact modal, redirect straight to the one "OG"
 * manuscript AuthPage so there's a single, consistent login experience.
 */
export default function LoginModal() {
  const { showLoginModal, setShowLoginModal, setPage } = useAppContext();

  useEffect(() => {
    if (showLoginModal) {
      setPage('auth');
      setShowLoginModal(false);
    }
  }, [showLoginModal, setPage, setShowLoginModal]);

  return null;
}
