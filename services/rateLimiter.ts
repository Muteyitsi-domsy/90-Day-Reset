/**
 * Rate Limiter and Request Queue for Gemini API
 *
 * This service implements:
 * - Request queuing to prevent concurrent API calls
 * - Rate limiting based on free tier limits
 * - Exponential backoff retry logic
 * - Quota error handling
 */

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  maxRetries: number;
  baseDelayMs: number;
}

export interface QueuedRequest<T> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  retries: number;
  cacheKey?: string;
}

export class RateLimiter {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private requestTimestamps: number[] = [];
  private dailyRequestCount = 0;
  private lastResetDate: string;
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    // Conservative defaults for Gemini free tier
    this.config = {
      requestsPerMinute: 10,     // Conservative: free tier is usually 15 RPM
      requestsPerDay: 1000,       // Conservative: free tier varies
      maxRetries: 3,
      baseDelayMs: 1000,
      ...config
    };

    this.lastResetDate = new Date().toDateString();
    this.loadDailyCount();
  }

  /**
   * Load daily request count from localStorage
   */
  private loadDailyCount(): void {
    try {
      const stored = localStorage.getItem('gemini_daily_count');
      if (stored) {
        const data = JSON.parse(stored);
        const today = new Date().toDateString();

        if (data.date === today) {
          this.dailyRequestCount = data.count;
        } else {
          // New day, reset counter
          this.dailyRequestCount = 0;
          this.saveDailyCount();
        }
      }
    } catch (error) {
      console.error('Failed to load daily count:', error);
    }
  }

  /**
   * Save daily request count to localStorage
   */
  private saveDailyCount(): void {
    try {
      localStorage.setItem('gemini_daily_count', JSON.stringify({
        date: new Date().toDateString(),
        count: this.dailyRequestCount
      }));
    } catch (error) {
      console.error('Failed to save daily count:', error);
    }
  }

  /**
   * Check if we're within rate limits
   */
  private canMakeRequest(): { allowed: boolean; reason?: string; retryAfter?: number } {
    const now = Date.now();
    const today = new Date().toDateString();

    // Reset daily counter if it's a new day
    if (today !== this.lastResetDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
      this.saveDailyCount();
    }

    // Check daily limit
    if (this.dailyRequestCount >= this.config.requestsPerDay) {
      return {
        allowed: false,
        reason: 'Daily quota exceeded',
        retryAfter: this.getTimeUntilMidnight()
      };
    }

    // Clean up old timestamps (older than 1 minute)
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);

    // Check per-minute limit
    if (this.requestTimestamps.length >= this.config.requestsPerMinute) {
      const oldestTimestamp = this.requestTimestamps[0];
      const retryAfter = 60000 - (now - oldestTimestamp);
      return {
        allowed: false,
        reason: 'Rate limit exceeded (requests per minute)',
        retryAfter
      };
    }

    return { allowed: true };
  }

  /**
   * Get milliseconds until midnight (for daily quota reset)
   */
  private getTimeUntilMidnight(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  /**
   * Record a successful request
   */
  private recordRequest(): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.dailyRequestCount++;
    this.saveDailyCount();
  }

  /**
   * Calculate delay for exponential backoff
   */
  private getBackoffDelay(retries: number): number {
    return this.config.baseDelayMs * Math.pow(2, retries);
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue[0];

      const { allowed, reason, retryAfter } = this.canMakeRequest();

      if (!allowed) {
        // Rate limit hit, wait and try again
        console.warn(`Rate limit: ${reason}. Retrying in ${Math.ceil((retryAfter || 1000) / 1000)}s`);
        await this.sleep(retryAfter || 1000);
        continue;
      }

      // Remove from queue
      this.queue.shift();

      try {
        // Execute the request
        const result = await request.fn();

        // Record successful request
        this.recordRequest();

        // Resolve the promise
        request.resolve(result);

        // Small delay between requests to avoid bursting
        await this.sleep(100);

      } catch (error: any) {
        // Check if it's a quota error (429)
        const isQuotaError = this.isQuotaError(error);

        if (isQuotaError && request.retries < this.config.maxRetries) {
          // Retry with exponential backoff
          const backoffDelay = this.getBackoffDelay(request.retries);
          console.warn(`Quota error, retrying in ${backoffDelay}ms (attempt ${request.retries + 1}/${this.config.maxRetries})`);

          request.retries++;

          // Re-add to queue after delay
          await this.sleep(backoffDelay);
          this.queue.unshift(request); // Add to front of queue

        } else {
          // Max retries reached or non-quota error
          request.reject(error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Check if error is a quota/rate limit error
   */
  private isQuotaError(error: any): boolean {
    if (!error) return false;

    const errorString = error.toString().toLowerCase();
    const errorMessage = error.message?.toLowerCase() || '';

    return (
      errorString.includes('429') ||
      errorString.includes('quota') ||
      errorString.includes('rate limit') ||
      errorMessage.includes('quota exceeded') ||
      errorMessage.includes('resource_exhausted')
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enqueue a request
   */
  public async enqueue<T>(
    fn: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `${Date.now()}-${Math.random()}`,
        fn,
        resolve,
        reject,
        retries: 0,
        cacheKey
      };

      this.queue.push(request);
      this.processQueue();
    });
  }

  /**
   * Get current status
   */
  public getStatus(): {
    queueLength: number;
    dailyRequestCount: number;
    dailyLimit: number;
    recentRequests: number;
    minuteLimit: number;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length;

    return {
      queueLength: this.queue.length,
      dailyRequestCount: this.dailyRequestCount,
      dailyLimit: this.config.requestsPerDay,
      recentRequests,
      minuteLimit: this.config.requestsPerMinute
    };
  }

  /**
   * Clear the queue (use with caution)
   */
  public clearQueue(): void {
    this.queue.forEach(req => {
      req.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Reset daily counter (for testing)
   */
  public resetDailyCounter(): void {
    this.dailyRequestCount = 0;
    this.saveDailyCount();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
