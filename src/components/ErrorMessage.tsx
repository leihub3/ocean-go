import { RefreshButton } from './RefreshButton';
import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const ErrorMessage = ({ message, onRetry, isRetrying = false }: ErrorMessageProps) => {
  return (
    <div className={styles.container} role="alert">
      <div className={styles.content}>
        <div className={styles.icon}>⚠️</div>
        <div className={styles.text}>
          <div className={styles.title}>Unable to Load Data</div>
          <div className={styles.message}>{message}</div>
        </div>
      </div>
      <div className={styles.actions}>
        <RefreshButton onClick={onRetry} isLoading={isRetrying} />
      </div>
    </div>
  );
};

