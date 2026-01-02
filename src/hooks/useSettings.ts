import { useState, useEffect } from 'react';
import type { ActivityType } from '../types';

export interface UserSettings {
  preferredActivities: ActivityType[];
  autoRefreshInterval: number; // minutes
  temperatureUnit: 'celsius' | 'fahrenheit';
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  preferredActivities: ['snorkeling', 'kayaking', 'sup', 'fishing'], // All activities
  autoRefreshInterval: 10, // minutes
  temperatureUnit: 'celsius',
  notificationsEnabled: false,
};

const SETTINGS_STORAGE_KEY = 'oceango_settings';

/**
 * Hook to manage user settings stored in LocalStorage
 */
export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserSettings>;
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    // Save to localStorage whenever settings change
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
  };
};

