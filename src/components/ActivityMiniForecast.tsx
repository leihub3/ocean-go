import type { ActivityType, HourlyForecast } from '../types';
import { getActivityStatusForHour } from '../utils/activityRules';
import styles from './ActivityMiniForecast.module.css';

interface ActivityMiniForecastProps {
  activityType: ActivityType;
  hourlyForecast: HourlyForecast[];
}

export const ActivityMiniForecast = ({
  activityType,
  hourlyForecast,
}: ActivityMiniForecastProps) => {
  // Show next 6 hours
  const next6Hours = hourlyForecast.slice(0, 6);

  if (next6Hours.length === 0) {
    return null;
  }

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.label}>Next 6 hours:</div>
      <div className={styles.timeline}>
        {next6Hours.map((hour, index) => {
          const status = getActivityStatusForHour(hour, activityType);
          const isNow = index === 0;

          return (
            <div
              key={index}
              className={`${styles.hour} ${styles[status]} ${isNow ? styles.current : ''}`}
              title={`${formatTime(hour.time)}: ${status} conditions`}
            >
              <div className={styles.time}>{formatTime(hour.time)}</div>
              <div className={styles.indicator}>
                <div className={styles.dot} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

