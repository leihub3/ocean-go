import type { Region } from '../types';
import styles from './FavoritesMenu.module.css';

interface FavoritesMenuProps {
  favorites: Region[];
  onSelectRegion: (region: Region) => void;
  onRemoveFavorite: (regionId: string) => void;
  currentRegionId: string;
}

export const FavoritesMenu = ({
  favorites,
  onSelectRegion,
  onRemoveFavorite,
  currentRegionId,
}: FavoritesMenuProps) => {
  if (favorites.length === 0) {
    return (
      <div className={styles.menu}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>☆</span>
          <p className={styles.emptyText}>No favorites yet</p>
          <p className={styles.emptyHint}>Add regions to favorites for quick access</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.menu}>
      <div className={styles.header}>
        <h3 className={styles.title}>Favorite Locations</h3>
      </div>
      <div className={styles.list}>
        {favorites.map(region => (
          <button
            key={region.id}
            className={`${styles.item} ${currentRegionId === region.id ? styles.active : ''}`}
            onClick={() => onSelectRegion(region)}
          >
            <span className={styles.itemName}>{region.displayName}</span>
            <button
              className={styles.removeButton}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFavorite(region.id);
              }}
              aria-label={`Remove ${region.name} from favorites`}
              title="Remove from favorites"
            >
              ×
            </button>
          </button>
        ))}
      </div>
    </div>
  );
};

