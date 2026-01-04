import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { HourlyForecast, TideData } from '../types';
import { InfoPopover } from './InfoPopover';
import { degreesToWindDirection } from '../utils/windDirection';
import styles from './OceanConditionsChart.module.css';

interface OceanConditionsChartProps {
  hourlyForecast: HourlyForecast[];
  tides?: TideData[];
}

/**
 * Interpolate tide height at a given time using sinusoidal interpolation
 * between known high and low tide points
 */
function interpolateTideHeight(
  time: Date,
  tides: TideData[]
): number | null {
  if (!tides || tides.length === 0) return null;

  const targetTime = time.getTime();
  
  let beforeTide: TideData | null = null;
  let afterTide: TideData | null = null;

  for (let i = 0; i < tides.length; i++) {
    const tide = tides[i];
    if (!tide) continue;
    
    const tideTime = new Date(tide.time).getTime();
    if (tideTime <= targetTime) {
      beforeTide = tide;
    }
    if (tideTime > targetTime && !afterTide) {
      afterTide = tide;
      break;
    }
  }

  if (!beforeTide && tides.length > 0 && tides[0]) {
    return tides[0].height;
  }

  const lastTide = tides[tides.length - 1];
  if (!afterTide && lastTide) {
    return lastTide.height;
  }

  if (!beforeTide || !afterTide) return null;

  const beforeTime = new Date(beforeTide.time).getTime();
  const afterTime = new Date(afterTide.time).getTime();
  const duration = afterTime - beforeTime;

  if (duration === 0) return beforeTide.height;

  const position = (targetTime - beforeTime) / duration;
  const sineFactor = Math.sin(Math.PI * position);

  let interpolatedHeight: number;
  
  if (beforeTide.type === 'high' && afterTide.type === 'low') {
    interpolatedHeight = beforeTide.height - (beforeTide.height - afterTide.height) * sineFactor;
  } else if (beforeTide.type === 'low' && afterTide.type === 'high') {
    interpolatedHeight = beforeTide.height + (afterTide.height - beforeTide.height) * sineFactor;
  } else {
    interpolatedHeight = beforeTide.height + (afterTide.height - beforeTide.height) * position;
  }

  return Number(interpolatedHeight.toFixed(2));
}

/**
 * Format date like WindGuru: "L 6.1." (Day abbreviation + day.month)
 */
function formatDayLabel(date: Date): string {
  const dayAbbr = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // Domingo, Lunes, Martes, Miércoles, Jueves, Viernes, Sábado
  const dayOfWeek = date.getDay();
  const day = date.getDate();
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  return `${dayAbbr[dayOfWeek]} ${day}.${month}.`;
}

/**
 * Format time for X-axis: show day when it changes, otherwise just hour
 */
function formatXAxisLabel(time: string, index: number, allTimes: string[]): string {
  const date = new Date(time);
  const hour = date.getHours();
  
  // Always show hour
  const hourLabel = `${hour}h`;
  
  // Show day label at midnight (0h) or at the first entry
  if (hour === 0 || index === 0) {
    const dayLabel = formatDayLabel(date);
    return `${dayLabel} ${hourLabel}`;
  }
  
  // Check if day changed from previous entry
  if (index > 0) {
    const prevTime = allTimes[index - 1];
    if (prevTime) {
      const prevDate = new Date(prevTime);
      const prevDay = prevDate.getDate();
      const currentDay = date.getDate();
      
      if (prevDay !== currentDay) {
        const dayLabel = formatDayLabel(date);
        return `${dayLabel} ${hourLabel}`;
      }
    }
  }
  
  return hourLabel;
}

/**
 * Get wind direction arrow SVG path - WindGuru style (thick, bold arrows)
 */
function getWindArrowPath(degrees: number, size: number = 18): string {
  // Convert meteorological direction (0° = North, clockwise) to screen coordinates
  // Screen: 0° = right (→), 90° = bottom (↓), 180° = left (←), 270° = top (↑)
  // Met: 0° = top (↑), 90° = right (→), 180° = bottom (↓), 270° = left (←)
  const screenAngle = (degrees - 90) * (Math.PI / 180);
  const arrowLength = size * 0.85; // Longer arrow shaft
  const arrowHeadSize = size * 0.4; // Larger arrowhead
  
  const x1 = 0;
  const y1 = 0;
  const x2 = Math.cos(screenAngle) * arrowLength;
  const y2 = Math.sin(screenAngle) * arrowLength;
  
  // Arrow head - wider angle for more visibility
  const headAngle1 = screenAngle + Math.PI * 0.85;
  const headAngle2 = screenAngle + Math.PI * 1.15;
  const hx1 = x2 + Math.cos(headAngle1) * arrowHeadSize;
  const hy1 = y2 + Math.sin(headAngle1) * arrowHeadSize;
  const hx2 = x2 + Math.cos(headAngle2) * arrowHeadSize;
  const hy2 = y2 + Math.sin(headAngle2) * arrowHeadSize;
  
  // Create a filled arrow (more WindGuru-like)
  return `M ${x1} ${y1} L ${x2} ${y2} L ${hx1} ${hy1} L ${x2} ${y2} L ${hx2} ${hy2} Z`;
}

export const OceanConditionsChart = ({
  hourlyForecast,
  tides = [],
}: OceanConditionsChartProps) => {
  // Calculate max wind for cloudiness overlay scaling
  const maxWindKmhForScale = useMemo(() => {
    const speeds = hourlyForecast.slice(0, 24).map(h => h.windSpeed * 3.6);
    return Math.max(...speeds, 20); // Default to 20 if empty
  }, [hourlyForecast]);

  // Prepare data for chart (24 hours)
  const forecast24Hours = hourlyForecast.slice(0, 24);
  const chartData = useMemo(() => {
    return forecast24Hours.map((hour, index) => {
      const time = new Date(hour.time);
      const tideHeight = hour.tideHeight !== undefined 
        ? hour.tideHeight 
        : interpolateTideHeight(time, tides);
      const windKmh = Number((hour.windSpeed * 3.6).toFixed(1));
      const cloudiness = Math.round(hour.cloudiness);
      // Normalize cloudiness to wind scale for overlay (0-100% becomes 0-maxWind scale)
      const cloudinessScaled = (cloudiness / 100) * maxWindKmhForScale;
      // Scale rain to wind axis (max 10mm = maxWind scale, for visibility)
      const rain = Number(hour.rain.toFixed(2));
      const rainScaled = rain > 0 ? (rain / 10) * maxWindKmhForScale : 0; // Scale 0-10mm to wind axis
      
      return {
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeFull: time.toISOString(), // For day calculations
        timeLabel: formatXAxisLabel(hour.time, index, forecast24Hours.map(h => h.time)),
        hour: time.getHours(),
        day: time.getDate(), // For detecting day changes
        windSpeed: Number(hour.windSpeed.toFixed(1)),
        windDirection: hour.windDirection,
        cloudiness,
        cloudinessScaled,
        rain,
        rainScaled,
        tideHeight: tideHeight !== null && tideHeight !== undefined ? tideHeight : null,
        temperature: hour.temperature !== undefined ? Number(hour.temperature.toFixed(1)) : null,
        pressure: hour.pressure !== undefined ? Number(hour.pressure) : null,
        humidity: hour.humidity !== undefined ? Number(hour.humidity) : null,
        windKmh,
        index, // For wind arrow positioning
      };
    });
  }, [hourlyForecast, tides, maxWindKmhForScale]);

  // Calculate min/max tide height for Y-axis domain
  const tideDomain = useMemo(() => {
    const heights = chartData
      .map(d => d.tideHeight)
      .filter((h): h is number => h !== null && h !== undefined);
    if (heights.length === 0) return [0, 1];
    
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const range = maxHeight - minHeight;
    const padding = range * 0.1 || 0.1;
    
    return [
      Math.max(0, minHeight - padding),
      maxHeight + padding,
    ];
  }, [chartData]);

  // Calculate temperature domain
  const tempDomain = useMemo(() => {
    const temps = chartData.filter(d => d.temperature !== null).map(d => d.temperature!);
    if (temps.length === 0) return [20, 30];
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const range = maxTemp - minTemp;
    const padding = range * 0.1 || 1;
    return [Math.round(minTemp - padding), Math.round(maxTemp + padding)];
  }, [chartData]);

  // Calculate pressure domain
  const pressureDomain = useMemo(() => {
    const pressures = chartData.filter(d => d.pressure !== null).map(d => d.pressure!);
    if (pressures.length === 0) return [1000, 1020];
    const minPressure = Math.min(...pressures);
    const maxPressure = Math.max(...pressures);
    const range = maxPressure - minPressure;
    const padding = range * 0.1 || 2;
    return [Math.round(minPressure - padding), Math.round(maxPressure + padding)];
  }, [chartData]);

  // Get tide times for reference lines
  const tideLines = useMemo(() => {
    if (!tides || tides.length === 0) return [];
    
    const now = new Date();
    return tides
      .filter((tide): tide is NonNullable<typeof tide> => tide !== null)
      .filter(tide => {
        const tideTime = new Date(tide.time);
        return tideTime > now && tideTime <= new Date(now.getTime() + 12 * 60 * 60 * 1000);
      })
      .map(tide => {
        const tideTime = new Date(tide.time);
        const chartIndex = hourlyForecast.findIndex(h => {
          const hTime = new Date(h.time);
          return Math.abs(hTime.getTime() - tideTime.getTime()) < 30 * 60 * 1000;
        });
        return {
          type: tide.type,
          time: tide.time,
          hour: tideTime.getHours(),
          height: tide.height,
          index: chartIndex >= 0 ? chartIndex : null,
        };
      });
  }, [tides, hourlyForecast]);

  // Calculate max wind for Y-axis
  const maxWindKmh = Math.max(...chartData.map(d => d.windKmh));

  // Calculate midnight lines for day separation
  const midnightLines = useMemo(() => {
    const lines: Array<{ time: string; day: string; index: number }> = [];
    
    chartData.forEach((data, index) => {
      if (data.hour === 0 && index > 0) {
        // Check if it's actually a new day
        const prevData = chartData[index - 1];
        if (prevData && prevData.day !== data.day) {
          lines.push({
            time: data.time,
            day: formatDayLabel(new Date(data.timeFull)),
            index,
          });
        }
      }
    });
    
    return lines;
  }, [chartData]);

  if (chartData.length === 0) {
    return null;
  }

  const hasRain = chartData.some(d => d.rain > 0);
  const hasTemp = chartData.some(d => d.temperature !== null);
  const hasPressure = chartData.some(d => d.pressure !== null);
  const hasHumidity = chartData.some(d => d.humidity !== null);
  const hasWindDirection = chartData.some(d => d.windDirection !== undefined);
  const hasTide = chartData.some(d => d.tideHeight !== null);

  // Custom dot component for wind direction arrows - WindGuru style
  const WindDirectionDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.windDirection || cx === undefined || cy === undefined) return null;
    
    // cy is already the correct Y position for the wind speed value
    return (
      <g transform={`translate(${cx},${cy})`}>
        {/* Bold black arrow like WindGuru - no white circle */}
        <path
          d={getWindArrowPath(payload.windDirection, 16)}
          stroke="#1f2937"
          strokeWidth={3}
          fill="#1f2937"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  };

  // Tooltips
  const OceanTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipTime}>{data.time}</p>
          <p style={{ color: '#0ea5e9' }}>
            💨 {data.windKmh} km/h ({data.windSpeed} m/s)
            {data.windDirection !== undefined && (
              <span style={{ marginLeft: '8px', fontSize: '11px', color: '#0ea5e9', fontWeight: 600 }}>
                {degreesToWindDirection(data.windDirection)}
              </span>
            )}
          </p>
          {data.tideHeight !== null && (
            <p style={{ color: '#10b981', marginTop: '4px' }}>
              🌊 {data.tideHeight.toFixed(2)} m
            </p>
          )}
          <p style={{ color: '#6b7280', marginTop: '4px' }}>
            ☁️ {data.cloudiness}%
          </p>
          {data.rain > 0 && (
            <p style={{ color: '#3b82f6', marginTop: '4px' }}>
              🌧️ {data.rain.toFixed(1)} mm
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const AtmosphericTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipTime}>{data.time}</p>
          {data.temperature !== null && (
            <p style={{ color: '#f97316' }}>
              🌡️ {data.temperature}°C
            </p>
          )}
          {data.pressure !== null && (
            <p style={{ color: '#3b82f6', marginTop: data.temperature !== null ? '4px' : '0' }}>
              📊 {data.pressure} hPa
            </p>
          )}
          {data.humidity !== null && (
            <p style={{ color: '#10b981', marginTop: (data.temperature !== null || data.pressure !== null) ? '4px' : '0' }}>
              💧 {data.humidity}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>24-Hour Forecast</h3>
        <InfoPopover
          title="Understanding the Forecast"
          content={
            <>
              <p style={{ marginBottom: '12px' }}>
                Hourly forecast of ocean and atmospheric conditions:
              </p>
              <div style={{ marginBottom: '8px' }}>
                <strong>💨 Wind Speed</strong> — Primary safety factor for water activities.
                {hasWindDirection && ' Arrows show wind direction.'}
              </div>
              {hasTide && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>🌊 Tide Height</strong> — Important for fishing and beach access.
                </div>
              )}
              <div style={{ marginBottom: '8px' }}>
                <strong>☁️ Cloudiness</strong> — Affects light and visibility.
              </div>
              {hasRain && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>🌧️ Rain</strong> — Shown in tooltip when precipitation is expected.
                </div>
              )}
              {hasTemp && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>🌡️ Temperature</strong> — Air temperature in Celsius.
                </div>
              )}
              {(hasPressure || hasHumidity) && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>📊 Pressure & 💧 Humidity</strong> — Atmospheric conditions.
                </div>
              )}
            </>
          }
        />
      </div>

      <div className={styles.chartsStack}>
        {/* Ocean Conditions Chart - Large consolidated */}
        <div className={styles.chartSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>🌊</span>
            <h4 className={styles.sectionTitle}>Ocean Conditions</h4>
            {maxWindKmh > 0 && (
              <span className={styles.maxValue}>Max Wind: {maxWindKmh.toFixed(0)} km/h</span>
            )}
          </div>
          
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={280} className={styles.oceanChart}>
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 0, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                {/* Midnight lines for day separation */}
                {midnightLines.map((midnight, idx) => (
                  <ReferenceLine
                    key={`midnight-${idx}`}
                    x={midnight.time}
                    stroke="#9ca3af"
                    strokeDasharray="2 2"
                    strokeWidth={1}
                    strokeOpacity={0.5}
                  />
                ))}
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af"
                  fontSize={11}
                  tick={{ fill: '#6b7280' }}
                  interval={2} // Show every 3 hours (0, 3, 6, 9, 12, 15, 18, 21)
                  tickFormatter={(value, index) => {
                    const dataPoint = chartData[index];
                    return dataPoint?.timeLabel || value;
                  }}
                />
                {/* Wind Speed Y-Axis (left) */}
                <YAxis 
                  yAxisId="wind"
                  label={{ 
                    value: 'Wind (km/h)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: '#0ea5e9', fontSize: 11 }
                  }}
                  stroke="#0ea5e9"
                  fontSize={11}
                  tick={{ fill: '#0ea5e9' }}
                  domain={[0, 'dataMax + 2']}
                  width={40}
                />
                {/* Tide Height Y-Axis (right) */}
                {hasTide && (
                  <YAxis 
                    yAxisId="tide"
                    orientation="right"
                    label={{ 
                      value: 'Tide (m)', 
                      angle: 90, 
                      position: 'insideRight',
                      style: { fill: '#10b981', fontSize: 11 }
                    }}
                    stroke="#10b981"
                    fontSize={11}
                    tick={{ fill: '#10b981' }}
                    domain={tideDomain}
                    width={40}
                  />
                )}
                {/* Cloudiness - shown as overlay line, no separate Y-axis when tide exists */}
                <Tooltip content={<OceanTooltip />} />
                
                {/* Wind Speed - Area and Line */}
                <Area
                  yAxisId="wind"
                  type="monotone"
                  dataKey="windKmh"
                  fill="#0ea5e9"
                  fillOpacity={0.15}
                  stroke="none"
                />
                <Line
                  yAxisId="wind"
                  type="monotone"
                  dataKey="windKmh"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#0ea5e9' }}
                />
                {/* Wind Direction Arrows - shown every 3 hours */}
                {hasWindDirection && (
                  <Line
                    yAxisId="wind"
                    type="monotone"
                    dataKey="windKmh"
                    stroke="none"
                    dot={(props: any) => {
                      // Show arrow every 3 hours (index 0, 3, 6, 9, 12, 15, 18, 21)
                      const index = props.payload?.index;
                      if (index !== undefined && index % 3 === 0) {
                        return <WindDirectionDot {...props} />;
                      }
                      return null;
                    }}
                    activeDot={false}
                  />
                )}
                
                {/* Tide Height */}
                {hasTide && (
                  <>
                    <Area
                      yAxisId="tide"
                      type="monotone"
                      dataKey="tideHeight"
                      fill="#10b981"
                      fillOpacity={0.2}
                      stroke="none"
                    />
                    <Line
                      yAxisId="tide"
                      type="monotone"
                      dataKey="tideHeight"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: '#10b981' }}
                    />
                    {tideLines.map((tide, index) => {
                      if (tide.index === null || tide.index >= chartData.length) return null;
                      return (
                        <ReferenceLine
                          key={`tide-${index}`}
                          yAxisId="tide"
                          x={chartData[tide.index]?.time}
                          stroke={tide.type === 'high' ? '#10b981' : '#3b82f6'}
                          strokeDasharray="2 2"
                          strokeWidth={1.5}
                          label={{
                            value: tide.type === 'high' ? 'High' : 'Low',
                            position: 'insideTop',
                            fill: tide.type === 'high' ? '#10b981' : '#3b82f6',
                            fontSize: 9,
                          }}
                        />
                      );
                    })}
                  </>
                )}
                
                {/* Rain - vertical bars */}
                {hasRain && (
                  <Bar
                    yAxisId="wind"
                    dataKey="rainScaled"
                    fill="#3b82f6"
                    fillOpacity={0.4}
                    radius={[2, 2, 0, 0]}
                    name="rain"
                  />
                )}
                
                {/* Cloudiness - overlay line (no Y-axis, shown as percentage overlay) */}
                <Line
                  yAxisId="wind"
                  type="monotone"
                  dataKey="cloudinessScaled"
                  stroke="#6b7280"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: '#6b7280' }}
                  name="cloudiness"
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
            
            {/* Chart Legend - below chart */}
            <div className={styles.chartLegend}>
              <span className={styles.legendItem}>
                <span className={styles.legendColor} style={{ background: '#0ea5e9' }}></span>
                Wind Speed (km/h)
              </span>
              {hasTide && (
                <span className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ background: '#10b981' }}></span>
                  Tide Height (m)
                </span>
              )}
              <span className={styles.legendItem}>
                <span className={styles.legendLine} style={{ borderColor: '#6b7280' }}></span>
                Clouds (%) - dashed
              </span>
              {hasRain && (
                <span className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ background: '#3b82f6' }}></span>
                  Rain (mm) - bars
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Atmospheric Conditions Chart - Large consolidated */}
        {(hasTemp || hasPressure || hasHumidity) && (
          <div className={styles.chartSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>🌡️</span>
              <h4 className={styles.sectionTitle}>Atmospheric Conditions</h4>
            </div>
            
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={280} className={styles.atmosphericChart}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 0, left: 0, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  {/* Midnight lines for day separation */}
                  {midnightLines.map((midnight, idx) => (
                    <ReferenceLine
                      key={`midnight-atm-${idx}`}
                      x={midnight.time}
                      stroke="#9ca3af"
                      strokeDasharray="2 2"
                      strokeWidth={1}
                      strokeOpacity={0.5}
                    />
                  ))}
                  <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af"
                    fontSize={11}
                    tick={{ fill: '#6b7280' }}
                    interval={2} // Show every 3 hours (0, 3, 6, 9, 12, 15, 18, 21)
                    tickFormatter={(value, index) => {
                      const dataPoint = chartData[index];
                      return dataPoint?.timeLabel || value;
                    }}
                  />
                  {/* Temperature Y-Axis (left) */}
                  {hasTemp && (
                    <YAxis 
                      yAxisId="temp"
                      label={{ 
                        value: 'Temp (°C)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: '#f97316', fontSize: 11 }
                      }}
                      stroke="#f97316"
                      fontSize={11}
                      tick={{ fill: '#f97316' }}
                      domain={tempDomain}
                    />
                  )}
                  {/* Pressure Y-Axis (right) */}
                  {hasPressure && (
                    <YAxis 
                      yAxisId="pressure"
                      orientation="right"
                      label={{ 
                        value: hasHumidity ? 'Pressure (hPa) & Humidity (%)' : 'Pressure (hPa)', 
                        angle: 90, 
                        position: 'insideRight',
                        style: { fill: '#3b82f6', fontSize: 11 }
                      }}
                      stroke="#3b82f6"
                      fontSize={11}
                      tick={{ fill: '#3b82f6' }}
                      domain={pressureDomain}
                      width={40}
                    />
                  )}
                  {/* Humidity - will use same scale as pressure or separate */}
                  {hasHumidity && !hasPressure && (
                    <YAxis 
                      yAxisId="humidity"
                      orientation="right"
                      label={{ 
                        value: 'Humidity (%)', 
                        angle: 90, 
                        position: 'insideRight',
                        style: { fill: '#10b981', fontSize: 11 }
                      }}
                      stroke="#10b981"
                      fontSize={11}
                      tick={{ fill: '#10b981' }}
                      domain={[0, 100]}
                      width={40}
                    />
                  )}
                  <Tooltip content={<AtmosphericTooltip />} />
                  
                  {/* Temperature */}
                  {hasTemp && (
                    <>
                      <Area
                        yAxisId="temp"
                        type="monotone"
                        dataKey="temperature"
                        fill="#f97316"
                        fillOpacity={0.2}
                        stroke="none"
                      />
                      <Line
                        yAxisId="temp"
                        type="monotone"
                        dataKey="temperature"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, fill: '#f97316' }}
                      />
                    </>
                  )}
                  
                  {/* Pressure */}
                  {hasPressure && (
                    <>
                      <Area
                        yAxisId="pressure"
                        type="monotone"
                        dataKey="pressure"
                        fill="#3b82f6"
                        fillOpacity={0.15}
                        stroke="none"
                      />
                      <Line
                        yAxisId="pressure"
                        type="monotone"
                        dataKey="pressure"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#3b82f6' }}
                      />
                    </>
                  )}
                  
                  {/* Humidity */}
                  {hasHumidity && (
                    <>
                      <Area
                        yAxisId={hasPressure ? "pressure" : "humidity"}
                        type="monotone"
                        dataKey="humidity"
                        fill="#10b981"
                        fillOpacity={0.1}
                        stroke="none"
                      />
                      <Line
                        yAxisId={hasPressure ? "pressure" : "humidity"}
                        type="monotone"
                        dataKey="humidity"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ r: 4, fill: '#10b981' }}
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
              
              {/* Chart Legend - below chart */}
              <div className={styles.chartLegend}>
                {hasTemp && (
                  <span className={styles.legendItem}>
                    <span className={styles.legendColor} style={{ background: '#f97316' }}></span>
                    Temperature (°C)
                  </span>
                )}
                {hasPressure && (
                  <span className={styles.legendItem}>
                    <span className={styles.legendColor} style={{ background: '#3b82f6' }}></span>
                    Pressure (hPa)
                  </span>
                )}
                {hasHumidity && (
                  <span className={styles.legendItem}>
                    <span className={styles.legendLine} style={{ borderColor: '#10b981' }}></span>
                    Humidity (%) - dashed
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
