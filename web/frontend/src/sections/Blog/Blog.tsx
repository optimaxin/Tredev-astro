import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { contentService } from '../../services/contentService';
import type { BlogPost } from '../../services/contentService';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import styles from './Blog.module.css';

const TAG_COLORS: Record<string, string> = {
  Nakshatra: 'gold',
  Saturn: 'cyan',
  Marriage: 'terracotta',
  Career: 'gold',
  'Daily Astrology': 'cyan',
};

// Blog post tags are free-text admin content (see contentService.listBlogPosts),
// but these five recur often enough that translating them is worth a small
// lookup — anything outside this known set just shows as written, same as
// the post title/excerpt.
const TAG_KEYS: Record<string, string> = {
  Nakshatra: 'blog_tag_nakshatra',
  Saturn: 'blog_tag_saturn',
  Marriage: 'blog_tag_marriage',
  Career: 'blog_tag_career',
  'Daily Astrology': 'blog_tag_daily_astrology',
};

export default function Blog() {
  const { setPage, setSelectedId, t } = useAppContext();
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    contentService.listBlogPosts().then(setPosts).catch(() => setPosts([]));
  }, []);

  if (!posts.length) return null;
  const featured = posts[0];
  const rest = posts.slice(1);

  const handleBlogClick = (id: number) => {
    setSelectedId(id);
    setPage('blog-detail');
  };

  return (
    <section className={styles.section} id="blog">
      <CelestialOrnament type="mandala" className={styles.bgOrnament} />
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-eyebrow">{t('section_blog_eyebrow')}</span>
          <h2 className={styles.title}>{t('section_blog_title')}</h2>
        </motion.div>

        <div className={styles.layout}>
          {/* Featured */}
          <motion.div
            className={styles.featured}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            onClick={() => handleBlogClick(featured.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.featuredVisual}>
              <div className={styles.featuredBg}>
                <span className={styles.featuredEmoji}>☽</span>
              </div>
            </div>
            <div className={styles.featuredContent}>
              <div className={styles.postMeta}>
                <span className={`${styles.tag} ${styles[`tag_${TAG_COLORS[featured.tag] || 'gold'}`]}`}>
                  {TAG_KEYS[featured.tag] ? t(TAG_KEYS[featured.tag]) : featured.tag}
                </span>
                <span className={styles.readTime}>{featured.readTime}</span>
                <span className={styles.postDate}>{featured.date}</span>
              </div>
              <h3 className={styles.featuredTitle}>{featured.title}</h3>
              <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
              <button className="btn btn-outline-gold btn-sm" id="blog-read-featured" onClick={(e) => { e.stopPropagation(); handleBlogClick(featured.id); }}>
                {t('btn_read_article')}
              </button>
            </div>
          </motion.div>

          {/* Small Cards */}
          <div className={styles.smallCards}>
            {rest.map((post, i) => (
              <motion.div
                key={post.id}
                className={styles.smallCard}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.55 }}
                onClick={() => handleBlogClick(post.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.smallMeta}>
                  <span className={`${styles.tag} ${styles[`tag_${TAG_COLORS[post.tag] || 'gold'}`]}`}>
                    {TAG_KEYS[post.tag] ? t(TAG_KEYS[post.tag]) : post.tag}
                  </span>
                  <span className={styles.readTime}>{post.readTime}</span>
                </div>
                <h4 className={styles.smallTitle}>{post.title}</h4>
                <p className={styles.smallExcerpt}>{post.excerpt.slice(0, 100)}...</p>
                <button className={styles.readLink} id={`blog-read-${post.id}`} onClick={(e) => { e.stopPropagation(); handleBlogClick(post.id); }}>
                  {t('btn_read_more')}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
