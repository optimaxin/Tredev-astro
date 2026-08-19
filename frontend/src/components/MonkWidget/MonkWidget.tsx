import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import styles from './MonkWidget.module.css';

const NOTIFICATION_KEYS = [
  'monk_notif_1', 'monk_notif_2', 'monk_notif_3', 'monk_notif_4', 'monk_notif_5',
  'monk_notif_6', 'monk_notif_7', 'monk_notif_8', 'monk_notif_9', 'monk_notif_10',
];

export default function MonkWidget() {
  const { t } = useAppContext();
  const [currentMsg, setCurrentMsg] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Function to show a new notification
  const triggerNotification = () => {
    // Pick a random message
    const randomIdx = Math.floor(Math.random() * NOTIFICATION_KEYS.length);
    setCurrentMsg(t(NOTIFICATION_KEYS[randomIdx]));
    setVisible(true);

    // Hide after 6 seconds
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, 6000);
  };

  useEffect(() => {
    // Show first notification after 5 seconds
    const initialTimeout = setTimeout(() => {
      triggerNotification();
    }, 5000);

    // Set up recurring notification interval (every 22 seconds)
    const interval = setInterval(() => {
      if (!visible) {
        triggerNotification();
      }
    }, 22000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  return (
    <div className={styles.widgetContainer}>
      <AnimatePresence>
        {visible && currentMsg && (
          <motion.div
            key={currentMsg}
            className={styles.speechBubble}
            initial={{ opacity: 0, scale: 0.8, x: 20, y: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className={styles.bubbleArrow} />
            <button
              className={styles.closeBtn}
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
              }}
              aria-label={t('monk_dismiss')}
            >
              ✕
            </button>
            <div className={styles.pulseDot} />
            <p className={styles.messageText}>{currentMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monk Avatar Wrapper */}
      <motion.button
        className={styles.monkAvatar}
        onClick={triggerNotification}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        title={t('monk_cta_title')}
      >
        <div className={styles.glowRing} />
        <img
          src="/images/monk.png"
          alt={t('monk_alt')}
          className={styles.monkImg}
        />
      </motion.button>
    </div>
  );
}
