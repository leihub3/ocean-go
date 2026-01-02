import styles from './FavoriteButton.module.css';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: () => void;
  label?: string;
}

export const FavoriteButton = ({ isFavorite, onClick, label }: FavoriteButtonProps) => {
  return (
    <button
      className={styles.button}
      onClick={onClick}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <span className={styles.icon}>{isFavorite ? '⭐' : '☆'}</span>
      {label && <span className={styles.label}>{label}</span>}
    </button>
  );
};

