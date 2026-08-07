import React, { useEffect, useRef, useState } from "react";
import styles from "./Transform.module.css";
import sampleData from "./sampleData";

// Lightweight count-up hook
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

export default function TransformPage() {
  const [compareIndexA, setCompareIndexA] = useState(0);
  const [compareIndexB, setCompareIndexB] = useState(1);
  const [slider, setSlider] = useState(50);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // sample stats using count-up
  const days = useCountUp(sampleData.stats.daysTraining);
  const xp = useCountUp(sampleData.stats.xp);
  const weightLost = useCountUp(Math.abs(Math.round(sampleData.stats.weightLost)));

  useEffect(() => {
    // small entrance animation class
    const el = containerRef.current;
    if (el) el.classList.add(styles.enter);
  }, []);

  const photos = sampleData.photos;

  return (
    <div className={styles.page} ref={containerRef}>
      <section className={styles.hero} aria-label="Transformation hero">
        <div className={styles.heroInner}>
          <div className={styles.sliderWrap}>
            <img
              src={photos[compareIndexB].url}
              alt={`After - ${photos[compareIndexB].label}`}
              className={styles.after}
              loading="lazy"
            />
            <div
              className={styles.beforeLayer}
              style={{ width: `${slider}%` }}
            >
              <img
                src={photos[compareIndexA].url}
                alt={`Before - ${photos[compareIndexA].label}`}
                className={styles.before}
                loading="lazy"
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={slider}
              onChange={(e) => setSlider(Number(e.target.value))}
              className={styles.range}
              aria-label="Compare slider"
            />
          </div>

          <div className={styles.heroMeta}>
            <div className={styles.metaRow}>
              <div className={styles.metaCard}><div className={styles.metaValue}>{days}</div><div className={styles.metaLabel}>Days</div></div>
              <div className={styles.metaCard}><div className={styles.metaValue}>{sampleData.stats.startWeight}kg</div><div className={styles.metaLabel}>Start</div></div>
              <div className={styles.metaCard}><div className={styles.metaValue}>{sampleData.stats.currentWeight}kg</div><div className={styles.metaLabel}>Current</div></div>
              <div className={styles.metaCard}><div className={styles.metaValue}>{sampleData.stats.currentStreak}d</div><div className={styles.metaLabel}>Streak</div></div>
            </div>

            <div className={styles.metaRow}>
              <div className={styles.metaCardLarge}>
                <div className={styles.metaLabel}>XP</div>
                <div className={styles.metaValueLarge}>{xp}</div>
              </div>
              <div className={styles.metaCardLarge}>
                <div className={styles.metaLabel}>Ascendant</div>
                <div className={styles.metaValueLarge}>{sampleData.stats.rank}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.timeline} aria-label="Transformation timeline">
        <h2 className={styles.sectionTitle}>Progress Timeline</h2>
        <div className={styles.timelineList}>
          {photos.map((p, idx) => (
            <article key={p.id} className={styles.timelineCard} onClick={() => { setCompareIndexA(idx); }}>
              <div className={styles.cardMedia}>
                <img src={p.url} alt={p.label} loading="lazy" />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>{p.weekLabel}</div>
                <div className={styles.cardStats}>{p.weight}kg {p.bodyFat ? `· ${p.bodyFat}%` : ""}</div>
                <div className={styles.cardJournal}>{p.note}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.stats} aria-label="Transformation statistics">
        <h2 className={styles.sectionTitle}>Statistics</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><div className={styles.statValue}>{sampleData.stats.totalWorkouts}</div><div className={styles.statLabel}>Workouts</div></div>
          <div className={styles.statCard}><div className={styles.statValue}>{sampleData.stats.longestStreak}d</div><div className={styles.statLabel}>Longest Streak</div></div>
          <div className={styles.statCard}><div className={styles.statValue}>{weightLost}kg</div><div className={styles.statLabel}>Weight Lost</div></div>
          <div className={styles.statCard}><div className={styles.statValue}>{sampleData.stats.photosUploaded}</div><div className={styles.statLabel}>Photos</div></div>
        </div>
      </section>

      <section className={styles.ehanPlaceholder} aria-hidden>
        <h3>🔥 Ethan's Analysis (placeholder)</h3>
        <ul>
          <li>Your shoulders have noticeably widened.</li>
          <li>Your waistline has reduced.</li>
          <li>Posture improved.</li>
        </ul>
        <p className={styles.note}>Ethan integration TODO: send new uploads to the Ethan worker, store results on the server, and display here.</p>
      </section>

    </div>
  );
}
