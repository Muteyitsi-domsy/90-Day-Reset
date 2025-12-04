/**
 * Error logging utility for tracking and reporting errors
 * Can be integrated with services like Sentry, LogRocket, etc.
 */

export interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userAgent: string;
  url: string;
}

class ErrorLogger {
  private maxLogs = 50;
  private storageKey = 'errorLogs';

  /**
   * Log an error to localStorage and console
   */
  log(error: Error, context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorLog);
    }

    // Store in localStorage
    this.storeError(errorLog);

    // TODO: Send to error tracking service
    // this.sendToService(errorLog);
  }

  /**
   * Log a custom message (for non-Error objects)
   */
  logMessage(message: string, context?: Record<string, any>): void {
    const error = new Error(message);
    this.log(error, context);
  }

  /**
   * Store error in localStorage
   */
  private storeError(errorLog: ErrorLog): void {
    try {
      const existingLogs = this.getLogs();
      existingLogs.push(errorLog);

      // Keep only the most recent logs
      if (existingLogs.length > this.maxLogs) {
        existingLogs.shift();
      }

      localStorage.setItem(this.storageKey, JSON.stringify(existingLogs));
    } catch (storageError) {
      console.error('Failed to store error log:', storageError);
    }
  }

  /**
   * Get all stored error logs
   */
  getLogs(): ErrorLog[] {
    try {
      const logs = localStorage.getItem(this.storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to retrieve error logs:', error);
      return [];
    }
  }

  /**
   * Clear all stored error logs
   */
  clearLogs(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear error logs:', error);
    }
  }

  /**
   * Get error statistics
   */
  getStats(): { total: number; lastError: ErrorLog | null } {
    const logs = this.getLogs();
    return {
      total: logs.length,
      lastError: logs.length > 0 ? logs[logs.length - 1] : null
    };
  }

  /**
   * TODO: Send errors to external service (Sentry, LogRocket, etc.)
   * Uncomment and configure when ready to use
   */
  // private async sendToService(errorLog: ErrorLog): Promise<void> {
  //   if (process.env.NODE_ENV === 'production') {
  //     // Example for Sentry:
  //     // Sentry.captureException(new Error(errorLog.message), {
  //     //   extra: errorLog.context
  //     // });
  //   }
  // }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Convenience function for quick error logging
export const logError = (error: Error, context?: Record<string, any>): void => {
  errorLogger.log(error, context);
};
