import type { ReactNode } from 'react';
import styles from './Drawer.module.css';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  // Wider panel for content-heavy drawers (multi-tab profiles, chat
  // transcripts) — plain forms (Add Staff, edit delivery status, …) stay at
  // the narrower default.
  wide?: boolean;
}

export default function Drawer({ open, onClose, title, children, footer, wide }: DrawerProps) {
  if (!open) return null;
  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={`${styles.drawer} ${wide ? styles.drawerWide : ''}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.drawerBody}>{children}</div>
        {footer && <div className={styles.drawerFooter}>{footer}</div>}
      </div>
    </>
  );
}
