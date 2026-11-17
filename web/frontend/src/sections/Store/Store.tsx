import React from 'react';
import { motion } from 'framer-motion';
import { EXTERNAL_STORE_PRODUCTS, STORE_BASE_URL, storeProductUrl } from '../../data/externalStoreProducts';
import { useAppContext } from '../../context/AppContext';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import styles from './Store.module.css';

// A curated subset of the real catalog from TredevaAstro's sister store
// (tredevastore.com) — not every product, just a hand-picked few. Every
// card links straight to that product's real page there; there's no
// cart/checkout here, by design. "Explore TredevaStore" goes to the full
// site for everything else.
export default function Store({ featured = false }: { featured?: boolean }) {
  const { t } = useAppContext();
  const products = featured ? EXTERNAL_STORE_PRODUCTS.slice(0, 4) : EXTERNAL_STORE_PRODUCTS;

  return (
    <section className={styles.section} id="store">
      <CelestialBackdrop variant="yantra" intensity="subtle" />
      <div className={styles.container} style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="section-header-split">
          <div className="header-left">
            <span className="section-eyebrow-gold">{t('seek_eyebrow')}</span>
            <h2 className="section-title-serif">{t('section_store_title')}</h2>
            <p className="section-desc-sans">
              {t('section_store_desc')}
            </p>
          </div>
          <a className="section-explore-link" href={STORE_BASE_URL} target="_blank" rel="noopener noreferrer">
            {t('cta_explore')} TredevaStore →
          </a>
        </div>

        <div className={`${styles.productsGrid} ${featured ? styles.productsGridFeatured : ''}`}>
          {products.map((product, i) => (
            <motion.div
              key={product.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>

        <p className={styles.disclaimer}>
          {t('store_external_note')}
        </p>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
          <a className="btn btn-outline-light" href={STORE_BASE_URL} target="_blank" rel="noopener noreferrer">
            {t('btn_explore_all_products')} →
          </a>
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product: p }: { product: typeof EXTERNAL_STORE_PRODUCTS[0] }) {
  const { t } = useAppContext();
  const url = storeProductUrl(p.slug);
  const discountPct = Math.round((1 - p.price / p.mrp) * 100);

  return (
    <a
      className={styles.productCard}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none' }}
    >
      <div className={styles.productVisual}>
        <div className={styles.productImageBg}>
          <img src={p.image} alt={p.name} className={styles.productImg} loading="lazy" />
        </div>
        {discountPct > 0 && <div className={styles.saleBadge}>-{discountPct}%</div>}
      </div>

      <div className={styles.productInfo}>
        <div className={styles.productCategory}>{t('cat_rudraksha')}</div>
        <h4 className={styles.productName}>{p.name}</h4>

        <div className={styles.productBottom}>
          <div className={styles.productPrice}>
            <span className={styles.price}>₹{p.price.toLocaleString()}</span>
            {p.mrp > p.price && (
              <span className={styles.originalPrice}>₹{p.mrp.toLocaleString()}</span>
            )}
          </div>
          <span className="btn btn-gold btn-sm">{t('btn_shop_now')}</span>
        </div>
      </div>
    </a>
  );
}
