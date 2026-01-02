import type { Region } from '../types';
import styles from './RegionSelector.module.css';

interface RegionSelectorProps {
  regions: Region[];
  selectedRegion: Region;
  onRegionChange: (region: Region) => void;
  isLoading?: boolean;
}

export const RegionSelector = ({ 
  regions, 
  selectedRegion, 
  onRegionChange,
  isLoading = false
}: RegionSelectorProps) => {
  return (
    <div className={styles.container}>
      <label htmlFor="region-select" className={styles.label}>
        Location
      </label>
      <select
        id="region-select"
        className={styles.select}
        value={selectedRegion.id}
        onChange={(e) => {
          const region = regions.find(r => r.id === e.target.value);
          if (region) {
            onRegionChange(region);
          }
        }}
        disabled={isLoading}
        aria-label="Select region"
      >
        {regions.map(region => (
          <option key={region.id} value={region.id}>
            {region.displayName}
          </option>
        ))}
      </select>
    </div>
  );
};

