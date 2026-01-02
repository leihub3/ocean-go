import type { HourlyForecast } from '../types';
import styles from './ForecastTimeline.module.css';

interface ForecastTimelineProps {
  forecast: HourlyForecast[];
  region: string;
}

export const ForecastTimeline = ({ forecast }: ForecastTimelineProps) => {
  // Show next 12 hours
  const next12Hours = forecast.slice(0, 12);

  const getConditionStatus = (hour: HourlyForecast): 'good' | 'caution' | 'bad' => {
    // Simple evaluation: wind < 8, clouds < 70, no rain = good
    if (hour.windSpeed < 8 && hour.cloudiness < 70 && hour.rain === 0) {
      return 'good';
    }
    if (hour.windSpeed < 12 && hour.cloudiness < 85 && hour.rain < 2) {
      return 'caution';
    }
    return 'bad';
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>12-Hour Forecast</h3>
      <div className={styles.timeline}>
        {next12Hours.map((hour, index) => {
          const status = getConditionStatus(hour);
          const isNow = index === 0;
          
          return (
            <div
              key={index}
              className={`${styles.hour} ${styles[status]} ${isNow ? styles.current : ''}`}
            >
              <div className={styles.time}>{formatTime(hour.time)}</div>
              <div className={styles.indicator}>
                <div className={styles.bar} style={{ height: `${Math.min(100, (hour.windSpeed / 15) * 100)}%` }} />
              </div>
              <div className={styles.details}>
                <div className={styles.wind}>{hour.windSpeed.toFixed(1)} m/s</div>
                {hour.rain > 0 && <div className={styles.rain}>🌧️</div>}
              </div>
              {isNow && <div className={styles.nowLabel}>Now</div>}
            </div>
          );
        })}
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendBar} ${styles.good}`}></div>
          <span>Good</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendBar} ${styles.caution}`}></div>
          <span>Caution</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendBar} ${styles.bad}`}></div>
          <span>Poor</span>
        </div>
      </div>
    </div>
  );
};

