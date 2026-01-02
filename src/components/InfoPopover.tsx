import { useState, useRef, useEffect } from 'react';
import styles from './InfoPopover.module.css';

interface InfoPopoverProps {
  title?: string;
  content: React.ReactNode;
  activityType?: 'snorkeling' | 'kayaking' | 'sup' | 'fishing';
}

export const InfoPopover = ({ title, content, activityType }: InfoPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Activity-specific explanations
  const getActivityContext = () => {
    if (!activityType) return null;

    const contexts: Record<string, string> = {
      snorkeling: 'Wind affects water clarity. Clouds affect light but don\'t block snorkeling.',
      kayaking: 'Wind is the primary factor. Clouds don\'t affect kayaking conditions.',
      sup: 'Wind is critical - SUP is the most wind-sensitive activity. Clouds are irrelevant.',
      fishing: 'Tide timing is most important. Wind and clouds are secondary factors.',
    };

    return contexts[activityType];
  };

  const activityContext = getActivityContext();

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.infoButton}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="Show condition explanations"
        aria-expanded={isOpen}
        type="button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 12V8M8 4H8.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div 
            className={styles.backdrop}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            aria-hidden="true"
          />
          <div className={styles.popover}>
            <div className={styles.popoverContent}>
            {title && <h4 className={styles.popoverTitle}>{title}</h4>}
            <div className={styles.popoverBody}>
              {content}
              {activityContext && (
                <div className={styles.activityContext}>
                  <strong>Note:</strong> {activityContext}
                </div>
              )}
            </div>
            <button
              className={styles.closeButton}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-label="Close"
            >
              ✓
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

