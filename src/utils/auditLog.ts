/**
 * Audit Logging System
 * Tracks security-relevant events and data modifications
 *
 * Features:
 * - User authentication events
 * - Data access and modifications
 * - Security setting changes
 * - MFA events
 * - Failed authentication attempts
 *
 * Security: Logs stored in Firestore with user-scoped access
 */

import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

/**
 * Audit event types
 */
export type AuditEventType =
  // Authentication events
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'auth.password_reset'
  | 'auth.signup'

  // MFA events
  | 'mfa.enabled'
  | 'mfa.disabled'
  | 'mfa.verification_success'
  | 'mfa.verification_failed'
  | 'mfa.backup_code_used'

  // PIN events
  | 'pin.set'
  | 'pin.changed'
  | 'pin.removed'
  | 'pin.verification_failed'
  | 'pin.locked_out'
  | 'pin.recovery_initiated'

  // Data events
  | 'data.journal_created'
  | 'data.journal_updated'
  | 'data.journal_deleted'
  | 'data.mood_created'
  | 'data.mood_updated'
  | 'data.mood_deleted'
  | 'data.profile_updated'

  // Settings events
  | 'settings.updated'
  | 'settings.theme_changed'
  | 'settings.privacy_changed'

  // Journey events
  | 'journey.paused'
  | 'journey.resumed'
  | 'journey.completed'

  // Security events
  | 'security.suspicious_activity'
  | 'security.session_expired'
  | 'security.ip_change';

/**
 * Audit event severity levels
 */
export type AuditSeverity = 'info' | 'warning' | 'critical';

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  id?: string;
  userId: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  timestamp: Timestamp | Date;

  // Event details
  description: string;
  metadata?: Record<string, any>;

  // Context
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;

  // Result
  success: boolean;
  errorMessage?: string;
}

/**
 * Configuration for audit logging
 */
const AUDIT_CONFIG = {
  COLLECTION_NAME: 'auditLogs',
  MAX_ENTRIES_PER_QUERY: 100,
  RETENTION_DAYS: 90, // Keep logs for 90 days

  // Event severity mapping
  SEVERITY_MAP: {
    // Critical events
    'auth.login_failed': 'critical',
    'mfa.verification_failed': 'critical',
    'pin.verification_failed': 'critical',
    'pin.locked_out': 'critical',
    'security.suspicious_activity': 'critical',
    'mfa.disabled': 'critical',

    // Warning events
    'auth.password_reset': 'warning',
    'pin.recovery_initiated': 'warning',
    'security.session_expired': 'warning',
    'security.ip_change': 'warning',
    'data.journal_deleted': 'warning',
    'data.mood_deleted': 'warning',

    // Info events (default for everything else)
  } as Record<string, AuditSeverity>,
};

/**
 * Gets the severity level for an event type
 */
function getSeverity(eventType: AuditEventType): AuditSeverity {
  return AUDIT_CONFIG.SEVERITY_MAP[eventType] || 'info';
}

/**
 * Gets device fingerprint for tracking
 */
function getDeviceFingerprint(): string {
  const nav = navigator;
  const screen = window.screen;

  const components = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `device_${Math.abs(hash).toString(16)}`;
}

/**
 * Logs an audit event to Firestore
 *
 * @param userId - User ID associated with the event
 * @param eventType - Type of event being logged
 * @param description - Human-readable description
 * @param options - Additional options
 */
export async function logAuditEvent(
  userId: string,
  eventType: AuditEventType,
  description: string,
  options?: {
    metadata?: Record<string, any>;
    success?: boolean;
    errorMessage?: string;
    ipAddress?: string;
  }
): Promise<void> {
  try {
    const db = getFirestore();
    const auditCollection = collection(db, AUDIT_CONFIG.COLLECTION_NAME);

    const entry: Omit<AuditLogEntry, 'id'> = {
      userId,
      eventType,
      severity: getSeverity(eventType),
      timestamp: Timestamp.now(),
      description,
      metadata: options?.metadata,
      userAgent: navigator.userAgent,
      deviceId: getDeviceFingerprint(),
      ipAddress: options?.ipAddress,
      success: options?.success !== undefined ? options.success : true,
      errorMessage: options?.errorMessage,
    };

    await addDoc(auditCollection, entry);

    // Also log critical events to console for immediate visibility
    if (entry.severity === 'critical') {
      console.warn('[AUDIT] Critical event:', {
        eventType,
        description,
        userId,
      });
    }
  } catch (error) {
    // Don't throw errors from audit logging - it shouldn't break the app
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Retrieves audit logs for a user
 *
 * @param userId - User ID to fetch logs for
 * @param options - Query options
 * @returns Array of audit log entries
 */
export async function getAuditLogs(
  userId: string,
  options?: {
    eventType?: AuditEventType;
    severity?: AuditSeverity;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<AuditLogEntry[]> {
  try {
    const db = getFirestore();
    const auditCollection = collection(db, AUDIT_CONFIG.COLLECTION_NAME);

    // Build query
    let q = query(
      auditCollection,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    // Add optional filters
    if (options?.eventType) {
      q = query(q, where('eventType', '==', options.eventType));
    }

    if (options?.severity) {
      q = query(q, where('severity', '==', options.severity));
    }

    // Apply limit
    const queryLimit = options?.limit || AUDIT_CONFIG.MAX_ENTRIES_PER_QUERY;
    q = query(q, limit(queryLimit));

    const snapshot = await getDocs(q);
    const logs: AuditLogEntry[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp,
      } as AuditLogEntry);
    });

    // Filter by date range if specified
    if (options?.startDate || options?.endDate) {
      return logs.filter((log) => {
        const logDate = log.timestamp instanceof Timestamp
          ? log.timestamp.toDate()
          : log.timestamp;

        if (options.startDate && logDate < options.startDate) return false;
        if (options.endDate && logDate > options.endDate) return false;
        return true;
      });
    }

    return logs;
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Gets a summary of recent security events
 *
 * @param userId - User ID to fetch summary for
 * @returns Summary of security events
 */
export async function getSecuritySummary(userId: string): Promise<{
  totalEvents: number;
  criticalEvents: number;
  warningEvents: number;
  failedLogins: number;
  lastLogin?: Date;
  recentEvents: AuditLogEntry[];
}> {
  try {
    const logs = await getAuditLogs(userId, { limit: 50 });

    const criticalEvents = logs.filter((log) => log.severity === 'critical').length;
    const warningEvents = logs.filter((log) => log.severity === 'warning').length;
    const failedLogins = logs.filter((log) => log.eventType === 'auth.login_failed').length;

    const lastLoginLog = logs.find((log) => log.eventType === 'auth.login');
    const lastLogin = lastLoginLog?.timestamp instanceof Timestamp
      ? lastLoginLog.timestamp.toDate()
      : undefined;

    return {
      totalEvents: logs.length,
      criticalEvents,
      warningEvents,
      failedLogins,
      lastLogin,
      recentEvents: logs.slice(0, 10),
    };
  } catch (error) {
    console.error('Failed to fetch security summary:', error);
    return {
      totalEvents: 0,
      criticalEvents: 0,
      warningEvents: 0,
      failedLogins: 0,
      recentEvents: [],
    };
  }
}

/**
 * Convenience functions for common audit events
 */

export const auditLog = {
  // Authentication
  login: (userId: string, metadata?: Record<string, any>) =>
    logAuditEvent(userId, 'auth.login', 'User logged in', { metadata, success: true }),

  logout: (userId: string) =>
    logAuditEvent(userId, 'auth.logout', 'User logged out'),

  loginFailed: (userId: string, reason: string) =>
    logAuditEvent(userId, 'auth.login_failed', `Login failed: ${reason}`, {
      success: false,
      errorMessage: reason
    }),

  signup: (userId: string, metadata?: Record<string, any>) =>
    logAuditEvent(userId, 'auth.signup', 'New user account created', { metadata }),

  // MFA
  mfaEnabled: (userId: string) =>
    logAuditEvent(userId, 'mfa.enabled', 'Two-factor authentication enabled'),

  mfaDisabled: (userId: string) =>
    logAuditEvent(userId, 'mfa.disabled', 'Two-factor authentication disabled'),

  mfaVerified: (userId: string) =>
    logAuditEvent(userId, 'mfa.verification_success', 'MFA code verified successfully'),

  mfaFailed: (userId: string) =>
    logAuditEvent(userId, 'mfa.verification_failed', 'MFA verification failed', {
      success: false
    }),

  backupCodeUsed: (userId: string, codesRemaining: number) =>
    logAuditEvent(userId, 'mfa.backup_code_used', 'MFA backup code used', {
      metadata: { codesRemaining }
    }),

  // PIN
  pinSet: (userId: string) =>
    logAuditEvent(userId, 'pin.set', 'PIN lock enabled'),

  pinChanged: (userId: string) =>
    logAuditEvent(userId, 'pin.changed', 'PIN lock changed'),

  pinRemoved: (userId: string) =>
    logAuditEvent(userId, 'pin.removed', 'PIN lock removed'),

  pinFailed: (userId: string, attemptsRemaining: number) =>
    logAuditEvent(userId, 'pin.verification_failed', 'PIN verification failed', {
      success: false,
      metadata: { attemptsRemaining }
    }),

  pinLockedOut: (userId: string, lockoutMinutes: number) =>
    logAuditEvent(userId, 'pin.locked_out', `Account locked due to failed PIN attempts`, {
      metadata: { lockoutMinutes }
    }),

  // Data operations
  journalCreated: (userId: string, entryId: string, day: number) =>
    logAuditEvent(userId, 'data.journal_created', `Journal entry created for day ${day}`, {
      metadata: { entryId, day }
    }),

  journalUpdated: (userId: string, entryId: string, day: number) =>
    logAuditEvent(userId, 'data.journal_updated', `Journal entry updated for day ${day}`, {
      metadata: { entryId, day }
    }),

  journalDeleted: (userId: string, entryId: string, day: number) =>
    logAuditEvent(userId, 'data.journal_deleted', `Journal entry deleted for day ${day}`, {
      metadata: { entryId, day }
    }),

  moodCreated: (userId: string, entryId: string, mood: string, day: number) =>
    logAuditEvent(userId, 'data.mood_created', `Mood entry created: ${mood}`, {
      metadata: { entryId, mood, day }
    }),

  profileUpdated: (userId: string, fields: string[]) =>
    logAuditEvent(userId, 'data.profile_updated', 'User profile updated', {
      metadata: { updatedFields: fields }
    }),

  // Journey
  journeyPaused: (userId: string, day: number) =>
    logAuditEvent(userId, 'journey.paused', `Journey paused on day ${day}`, {
      metadata: { day }
    }),

  journeyResumed: (userId: string, day: number) =>
    logAuditEvent(userId, 'journey.resumed', `Journey resumed on day ${day}`, {
      metadata: { day }
    }),

  journeyCompleted: (userId: string) =>
    logAuditEvent(userId, 'journey.completed', '90-day journey completed successfully'),
};
