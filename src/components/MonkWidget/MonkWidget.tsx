import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './MonkWidget.module.css';

const NOTIFICATIONS = [
  "Rohan from New Delhi just booked a chat with Astrologist Rahul Shastri 🪐",
  "Pooja from Bengaluru just ordered a Natural Colombian Emerald 💎",
  "Aditya from Mumbai just generated a Premium Kundli Report 📜",
  "Sneha from Pune just booked Pandit Meera Devi 🌸",
  "Amit from Jaipur just ordered a Five-Mukhi Rudraksha 📿",
  "Kiran from Indore just enrolled in Vedic Astrology Complete Course 🎓",
  "Meera from Chennai just generated their Love & Relationships Report 💖",
  "Rajesh from Hyderabad just booked Dr. Vikram Joshi 🪐",
  "Ananya from Kolkata just booked a call with Jyotishi Priya Nair 📞",
  "Sunil from Noida just ordered a Shri Yantra (Brass) 🕉️"
];

export default function MonkWidget() {
  const [currentMsg, setCurrentMsg] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Function to show a new notification
  const triggerNotification = () => {
    // Pick a random message
    const randomIdx = Math.floor(Math.random() * NOTIFICATIONS.length);
    setCurrentMsg(NOTIFICATIONS[randomIdx]);
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
              aria-label="Dismiss"
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
        title="Ask Monk Guide"
      >
        <div className={styles.glowRing} />
        <img 
          src="/images/monk.png" 
          alt="Sacred Monk Guide" 
          className={styles.monkImg}
        />
      </motion.button>
    </div>
  );
}
