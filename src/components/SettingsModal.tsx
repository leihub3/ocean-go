import { useState, useEffect, useRef } from 'react';
import type { ActivityType } from '../types';
import type { UserSettings } from '../hooks/useSettings';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => void;
  onClose: () => void;
}

const ALL_ACTIVITIES: ActivityType[] = ['snorkeling', 'kayaking', 'sup', 'fishing'];
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  snorkeling: '🤿 Snorkeling',
  kayaking: '🛶 Kayaking',
  sup: '🏄 SUP',
  fishing: '🎣 Fishing',
};

export const SettingsModal = ({ settings, onUpdate, onClose }: SettingsModalProps) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management and keyboard shortcuts
  useEffect(() => {
    // Focus close button when modal opens
    closeButtonRef.current?.focus();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Trap focus within modal
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, []);

  const handleActivityToggle = (activity: ActivityType) => {
    const newActivities = localSettings.preferredActivities.includes(activity)
      ? localSettings.preferredActivities.filter(a => a !== activity)
      : [...localSettings.preferredActivities, activity];
    
    setLocalSettings(prev => ({ ...prev, preferredActivities: newActivities }));
  };

  const handleSave = () => {
    onUpdate(localSettings);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} ref={modalRef}>
        <div className={styles.header}>
          <h2 id="settings-title" className={styles.title}>Settings</h2>
          <button 
            ref={closeButtonRef}
            className={styles.closeButton} 
            onClick={onClose} 
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Preferred Activities</h3>
            <p className={styles.sectionDescription}>
              Select which activities to show in your feed
            </p>
            <div className={styles.activityList}>
              {ALL_ACTIVITIES.map(activity => (
                <label key={activity} className={styles.activityItem}>
                  <input
                    type="checkbox"
                    checked={localSettings.preferredActivities.includes(activity)}
                    onChange={() => handleActivityToggle(activity)}
                  />
                  <span>{ACTIVITY_LABELS[activity]}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Auto-Refresh Interval</h3>
            <p className={styles.sectionDescription}>
              How often to automatically refresh conditions
            </p>
            <div className={styles.radioGroup}>
              {[5, 10, 15, 30].map(minutes => (
                <label key={minutes} className={styles.radioItem}>
                  <input
                    type="radio"
                    name="refreshInterval"
                    value={minutes}
                    checked={localSettings.autoRefreshInterval === minutes}
                    onChange={() => setLocalSettings(prev => ({ ...prev, autoRefreshInterval: minutes }))}
                  />
                  <span>{minutes} minutes</span>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Temperature Unit</h3>
            <div className={styles.radioGroup}>
              <label className={styles.radioItem}>
                <input
                  type="radio"
                  name="temperatureUnit"
                  value="celsius"
                  checked={localSettings.temperatureUnit === 'celsius'}
                  onChange={() => setLocalSettings(prev => ({ ...prev, temperatureUnit: 'celsius' }))}
                />
                <span>°C (Celsius)</span>
              </label>
              <label className={styles.radioItem}>
                <input
                  type="radio"
                  name="temperatureUnit"
                  value="fahrenheit"
                  checked={localSettings.temperatureUnit === 'fahrenheit'}
                  onChange={() => setLocalSettings(prev => ({ ...prev, temperatureUnit: 'fahrenheit' }))}
                />
                <span>°F (Fahrenheit)</span>
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <label className={styles.switchItem}>
              <input
                type="checkbox"
                checked={localSettings.notificationsEnabled}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
              />
              <div className={styles.switchContent}>
                <span className={styles.switchLabel}>Enable Notifications</span>
                <span className={styles.switchDescription}>
                  Get alerts when conditions improve for your preferred activities
                </span>
              </div>
            </label>
          </section>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

