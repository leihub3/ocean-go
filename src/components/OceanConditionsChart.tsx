import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { HourlyForecast, TideData } from '../types';
import styles from './OceanConditionsChart.module.css';

interface OceanConditionsChartProps {
  hourlyForecast: HourlyForecast[];
  tides?: TideData[];
}

export const OceanConditionsChart = ({
  hourlyForecast,
  tides = [],
}: OceanConditionsChartProps) => {
  // Prepare data for chart
  const chartData = useMemo(() => {
    return hourlyForecast.slice(0, 12).map((hour) => {
      const time = new Date(hour.time);
      return {
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hour: time.getHours(),
        windSpeed: Number(hour.windSpeed.toFixed(1)),
        cloudiness: Math.round(hour.cloudiness),
        rain: Number(hour.rain.toFixed(2)),
        // For display
        windKmh: Number((hour.windSpeed * 3.6).toFixed(1)),
      };
    });
  }, [hourlyForecast]);

  // Get tide times for reference lines
  const tideLines = useMemo(() => {
    if (!tides || tides.length === 0) return [];
    
    const now = new Date();
    return tides
      .filter((tide): tide is NonNullable<typeof tide> => tide !== null)
      .filter(tide => {
        const tideTime = new Date(tide.time);
        // Only show tides in the next 12 hours
        return tideTime > now && tideTime <= new Date(now.getTime() + 12 * 60 * 60 * 1000);
      })
      .map(tide => {
        const tideTime = new Date(tide.time);
        const chartIndex = hourlyForecast.findIndex(h => {
          const hTime = new Date(h.time);
          return Math.abs(hTime.getTime() - tideTime.getTime()) < 30 * 60 * 1000; // Within 30 min
        });
        return {
          type: tide.type,
          time: tide.time,
          hour: tideTime.getHours(),
          index: chartIndex >= 0 ? chartIndex : null,
        };
      });
  }, [tides, hourlyForecast]);

  if (chartData.length === 0) {
    return null;
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipTime}>{payload[0].payload.time}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'windSpeed') {
              return (
                <p key={index} style={{ color: entry.color }}>
                  💨 Wind: {(entry.payload.windKmh)} km/h ({entry.value} m/s)
                </p>
              );
            }
            if (entry.dataKey === 'cloudiness') {
              return (
                <p key={index} style={{ color: entry.color }}>
                  ☁️ Clouds: {entry.value}%
                </p>
              );
            }
            if (entry.dataKey === 'rain') {
              return (
                <p key={index} style={{ color: entry.color }}>
                  🌧️ Rain: {entry.value > 0 ? `${entry.value} mm` : 'None'}
                </p>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>12-Hour Forecast</h3>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              fontSize={11}
              tick={{ fill: '#6b7280' }}
            />
            <YAxis
              yAxisId="left"
              label={{ value: 'Wind (m/s)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 11 } }}
              stroke="#0ea5e9"
              fontSize={11}
              tick={{ fill: '#0ea5e9' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Clouds (%) / Rain (mm)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 11 } }}
              stroke="#6b7280"
              fontSize={11}
              tick={{ fill: '#6b7280' }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              formatter={(value) => {
                if (value === 'windSpeed') return '💨 Wind Speed';
                if (value === 'cloudiness') return '☁️ Cloudiness';
                if (value === 'rain') return '🌧️ Rain';
                return value;
              }}
            />
            
            {/* Rain area (background) */}
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="rain"
              fill="#93c5fd"
              fillOpacity={0.3}
              stroke="#3b82f6"
              strokeWidth={2}
              name="rain"
            />
            
            {/* Wind speed line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="windSpeed"
              stroke="#0ea5e9"
              strokeWidth={2.5}
              dot={{ fill: '#0ea5e9', r: 3 }}
              activeDot={{ r: 5 }}
              name="windSpeed"
            />
            
            {/* Cloudiness line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cloudiness"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#9ca3af', r: 2.5 }}
              activeDot={{ r: 4 }}
              name="cloudiness"
            />
            
            {/* Tide reference lines */}
            {tideLines.map((tide, index) => {
              if (tide.index === null) return null;
              return (
                <ReferenceLine
                  key={`tide-${index}`}
                  x={chartData[tide.index]?.time}
                  stroke={tide.type === 'high' ? '#10b981' : '#3b82f6'}
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  label={{
                    value: tide.type === 'high' ? 'High Tide' : 'Low Tide',
                    position: 'top',
                    fill: tide.type === 'high' ? '#10b981' : '#3b82f6',
                    fontSize: 10,
                  }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

