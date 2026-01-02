import styles from './SettingsButton.module.css';

interface SettingsButtonProps {
  onClick: () => void;
}

export const SettingsButton = ({ onClick }: SettingsButtonProps) => {
  return (
    <button
      className={styles.button}
      onClick={onClick}
      aria-label="Open settings"
      title="Settings"
    >
      <span className={styles.icon}>⚙️</span>
    </button>
  );
};

