import { useState, useEffect } from 'react';
import type { Region } from '../types';

const FAVORITES_STORAGE_KEY = 'oceango_favorites';

/**
 * Hook to manage favorite regions stored in LocalStorage
 */
export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Region[]>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as Region[];
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
    return [];
  });

  useEffect(() => {
    // Save to localStorage whenever favorites change
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }, [favorites]);

  const addFavorite = (region: Region) => {
    setFavorites(prev => {
      // Don't add if already favorite
      if (prev.some(fav => fav.id === region.id)) {
        return prev;
      }
      return [...prev, region];
    });
  };

  const removeFavorite = (regionId: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== regionId));
  };

  const toggleFavorite = (region: Region) => {
    if (favorites.some(fav => fav.id === region.id)) {
      removeFavorite(region.id);
    } else {
      addFavorite(region);
    }
  };

  const isFavorite = (regionId: string): boolean => {
    return favorites.some(fav => fav.id === regionId);
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
};

