import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;
  threshold?: number; // pixels to pull before triggering
}

export const usePullToRefresh = ({
  onRefresh,
  enabled = true,
  threshold = 80,
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const isPulling = useRef(false);
  const touchStartY = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const container = document.querySelector('[data-main-content]') as HTMLElement;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at the top of the scrollable area
      if ((window.scrollY === 0 || container.scrollTop === 0) && e.touches[0]) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || !e.touches[0]) return;

      const currentTouchY = e.touches[0].clientY;
      const deltaY = currentTouchY - touchStartY.current;

      if (deltaY > 0 && (window.scrollY === 0 || container.scrollTop === 0)) {
        // Only allow pull down when at top
        e.preventDefault();
        const distance = Math.min(deltaY * 0.5, threshold * 1.5); // Dampen the pull
        setPullDistance(distance);
      } else if (deltaY < 0) {
        // Reset if pulling up
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;

      isPulling.current = false;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(0);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold, pullDistance, isRefreshing, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1),
  };
};

