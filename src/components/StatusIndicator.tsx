import type { ActivityStatus } from '../types';
import styles from './StatusIndicator.module.css';

interface StatusIndicatorProps {
  status: ActivityStatus;
  size?: 'small' | 'medium' | 'large';
}

export const StatusIndicator = ({ status, size = 'medium' }: StatusIndicatorProps) => {
  return (
    <div 
      className={`${styles.indicator} ${styles[status]} ${styles[size]}`}
      aria-label={`Status: ${status}`}
    />
  );
};

