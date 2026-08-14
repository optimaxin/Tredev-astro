import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PRODUCTS } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import Lightweight3DViewer from '../../components/Lightweight3DViewer/Lightweight3DViewer';
import { 
  ConstellationIcon, 
  RashiChakraIcon, 
  AcharyaIcon, 
  WealthIcon, 
  ProfileIcon, 
  VastuIcon, 
  ManuscriptIcon 
} from '../../components/Icons/Icons';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import styles from './Store.module.css';

const CATEGORIES = ['All', 'Gemstones', 'Rudraksha', 'Crystals', 'Bracelets', 'Yantras', 'Puja Essentials'];

const CATEGORY_LABELS: Record<string, string> = {
  All: 'Sabhi Upay',
  Gemstones: 'Ratna (Gemstones)',
  Rudraksha: 'Rudraksha',
  Crystals: 'Sphatik (Crystals)',
  Bracelets: 'Mala & Bracelets',
  Yantras: 'Yantras',
  'Puja Essentials': 'Puja Essentials',
};

export default function Store({ featured = false }: { featured?: boolean }) {
  const { setPage, t } = useAppContext();
  const [activeCategory, setActiveCategory] = useState('All');

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'All': return <ConstellationIcon size={24} />;
      case 'Gemstones': return <RashiChakraIcon size={24} />;
      case 'Rudraksha': return <AcharyaIcon size={24} />;
      case 'Crystals': return <WealthIcon size={24} />;
      case 'Bracelets': return <ProfileIcon size={24} />;
      case 'Yantras': return <VastuIcon size={24} />;
      case 'Puja Essentials': return <ManuscriptIcon size={24} />;
      default: return null;
    }
  };

  const filtered = featured
    ? PRODUCTS.filter(p => p.recommended).slice(0, 4)
    : PRODUCTS.filter(p => activeCategory === 'All' || p.category === activeCategory);
  const recommended = PRODUCTS.filter(p => p.recommended);

  return (
    <section className={styles.section} id="store">
      <CelestialOrnament
        type="yantra"
        className="ornament-bg"
        style={{
          position: 'absolute',
          right: '-100px',
          top: '15%',
          width: '450px',
          height: '450px',
          pointerEvents: 'none',
          zIndex: 0
        }}
        animate
      />
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
          {featured && (
            <button
              className="section-explore-link"
              onClick={() => { setPage('store'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              {t('cta_explore')} TredevStore →
            </button>
          )}
        </div>

        {featured ? (
          /* Featured mode: show 4 recommended products in grid */
          <div className={`${styles.productsGrid} ${styles.productsGridFeatured}`}>

            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
              >
                <ProductCard product={product} featured />
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            {/* Recommended */}
            <div className={styles.recommendedSection}>
              <h3 className={styles.recommendedTitle}>Chart-Recommended Upay</h3>
              <p className={styles.recommendedDesc}>Remedies aligned with your Surya in Vrischika, Chandra in Vrishabha, and Simha Lagna</p>
              <div className={styles.recommendedGrid}>
                {recommended.map(p => (
                  <ProductCard key={p.id} product={p} featured />
                ))}
              </div>
            </div>

            {/* Category Tabs */}
            <div className={styles.tabs}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`${styles.tab} ${activeCategory === cat ? styles.tabActive : ''}`}
                  onClick={() => setActiveCategory(cat)}
                  id={`store-cat-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>{getCategoryIcon(cat)}</span>
                  {t('cat_' + cat.toLowerCase().replace(' ', '_')) || cat}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div className={styles.productsGrid}>
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
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
              * Traditional associations are based on cultural and spiritual traditions.
            </p>
          </>
        )}

        {/* Explore All — shown only in featured mode */}
        {featured && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
            <button
              className="btn btn-outline-light"
              onClick={() => { setPage('store'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Explore TredevStore →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ProductCard({ product: p, featured = false }: { product: typeof PRODUCTS[0]; featured?: boolean }) {
  const { setPage, setSelectedId, addToCart, t } = useAppContext();
  const [hovered, setHovered] = useState(false);
  const [show3D, setShow3D] = useState(featured && (p.category === 'Gemstones' || p.category === 'Crystals' || p.category === 'Yantras'));
  const stars = '★'.repeat(Math.floor(p.rating)) + (p.rating % 1 ? '½' : '');

  const has3D = p.category === 'Gemstones' || p.category === 'Crystals' || p.category === 'Yantras';

  // Determine 3D parameters
  let viewerType: 'gemstone' | 'yantra' | 'report' = 'gemstone';
  let viewerColor = '#C8A96B';
  if (p.category === 'Gemstones') {
    viewerType = 'gemstone';
    viewerColor = '#50C878'; // emerald green
  } else if (p.category === 'Crystals') {
    viewerType = 'gemstone';
    viewerColor = '#f5c6d6'; // rose quartz pink
  } else if (p.category === 'Yantras') {
    viewerType = 'yantra';
    viewerColor = '#c8a96b'; // gold
  }

  const handleProductClick = () => {
    setSelectedId(p.id);
    setPage('product-detail');
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: p.id,
      name: t('prod_' + p.id + '_name') || p.name,
      price: p.price,
      quantity: 1,
      category: p.category
    });
    alert(`${t('prod_' + p.id + '_name') || p.name} added to cart.`);
  };

  return (
    <div
      className={`${styles.productCard} ${featured ? styles.productFeatured : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleProductClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Product Visual */}
      <div 
        className={styles.productVisual} 
        style={{ transform: hovered && !show3D ? 'scale(1.03) rotateY(5deg)' : 'scale(1)' }}
      >
        {show3D ? (
          <div className={styles.product3DWrapper}>
            <Lightweight3DViewer type={viewerType} color={viewerColor} />
            <button 
              className={styles.toggle3DBtn} 
              onClick={(e) => {
                e.stopPropagation();
                setShow3D(false);
              }}
              title="Switch to Photo"
            >
              📷 Photo
            </button>
          </div>
        ) : (
          <div className={styles.productImageBg}>
            {p.image && (
              <img
                src={p.image}
                alt={p.name}
                className={styles.productImg}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const placeholder = (e.currentTarget as HTMLImageElement).nextElementSibling;
                  if (placeholder) (placeholder as HTMLElement).style.display = 'block';
                }}
              />
            )}
            <span 
              className={styles.productEmoji}
              style={p.image ? { display: 'none' } : undefined}
            >
              {p.category === 'Gemstones' ? '💎' :
               p.category === 'Rudraksha' ? '🔮' :
               p.category === 'Crystals' ? '🌸' :
               p.category === 'Bracelets' ? '📿' :
               p.category === 'Yantras' ? '⭐' : '🪔'}
            </span>
            {has3D && (
              <button 
                className={styles.toggle3DBtn} 
                onClick={(e) => {
                  e.stopPropagation();
                  setShow3D(true);
                }}
                title="View in 3D"
              >
                🪐 3D View
              </button>
            )}
          </div>
        )}
        {p.originalPrice && (
          <div className={styles.saleBadge}>
            -{Math.round((1 - p.price / p.originalPrice) * 100)}%
          </div>
        )}
      </div>

      {/* Info */}
      <div className={styles.productInfo}>
        <div className={styles.productCategory}>
          {t('cat_' + p.category.toLowerCase().replace(' ', '_')) || p.category}
        </div>
        <h4 className={styles.productName}>{t('prod_' + p.id + '_name') || p.name}</h4>
        <p className={styles.productAssoc}>{t('prod_' + p.id + '_assoc') || p.association}</p>

        <div className={styles.productRating}>
          <span className={styles.stars}>{stars}</span>
          <span className={styles.reviewCount}>({p.reviews})</span>
        </div>

        <div className={styles.productBottom}>
          <div className={styles.productPrice}>
            <span className={styles.price}>₹{p.price.toLocaleString()}</span>
            {p.originalPrice && (
              <span className={styles.originalPrice}>₹{p.originalPrice.toLocaleString()}</span>
            )}
          </div>
          <button className="btn btn-gold btn-sm" id={`product-${p.id}`} onClick={handleAddToCart}>
            {t('btn_add_to_cart') || 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
