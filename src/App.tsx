import { useState, useEffect, useCallback, useRef } from 'react';
import type { OceanGoResponse, Region, ActivityType } from './types';
import { REGIONS, DEFAULT_REGION } from './data/regions';
import { getActivityRecommendations } from './services/activityService';
import { RegionSelector } from './components/RegionSelector';
import { ActivityCard } from './components/ActivityCard';
import { RefreshButton } from './components/RefreshButton';
import { CurrentConditions } from './components/CurrentConditions';
import { CurrentConditionsSkeleton } from './components/CurrentConditionsSkeleton';
import { ActivityCardSkeleton } from './components/ActivityCardSkeleton';
import { ErrorMessage } from './components/ErrorMessage';
import { AutoRefreshToggle } from './components/AutoRefreshToggle';
import { ActivityDetailsModal } from './components/ActivityDetailsModal';
import { FavoriteButton } from './components/FavoriteButton';
import { FavoritesMenu } from './components/FavoritesMenu';
import { ShareButton } from './components/ShareButton';
import { OceanConditionsChart } from './components/OceanConditionsChart';
import { SettingsButton } from './components/SettingsButton';
import { SettingsModal } from './components/SettingsModal';
import { EmptyState } from './components/EmptyState';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useFavorites } from './hooks/useFavorites';
import { useSettings } from './hooks/useSettings';
import styles from './App.module.css';

const ACTIVITY_ORDER: ActivityType[] = ['snorkeling', 'kayaking', 'sup', 'fishing'];

function App() {
  const [selectedRegion, setSelectedRegion] = useState<Region>(DEFAULT_REGION || REGIONS[0]!);
  const [data, setData] = useState<OceanGoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const autoRefreshIntervalRef = useRef<number | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { favorites, toggleFavorite, isFavorite, removeFavorite } = useFavorites();
  const { settings, updateSettings } = useSettings();

  // Handle URL parameter for region
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const regionParam = params.get('region');
    if (regionParam) {
      const regionFromUrl = REGIONS.find(r => r.id === regionParam);
      if (regionFromUrl) {
        setSelectedRegion(regionFromUrl);
      }
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const recommendations = await getActivityRecommendations(selectedRegion.id);
      setData(recommendations);
      
      // Check if response indicates mock data is being used
      if (recommendations.errors && recommendations.errors.length > 0) {
        const hasMockData = recommendations.errors.some(e => e.fallbackUsed);
        setIsUsingMockData(hasMockData);
      } else {
        setIsUsingMockData(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations. Please try again.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegion]);

  // Initial fetch and when region changes
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Auto-refresh setup
  useEffect(() => {
    // Clear any existing interval
    if (autoRefreshIntervalRef.current !== null) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }

    // Only set up auto-refresh if enabled and not currently loading
    if (autoRefreshEnabled && !isLoading) {
      const intervalMs = settings.autoRefreshInterval * 60 * 1000;
      
      autoRefreshIntervalRef.current = window.setInterval(() => {
        // Only refresh if tab is visible (use Page Visibility API)
        if (document.visibilityState === 'visible') {
          fetchRecommendations();
        }
      }, intervalMs);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoRefreshIntervalRef.current !== null) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, isLoading, fetchRecommendations, settings.autoRefreshInterval]);

  // Pause auto-refresh when tab is hidden, resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab hidden - intervals will be paused naturally
        // (they'll resume when tab becomes visible again)
      } else if (document.visibilityState === 'visible' && autoRefreshEnabled) {
        // Tab visible again - refresh immediately if auto-refresh is enabled
        fetchRecommendations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefreshEnabled, fetchRecommendations]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pull to refresh
  const { pullDistance, progress } = usePullToRefresh({
    onRefresh: fetchRecommendations,
    enabled: !isLoading && !error && !isOffline,
  });

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>OceanGo</h1>
            <p className={styles.subtitle}>Can you go out right now?</p>
          </div>
          <SettingsButton onClick={() => setShowSettings(true)} />
        </div>
      </header>

      <main className={styles.main} data-main-content>
        {pullDistance > 0 && (
          <div className={styles.pullToRefresh} style={{ opacity: Math.min(progress, 1) }}>
            <div className={styles.pullToRefreshIcon} style={{ transform: `rotate(${progress * 360}deg)` }}>
              🔄
            </div>
            <div className={styles.pullToRefreshText}>
              {progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
            </div>
          </div>
        )}
        <div className={styles.controls}>
          <div className={styles.regionControls}>
            <RegionSelector
              regions={REGIONS}
              selectedRegion={selectedRegion}
              onRegionChange={setSelectedRegion}
              isLoading={isLoading}
            />
            <div className={styles.regionActions}>
              <FavoriteButton
                isFavorite={isFavorite(selectedRegion.id)}
                onClick={() => toggleFavorite(selectedRegion)}
              />
              {favorites.length > 0 && (
                <button
                  className={styles.favoritesToggle}
                  onClick={() => setShowFavorites(!showFavorites)}
                  aria-label="Toggle favorites menu"
                  aria-expanded={showFavorites}
                >
                  {showFavorites ? '▼' : '▶'} Favorites ({favorites.length})
                </button>
              )}
            </div>
          </div>
          {showFavorites && (
            <FavoritesMenu
              favorites={favorites}
              onSelectRegion={(region) => {
                setSelectedRegion(region);
                setShowFavorites(false);
              }}
              onRemoveFavorite={removeFavorite}
              currentRegionId={selectedRegion.id}
            />
          )}
        </div>

        {isLoading && (
          <>
            <CurrentConditionsSkeleton />
            <div className={styles.activities}>
              {ACTIVITY_ORDER.map((activityKey) => (
                <ActivityCardSkeleton key={activityKey} />
              ))}
            </div>
          </>
        )}

        {isOffline && !data && (
          <EmptyState
            title="You're Offline"
            message="Unable to load ocean conditions. Please check your internet connection and try again."
            icon="📡"
            action={{
              label: 'Retry',
              onClick: fetchRecommendations,
            }}
          />
        )}

        {error && !isLoading && !isOffline && (
          <ErrorMessage
            message={error}
            onRetry={fetchRecommendations}
            isRetrying={isLoading}
          />
        )}

        {!isLoading && !error && data && (
          <>
            {data.conditions && (
              <>
                <CurrentConditions conditions={data.conditions} />
                {(data.hourlyForecast || data.conditions?.hourlyForecast) && (data.hourlyForecast || data.conditions?.hourlyForecast || []).length > 0 && (
                  <OceanConditionsChart
                    hourlyForecast={data.hourlyForecast || data.conditions?.hourlyForecast || []}
                    tides={[
                      ...(data.conditions?.currentTide ? [data.conditions.currentTide] : []),
                      ...(data.conditions?.nextTide ? [data.conditions.nextTide] : []),
                    ]}
                    currentConditions={data.conditions?.weather ? {
                      windSpeed: data.conditions.weather.windSpeed,
                      windDirection: data.conditions.weather.windDirection,
                      cloudiness: data.conditions.weather.cloudiness,
                      rain: data.conditions.weather.rain,
                      temperature: data.conditions.weather.temperature,
                      pressure: data.conditions.weather.pressure,
                      humidity: data.conditions.weather.humidity,
                    } : undefined}
                  />
                )}
              </>
            )}
            {(() => {
              // Filter activities based on user preferences
              const filteredActivities = ACTIVITY_ORDER.filter(
                activityKey => settings.preferredActivities.includes(activityKey)
              );

              if (filteredActivities.length === 0) {
                return (
                  <EmptyState
                    title="No Activities Selected"
                    message="You have filtered out all activities. Go to Settings to enable some activities."
                    icon="🔍"
                    action={{
                      label: 'Open Settings',
                      onClick: () => setShowSettings(true),
                    }}
                  />
                );
              }

              const visibleActivities = filteredActivities
                .map(activityKey => ({
                  key: activityKey,
                  recommendation: data.activities[activityKey],
                }))
                .filter(item => item.recommendation);

              if (visibleActivities.length === 0) {
                return (
                  <EmptyState
                    title="No Activity Data"
                    message="Activity recommendations are not available for this region at the moment."
                    icon="📊"
                  />
                );
              }

              return (
                <div className={styles.activities}>
                  {visibleActivities.map(({ key, recommendation }) => {
                    if (!recommendation) return null;
                    return (
                      <ActivityCard
                        key={key}
                        activityName={key}
                        recommendation={recommendation}
                        hourlyForecast={data.hourlyForecast || data.conditions?.hourlyForecast}
                        currentConditions={data.conditions?.weather ? {
                          windSpeed: data.conditions.weather.windSpeed,
                          cloudiness: data.conditions.weather.cloudiness,
                          rain: data.conditions.weather.rain,
                        } : undefined}
                        onClick={() => setSelectedActivity(key)}
                      />
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}

        {!isLoading && !error && data && (
          <div className={styles.footer}>
            <div className={styles.footerControls}>
              <AutoRefreshToggle
                enabled={autoRefreshEnabled}
                interval={settings.autoRefreshInterval}
                onToggle={setAutoRefreshEnabled}
              />
            </div>
            <div className={styles.footerContent}>
              <div className={styles.footerText}>
                <p className={styles.timestamp}>
                  Last updated: {new Date(data.timestamp).toLocaleTimeString()}
                </p>
                {isUsingMockData && (
                  <p className={styles.mockDataIndicator}>
                    ⚠️ Using simulated data (API keys not configured)
                  </p>
                )}
              </div>
              <div className={styles.footerActions}>
                <ShareButton region={selectedRegion} data={data} />
                <RefreshButton onClick={fetchRecommendations} isLoading={isLoading} />
              </div>
            </div>
          </div>
        )}

        {selectedActivity && data && data.activities[selectedActivity] && (
          <ActivityDetailsModal
            activityType={selectedActivity}
            recommendation={data.activities[selectedActivity]}
            conditions={data.conditions}
            onClose={() => setSelectedActivity(null)}
          />
        )}

        {showSettings && (
          <SettingsModal
            settings={settings}
            onUpdate={updateSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </main>
    </div>
  );
}

export default App;

