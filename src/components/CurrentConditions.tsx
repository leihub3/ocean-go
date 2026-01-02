import type { CurrentConditions as CurrentConditionsType } from '../types';
import styles from './CurrentConditions.module.css';

interface CurrentConditionsProps {
  conditions: CurrentConditionsType;
}

export const CurrentConditions = ({ conditions }: CurrentConditionsProps) => {
  const { weather, currentTide, nextTide } = conditions;

  // Convert wind speed from m/s to km/h for display
  const windSpeedKmh = (weather.windSpeed * 3.6).toFixed(1);
  
  // Format tide time
  const formatTideTime = (time: string) => {
    return new Date(time).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Calculate hours until next tide
  const getHoursUntilTide = (time: string) => {
    const now = new Date();
    const tideTime = new Date(time);
    const hours = (tideTime.getTime() - now.getTime()) / (60 * 60 * 1000);
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    }
    return `${Math.round(hours * 10) / 10}h`;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Current Conditions</h2>
      
      <div className={styles.grid}>
        <div className={styles.item}>
          <div className={styles.icon}>💨</div>
          <div className={styles.content}>
            <div className={styles.label}>Wind</div>
            <div className={styles.value}>
              {windSpeedKmh} km/h
              <span className={styles.unit}>({weather.windSpeed.toFixed(1)} m/s)</span>
            </div>
          </div>
        </div>

        <div className={styles.item}>
          <div className={styles.icon}>
            {weather.cloudiness < 30 ? '☀️' : weather.cloudiness < 70 ? '⛅' : '☁️'}
          </div>
          <div className={styles.content}>
            <div className={styles.label}>Clouds</div>
            <div className={styles.value}>{Math.round(weather.cloudiness)}%</div>
          </div>
        </div>

        <div className={styles.item}>
          <div className={styles.icon}>
            {weather.rain > 0 ? '🌧️' : '☀️'}
          </div>
          <div className={styles.content}>
            <div className={styles.label}>Rain</div>
            <div className={styles.value}>
              {weather.rain > 0 ? `${weather.rain.toFixed(1)} mm` : 'None'}
            </div>
          </div>
        </div>

        {currentTide && (
          <div className={styles.item}>
            <div className={styles.icon}>
              {currentTide.type === 'high' ? '🌊' : '🔻'}
            </div>
            <div className={styles.content}>
              <div className={styles.label}>Current Tide</div>
              <div className={styles.value}>
                {currentTide.type === 'high' ? 'High' : 'Low'} 
                <span className={styles.tideHeight}>({currentTide.height.toFixed(2)}m)</span>
              </div>
            </div>
          </div>
        )}

        {nextTide && (
          <div className={styles.item}>
            <div className={styles.icon}>
              {nextTide.type === 'high' ? '⬆️' : '⬇️'}
            </div>
            <div className={styles.content}>
              <div className={styles.label}>Next Tide</div>
              <div className={styles.value}>
                {nextTide.type === 'high' ? 'High' : 'Low'} in {getHoursUntilTide(nextTide.time)}
                <span className={styles.time}>({formatTideTime(nextTide.time)})</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

