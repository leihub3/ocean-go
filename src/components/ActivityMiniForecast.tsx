import { useMemo } from 'react';
import type { ActivityType, HourlyForecast } from '../types';
import { getActivityStatusForHour } from '../utils/activityRules';
import styles from './ActivityMiniForecast.module.css';

interface ActivityMiniForecastProps {
  activityType: ActivityType;
  hourlyForecast: HourlyForecast[];
  currentConditions?: { windSpeed: number; cloudiness: number; rain: number };
}

export const ActivityMiniForecast = ({
  activityType,
  hourlyForecast,
  currentConditions,
}: ActivityMiniForecastProps) => {
  // Combine current conditions + forecast, showing current as first hour
  const forecastWithCurrent = useMemo(() => {
    const now = new Date();
    
    // Find the first forecast hour that is in the future (or current)
    const futureForecast = hourlyForecast.filter(h => new Date(h.time) >= now);
    
    if (!currentConditions) {
      return futureForecast.slice(0, 6);
    }
    
    // Create current conditions as first hour (with current timestamp)
    const currentHour: HourlyForecast = {
      time: now.toISOString(),
      windSpeed: currentConditions.windSpeed,
      cloudiness: currentConditions.cloudiness,
      rain: currentConditions.rain,
    };
    
    // Take next 5 hours from future forecast (since we're adding current)
    return [currentHour, ...futureForecast.slice(0, 5)];
  }, [hourlyForecast, currentConditions]);

  // Show 6 hours (current + next 5)
  const next6Hours = forecastWithCurrent.slice(0, 6);

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
          
          // For debugging: log if current hour status doesn't match expected
          if (isNow && currentConditions) {
            const windKmh = (hour.windSpeed * 3.6).toFixed(1);
            console.log(`[${activityType}] Current: ${windKmh} km/h (${hour.windSpeed.toFixed(1)} m/s) → ${status}`);
          }

          return (
            <div
              key={index}
              className={`${styles.hour} ${styles[status]} ${isNow ? styles.current : ''}`}
              title={`${formatTime(hour.time)}: ${status} conditions (Wind: ${(hour.windSpeed * 3.6).toFixed(1)} km/h)`}
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

