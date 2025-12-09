/**
 * Analysis Cache Service
 *
 * Caches Gemini API analysis results to avoid redundant API calls
 * Uses localStorage with TTL (time-to-live) for cache invalidation
 */

import { EntryAnalysis } from '../types';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class AnalysisCache {
  private readonly CACHE_PREFIX = 'gemini_cache_';
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Generate cache key from content
   */
  private generateKey(content: string, type: string): string {
    // Simple hash function for cache key
    const hash = this.hashString(content);
    return `${this.CACHE_PREFIX}${type}_${hash}`;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached result
   */
  public get<T>(content: string, type: string): T | null {
    try {
      const key = this.generateKey(content, type);
      const cached = localStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);

      // Check if cache is expired
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        // Cache expired, remove it
        this.remove(content, type);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  /**
   * Set cached result
   */
  public set<T>(content: string, type: string, data: T, ttl?: number): void {
    try {
      const key = this.generateKey(content, type);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.DEFAULT_TTL
      };

      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('Error writing to cache:', error);
      // If localStorage is full, try to clear old entries
      this.clearExpired();
    }
  }

  /**
   * Remove cached result
   */
  public remove(content: string, type: string): void {
    try {
      const key = this.generateKey(content, type);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from cache:', error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  public clearExpired(): void {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const cached = localStorage.getItem(key);
          if (cached) {
            try {
              const entry: CacheEntry<any> = JSON.parse(cached);
              if (now - entry.timestamp > entry.ttl) {
                localStorage.removeItem(key);
              }
            } catch {
              // Invalid entry, remove it
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  public clearAll(): void {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    totalEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    try {
      const keys = Object.keys(localStorage);
      let totalEntries = 0;
      let totalSize = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;

      for (const key of keys) {
        if (key.startsWith(this.CACHE_PREFIX)) {
          totalEntries++;
          const cached = localStorage.getItem(key);
          if (cached) {
            totalSize += cached.length;

            try {
              const entry: CacheEntry<any> = JSON.parse(cached);
              if (oldestEntry === null || entry.timestamp < oldestEntry) {
                oldestEntry = entry.timestamp;
              }
              if (newestEntry === null || entry.timestamp > newestEntry) {
                newestEntry = entry.timestamp;
              }
            } catch {
              // Skip invalid entries
            }
          }
        }
      }

      return {
        totalEntries,
        totalSize,
        oldestEntry,
        newestEntry
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  /**
   * Check if content has been analyzed (ignoring expiry)
   */
  public hasBeenAnalyzed(content: string, type: string): boolean {
    try {
      const key = this.generateKey(content, type);
      return localStorage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const analysisCache = new AnalysisCache();
