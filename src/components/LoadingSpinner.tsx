import styles from './LoadingSpinner.module.css';

export const LoadingSpinner = () => {
  return (
    <div className={styles.container} aria-label="Loading">
      <div className={styles.spinner} />
    </div>
  );
};

