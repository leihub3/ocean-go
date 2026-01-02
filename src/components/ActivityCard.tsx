import type { ActivityRecommendation, ActivityType, HourlyForecast } from '../types';
import { StatusIndicator } from './StatusIndicator';
import { ActivityMiniForecast } from './ActivityMiniForecast';
import styles from './ActivityCard.module.css';


const ACTIVITY_EMOJIS: Record<string, string> = {
  snorkeling: '🤿',
  kayaking: '🛶',
  sup: '🏄',
  fishing: '🎣'
};

const ACTIVITY_LABELS: Record<string, string> = {
  snorkeling: 'Snorkeling',
  kayaking: 'Kayaking',
  sup: 'SUP',
  fishing: 'Fishing'
};

interface ActivityCardProps {
  activityName: string;
  recommendation: ActivityRecommendation;
  hourlyForecast?: HourlyForecast[];
  currentConditions?: { windSpeed: number; cloudiness: number; rain: number };
  onClick?: () => void;
}

export const ActivityCard = ({ activityName, recommendation, hourlyForecast, currentConditions, onClick }: ActivityCardProps) => {
  const emoji = ACTIVITY_EMOJIS[activityName] || '🌊';
  const label = ACTIVITY_LABELS[activityName] || activityName;

  return (
    <div 
      className={`${styles.card} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.emoji} role="img" aria-label={label}>
            {emoji}
          </span>
          <h3 className={styles.title}>{label}</h3>
        </div>
        <StatusIndicator status={recommendation.status} size="medium" />
      </div>
      
      <p className={styles.reason}>{recommendation.reason}</p>
      
      {recommendation.window && (
        <div className={styles.window}>
          <span className={styles.windowLabel}>Ideal window:</span>
          <span className={styles.windowValue}>{recommendation.window}</span>
        </div>
      )}

      {hourlyForecast && hourlyForecast.length > 0 && (
        <ActivityMiniForecast
          activityType={activityName as ActivityType}
          hourlyForecast={hourlyForecast}
          currentConditions={currentConditions}
        />
      )}
    </div>
  );
};

