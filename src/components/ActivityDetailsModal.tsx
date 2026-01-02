import { useEffect } from 'react';
import type { ActivityType, ActivityRecommendation, CurrentConditions, HourlyForecast } from '../types';
import { StatusIndicator } from './StatusIndicator';
import styles from './ActivityDetailsModal.module.css';

interface ActivityDetailsModalProps {
  activityType: ActivityType;
  recommendation: ActivityRecommendation;
  conditions: CurrentConditions | undefined;
  onClose: () => void;
}

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

export const ActivityDetailsModal = ({
  activityType,
  recommendation,
  conditions,
  onClose,
}: ActivityDetailsModalProps) => {
  const emoji = ACTIVITY_EMOJIS[activityType] || '🌊';
  const label = ACTIVITY_LABELS[activityType] || activityType;

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const hourlyForecast = conditions?.hourlyForecast || [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close details"
        >
          ×
        </button>

        <div className={styles.header}>
          <span className={styles.emoji} role="img" aria-label={label}>
            {emoji}
          </span>
          <h2 className={styles.title}>{label}</h2>
          <StatusIndicator status={recommendation.status} size="large" />
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Current Status</h3>
            <p className={styles.reason}>{recommendation.reason}</p>
            {recommendation.window && (
              <div className={styles.window}>
                <span className={styles.windowLabel}>Ideal window:</span>
                <span className={styles.windowValue}>{recommendation.window}</span>
              </div>
            )}
          </div>

          {conditions && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Current Conditions</h3>
              <div className={styles.conditionsGrid}>
                <div className={styles.conditionItem}>
                  <div className={styles.conditionIcon}>💨</div>
                  <div className={styles.conditionInfo}>
                    <div className={styles.conditionLabel}>Wind</div>
                    <div className={styles.conditionValue}>
                      {conditions.weather.windSpeed.toFixed(1)} m/s
                      <span className={styles.conditionUnit}>
                        ({(conditions.weather.windSpeed * 3.6).toFixed(1)} km/h)
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.conditionItem}>
                  <div className={styles.conditionIcon}>
                    {conditions.weather.cloudiness < 30 ? '☀️' : conditions.weather.cloudiness < 70 ? '⛅' : '☁️'}
                  </div>
                  <div className={styles.conditionInfo}>
                    <div className={styles.conditionLabel}>Clouds</div>
                    <div className={styles.conditionValue}>
                      {Math.round(conditions.weather.cloudiness)}%
                    </div>
                  </div>
                </div>
                <div className={styles.conditionItem}>
                  <div className={styles.conditionIcon}>
                    {conditions.weather.rain > 0 ? '🌧️' : '☀️'}
                  </div>
                  <div className={styles.conditionInfo}>
                    <div className={styles.conditionLabel}>Rain</div>
                    <div className={styles.conditionValue}>
                      {conditions.weather.rain > 0 ? `${conditions.weather.rain.toFixed(1)} mm` : 'None'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {hourlyForecast.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Hourly Forecast</h3>
              <div className={styles.forecastChart}>
                {hourlyForecast.slice(0, 12).map((hour, index) => {
                  const time = new Date(hour.time);
                  const isGood = hour.windSpeed <= 8 && hour.cloudiness <= 60 && hour.rain === 0;
                  
                  return (
                    <div key={index} className={styles.forecastBar}>
                      <div className={styles.forecastTime}>
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={styles.forecastIndicator}>
                        <div
                          className={`${styles.forecastBarInner} ${isGood ? styles.good : styles.caution}`}
                          style={{
                            height: `${Math.min(100, (hour.windSpeed / 15) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className={styles.forecastDetails}>
                        <div className={styles.forecastWind}>
                          {hour.windSpeed.toFixed(1)} m/s
                        </div>
                        {hour.rain > 0 && (
                          <div className={styles.forecastRain}>🌧️</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

