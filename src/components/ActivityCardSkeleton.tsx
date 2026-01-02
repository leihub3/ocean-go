import styles from './ActivityCardSkeleton.module.css';

export const ActivityCardSkeleton = () => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.emojiSkeleton}></div>
          <div className={styles.titleSkeleton}></div>
        </div>
        <div className={styles.statusSkeleton}></div>
      </div>
      <div className={styles.reasonSkeleton}>
        <div className={styles.line}></div>
        <div className={styles.line}></div>
        <div className={styles.lineShort}></div>
      </div>
      <div className={styles.windowSkeleton}></div>
    </div>
  );
};

