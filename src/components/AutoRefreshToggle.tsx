import styles from './AutoRefreshToggle.module.css';

interface AutoRefreshToggleProps {
  enabled: boolean;
  interval: number; // in minutes
  onToggle: (enabled: boolean) => void;
}

export const AutoRefreshToggle = ({ enabled, interval, onToggle }: AutoRefreshToggleProps) => {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className={styles.checkbox}
        aria-label={`Auto-refresh every ${interval} minutes`}
      />
      <span className={styles.slider}></span>
      <span className={styles.label}>
        Auto-refresh ({interval} min)
      </span>
    </label>
  );
};

