import styles from './CurrentConditionsSkeleton.module.css';

export const CurrentConditionsSkeleton = () => {
  return (
    <div className={styles.container}>
      <div className={styles.titleSkeleton}></div>
      <div className={styles.grid}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.item}>
            <div className={styles.iconSkeleton}></div>
            <div className={styles.content}>
              <div className={styles.labelSkeleton}></div>
              <div className={styles.valueSkeleton}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

