import { motion } from 'framer-motion';
import { LEGAL_CONTENT } from '../../data/legalContent';
import type { LegalDocId } from '../../data/legalContent';
import pageStyles from '../PageRenderer.module.css';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
};

export default function LegalPage({ docId }: { docId: LegalDocId }) {
  const doc = LEGAL_CONTENT[docId];

  return (
    <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`}>
      <div className={pageStyles.container} style={{ maxWidth: '820px' }}>
        <motion.div className={pageStyles.pageHeader} {...fadeUp} transition={{ duration: 0.6 }}>
          <span className="section-eyebrow-gold">Last updated {doc.updated}</span>
          <h1 className={pageStyles.pageTitle}>{doc.title}</h1>
          <div className={pageStyles.divider}>✦ ❖ ✦</div>
          <p className={pageStyles.pageSubtitle}>{doc.intro}</p>
        </motion.div>

        <div>
          {doc.sections.map((section, i) => (
            <motion.div
              key={section.heading}
              className={pageStyles.contentSection}
              {...fadeUp}
              transition={{ duration: 0.55, delay: Math.min(i * 0.06, 0.3) }}
            >
              <h3 className={pageStyles.contentSectionTitle}>{section.heading}</h3>
              <p className={pageStyles.contentText}>{section.body}</p>
              {section.bullets && (
                <ul style={{ marginTop: 'var(--space-3)', paddingLeft: '1.2em', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {section.bullets.map(b => (
                    <li key={b} className={pageStyles.contentText} style={{ listStyle: 'disc' }}>{b}</li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
