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

export default function Blog() {
  const { setPage, setSelectedId } = useAppContext();
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
          <span className="section-eyebrow">The Journal</span>
          <h2 className={styles.title}>From the TredevAstro Journal</h2>
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
                  {featured.tag}
                </span>
                <span className={styles.readTime}>{featured.readTime}</span>
                <span className={styles.postDate}>{featured.date}</span>
              </div>
              <h3 className={styles.featuredTitle}>{featured.title}</h3>
              <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
              <button className="btn btn-outline-gold btn-sm" id="blog-read-featured" onClick={(e) => { e.stopPropagation(); handleBlogClick(featured.id); }}>
                Read Article →
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
                    {post.tag}
                  </span>
                  <span className={styles.readTime}>{post.readTime}</span>
                </div>
                <h4 className={styles.smallTitle}>{post.title}</h4>
                <p className={styles.smallExcerpt}>{post.excerpt.slice(0, 100)}...</p>
                <button className={styles.readLink} id={`blog-read-${post.id}`} onClick={(e) => { e.stopPropagation(); handleBlogClick(post.id); }}>
                  Read →
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
