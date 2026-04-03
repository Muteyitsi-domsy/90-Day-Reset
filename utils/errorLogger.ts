export interface ErrorLog {
  timestamp: string;
  message: string;
  context?: Record<string, any>;
  userAgent: string;
  url: string;
}

class ErrorLogger {
  private maxLogs = 50;
  private storageKey = 'errorLogs';

  log(error: Error, context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorLog);
    }

    this.storeError(errorLog);
  }

  logMessage(message: string, context?: Record<string, any>): void {
    this.log(new Error(message), context);
  }

  private storeError(errorLog: ErrorLog): void {
    try {
      const logs = this.getLogs();
      logs.push(errorLog);
      localStorage.setItem(this.storageKey, JSON.stringify(logs.slice(-this.maxLogs)));
    } catch {
      // localStorage unavailable — silently skip
    }
  }

  getLogs(): ErrorLog[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  clearLogs(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // ignore
    }
  }

  getStats(): { total: number; lastError: ErrorLog | null } {
    const logs = this.getLogs();
    return {
      total: logs.length,
      lastError: logs.at(-1) ?? null,
    };
  }
}

export const errorLogger = new ErrorLogger();

export const logError = (error: Error, context?: Record<string, any>): void => {
  errorLogger.log(error, context);
};
