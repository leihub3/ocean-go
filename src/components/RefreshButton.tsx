import styles from './RefreshButton.module.css';

interface RefreshButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const RefreshButton = ({ onClick, isLoading = false, disabled = false }: RefreshButtonProps) => {
  return (
    <button
      className={styles.button}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label="Refresh conditions"
      title="Refresh conditions"
    >
      <span className={`${styles.icon} ${isLoading ? styles.spinning : ''}`}>
        🔄
      </span>
      {isLoading && <span className={styles.text}>Refreshing...</span>}
    </button>
  );
};

