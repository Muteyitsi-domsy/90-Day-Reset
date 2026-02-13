
import React, { useState, useEffect, useRef } from 'react';
import { Settings, UserProfile, JournalEntry, HunchType } from '../types';
import { getDayAndMonth } from '../services/geminiService';
import { QuotaStatus } from './QuotaStatus';
import { ShareButton } from './ShareButton';

interface MenuProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfile | null;
    settings: Settings;
    reports: JournalEntry[];
    onUpdateSettings: (newSettings: Settings) => void;
    onUpdateProfile: (newProfile: UserProfile) => void;
    onPauseJourney: () => void;
    onResumeJourney: () => void;
    onExportData: () => void;
    onImportData: () => void;
    onDeleteData: () => void;
    onViewReport: (report: JournalEntry) => void;
    onRegenerateReport?: (weekOrMonth: number, type: 'weekly' | 'monthly') => void;
    onLockApp?: () => void;
    onRitualComplete?: () => void;
    onOpenCalendar?: () => void;
    userEmail?: string | null;
    onSignOut?: () => void;
    onOpenPrivacyPolicy?: () => void;
    onOpenTerms?: () => void;
    onOpenContact?: () => void;
    onSetupCloudBackup?: () => void;
    // Journaling
    activeView?: 'journey' | 'mood' | 'flip';
    onToggleView?: (view: 'journey' | 'mood' | 'flip') => void;
    calendarView?: 'journey' | 'mood';
    onToggleCalendarView?: (view: 'journey' | 'mood') => void;
    onOpenMoodJournal?: () => void;
}

const ChevronDownIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const Menu: React.FC<MenuProps> = ({
    isOpen, onClose, userProfile, settings, reports,
    onUpdateSettings, onUpdateProfile, onPauseJourney, onResumeJourney,
    onExportData, onImportData, onDeleteData, onViewReport, onRegenerateReport, onLockApp,
    onRitualComplete, onOpenCalendar, userEmail, onSignOut,
    onOpenPrivacyPolicy, onOpenTerms, onOpenContact, onSetupCloudBackup,
    activeView, onToggleView, calendarView, onToggleCalendarView, onOpenMoodJournal
}) => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [pinInput, setPinInput] = useState('');
    const [emailInput, setEmailInput] = useState(userProfile?.email || '');
    const [pinError, setPinError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Daily Ritual state
    const [isEditingRitual, setIsEditingRitual] = useState(false);
    const [ritualNameInput, setRitualNameInput] = useState(settings.ritualName || '');
    const [ritualDurationInput, setRitualDurationInput] = useState(settings.ritualDuration?.toString() || '');
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const wakeLockRef = useRef<any>(null);

    // Check if ritual was completed today (reset daily)
    const today = new Date().toISOString().split('T')[0];
    const ritualCompletedToday = settings.lastRitualDate === today && settings.ritualCompletedToday;

    // Timer effect - counts DOWN from target to 0
    useEffect(() => {
        if (timerRunning && settings.ritualDuration) {
            if (timerSeconds > 0) {
                timerRef.current = setTimeout(() => {
                    setTimerSeconds(prev => prev - 1);
                }, 1000);
            } else {
                setTimerRunning(false);
                // Play completion sound
                playCompletionBeep();
                // Release wake lock when timer completes
                if (wakeLockRef.current) {
                    wakeLockRef.current.release();
                    wakeLockRef.current = null;
                }
            }
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [timerRunning, timerSeconds, settings.ritualDuration]);

    // Wake lock effect - keeps screen awake during meditation
    useEffect(() => {
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator && timerRunning) {
                    wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                }
            } catch (err) {
                console.log('Wake lock request failed:', err);
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLockRef.current) {
                try {
                    await wakeLockRef.current.release();
                    wakeLockRef.current = null;
                } catch (err) {
                    console.log('Wake lock release failed:', err);
                }
            }
        };

        if (timerRunning) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        return () => {
            releaseWakeLock();
        };
    }, [timerRunning]);

    // Reset timer inputs when settings change
    useEffect(() => {
        setRitualNameInput(settings.ritualName || '');
        setRitualDurationInput(settings.ritualDuration?.toString() || '');
    }, [settings.ritualName, settings.ritualDuration]);

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    const handlePinSave = () => {
        console.log('🔍 handlePinSave called');
        console.log('PIN input:', pinInput);
        console.log('Email input:', emailInput);
        console.log('Current settings:', settings);

        if (!/^[a-zA-Z]{4}$/.test(pinInput)) {
            setPinError('PIN must be exactly 4 letters.');
            console.log('❌ PIN validation failed');
            return;
        }
        if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
            setPinError('Please provide a valid email for PIN recovery.');
            console.log('❌ Email validation failed');
            return;
        }

        const wasFirstTimeSettingPin = !settings.pin;
        const newSettings = { ...settings, pin: pinInput.toLowerCase() };
        console.log('✅ Calling onUpdateSettings with:', newSettings);
        onUpdateSettings(newSettings);

        if (userProfile) {
            console.log('✅ Updating profile with email:', emailInput.toLowerCase());
            onUpdateProfile({ ...userProfile, email: emailInput.toLowerCase() });
        }
        setPinInput('');
        setPinError('');

        // Lock app immediately when PIN is first set
        if (wasFirstTimeSettingPin && onLockApp) {
            console.log('🔒 First time setting PIN, will lock app');
            setTimeout(() => {
                onClose();
                onLockApp();
            }, 500); // Small delay to show save feedback
        }
    };

    const handleSyncBackup = () => {
        onExportData(); // Reusing export as backup for V1
    };

    // Daily Ritual handlers
    const handleSaveRitual = () => {
        const duration = ritualDurationInput ? parseInt(ritualDurationInput, 10) : undefined;
        onUpdateSettings({
            ...settings,
            ritualName: ritualNameInput || undefined,
            ritualDuration: duration && duration > 0 ? duration : undefined,
        });
        setIsEditingRitual(false);
    };

    const handleCompleteRitual = () => {
        onUpdateSettings({
            ...settings,
            ritualCompletedToday: true,
            lastRitualDate: today,
        });
        setTimerRunning(false);
        setTimerSeconds(0);
        // Notify parent to update daily completion tracking
        if (onRitualComplete) {
            onRitualComplete();
        }
    };

    const handleStartTimer = () => {
        if (!timerRunning) {
            // If starting fresh, initialize to full duration
            if (timerSeconds === 0 && settings.ritualDuration) {
                setTimerSeconds(settings.ritualDuration * 60);
            }
            setTimerRunning(true);
        } else {
            setTimerRunning(false);
        }
    };

    const handleResetTimer = () => {
        setTimerRunning(false);
        setTimerSeconds(0);
        // Release wake lock on reset
        if (wakeLockRef.current) {
            wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const playCompletionBeep = () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Create a pleasant three-tone chime
            const playTone = (frequency: number, startTime: number, duration: number = 0.3) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';

                // Smooth fade in and out
                gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + startTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + startTime + duration);

                oscillator.start(audioContext.currentTime + startTime);
                oscillator.stop(audioContext.currentTime + startTime + duration);
            };

            // Play three gentle tones (C-E-G chord)
            playTone(523.25, 0);    // C5
            playTone(659.25, 0.35); // E5
            playTone(783.99, 0.7);  // G5

        } catch (error) {
            console.log('Audio notification not available:', error);
        }
    };

    if (!isOpen) return null;

    // Separate weekly and monthly reports
    const weeklyReports = reports.filter(r => r.type === 'weekly_summary_report').sort((a, b) => b.week - a.week);
    const monthlyReports = reports.filter(r => r.type === 'monthly_summary_report').sort((a, b) => {
        const monthA = a.summaryData?.period || 0;
        const monthB = b.summaryData?.period || 0;
        return monthB - monthA;
    });

    const hasUnread = userProfile?.lastViewedReportDate
        ? reports.some(r => new Date(r.date) > new Date(userProfile.lastViewedReportDate!))
        : reports.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex justify-start">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-slide-in-left">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-light text-[var(--text-secondary)]">Menu</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">

                    {/* View Toggle - 90-Day Journey / Daily Journal / Flip Journal */}
                    {onToggleView && (
                        <div className="mb-4">
                            <div className="flex rounded-lg bg-gray-200 dark:bg-gray-800 p-1">
                                <button
                                    onClick={() => {
                                        onToggleView('journey');
                                        onToggleCalendarView?.('journey');
                                    }}
                                    className={`flex-1 py-2 px-2 rounded-md transition-all font-medium text-xs ${
                                        activeView === 'journey'
                                            ? 'bg-white dark:bg-gray-700 shadow text-[var(--accent-primary)]'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    90-Day
                                </button>
                                <button
                                    onClick={() => {
                                        onToggleView('mood');
                                        onToggleCalendarView?.('mood');
                                    }}
                                    className={`flex-1 py-2 px-2 rounded-md transition-all font-medium text-xs ${
                                        activeView === 'mood'
                                            ? 'bg-white dark:bg-gray-700 shadow text-[var(--accent-primary)]'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    Daily
                                </button>
                                <button
                                    onClick={() => {
                                        onToggleView('flip');
                                    }}
                                    className={`flex-1 py-2 px-2 rounded-md transition-all font-medium text-xs ${
                                        activeView === 'flip'
                                            ? 'bg-white dark:bg-gray-700 shadow text-[var(--accent-primary)]'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    Flip
                                </button>
                            </div>
                            {activeView === 'mood' && (
                                <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">
                                    Flexible journaling based on your mood and needs
                                </p>
                            )}
                            {activeView === 'flip' && (
                                <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">
                                    Reframe challenges through your wiser self's eyes
                                </p>
                            )}
                        </div>
                    )}

                    {/* Quick Access: Calendar */}
                    {onOpenCalendar && (
                        <button
                            onClick={() => {
                                onOpenCalendar();
                                onClose();
                            }}
                            className="w-full p-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-hover)] text-white rounded-lg flex items-center justify-between hover:shadow-lg transition-all transform hover:scale-[1.02]"
                        >
                            <div className="flex items-center gap-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <div className="text-left">
                                    <div className="font-semibold">
                                        {calendarView === 'mood' ? 'Mood Calendar' : '90-Day Journey Calendar'}
                                    </div>
                                    <div className="text-xs opacity-90">
                                        {calendarView === 'mood' ? 'View your mood tracking history' : 'View your completion progress'}
                                    </div>
                                </div>
                            </div>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    {/* (a) Intention */}
                    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${activeView !== 'journey' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button onClick={() => toggleSection('intention')} className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <span className="font-medium text-[var(--text-primary)]">My Intention</span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSection === 'intention' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'intention' && (
                            <div className="p-4 bg-[var(--card-bg)] text-[var(--text-primary)] font-light italic border-t border-gray-200 dark:border-gray-700">
                                "{userProfile?.intentions || 'No intention set yet.'}"
                            </div>
                        )}
                    </div>

                    {/* Daily Ritual */}
                    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${activeView !== 'journey' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button onClick={() => toggleSection('ritual')} className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-[var(--text-primary)]">Daily Ritual</span>
                                {ritualCompletedToday && <span className="text-xs text-green-600 dark:text-green-400">Done</span>}
                            </div>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSection === 'ritual' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'ritual' && (
                            <div className="p-4 bg-[var(--card-bg)] border-t border-gray-200 dark:border-gray-700">
                                {!settings.ritualName && !isEditingRitual ? (
                                    // No ritual set - show setup prompt
                                    <div className="text-center space-y-3">
                                        <p className="text-sm text-[var(--text-secondary)] opacity-80">Define your daily ritual to anchor your practice.</p>
                                        <button
                                            onClick={() => setIsEditingRitual(true)}
                                            className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-md text-sm font-medium hover:bg-[var(--accent-primary-hover)]"
                                        >
                                            Set Up Ritual
                                        </button>
                                    </div>
                                ) : isEditingRitual ? (
                                    // Edit mode
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Ritual Name</label>
                                            <input
                                                type="text"
                                                value={ritualNameInput}
                                                onChange={(e) => setRitualNameInput(e.target.value)}
                                                placeholder="e.g., Morning Meditation"
                                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-[var(--text-primary)]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Duration (minutes, optional)</label>
                                            <input
                                                type="number"
                                                value={ritualDurationInput}
                                                onChange={(e) => setRitualDurationInput(e.target.value)}
                                                placeholder="e.g., 10"
                                                min="1"
                                                max="120"
                                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-[var(--text-primary)]"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleSaveRitual}
                                                className="flex-1 py-2 bg-[var(--accent-primary)] text-white rounded-md text-sm font-medium"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditingRitual(false);
                                                    setRitualNameInput(settings.ritualName || '');
                                                    setRitualDurationInput(settings.ritualDuration?.toString() || '');
                                                }}
                                                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // Display mode with timer
                                    <div className="space-y-4">
                                        <div className="text-center">
                                            <h4 className="font-medium text-[var(--text-primary)]">{settings.ritualName}</h4>
                                            {settings.ritualDuration && (
                                                <p className="text-xs text-[var(--text-secondary)] opacity-80">{settings.ritualDuration} minutes</p>
                                            )}
                                        </div>

                                        {/* Timer display - countdown mode */}
                                        {settings.ritualDuration && (
                                            <div className="text-center">
                                                <div className="text-3xl font-mono text-[var(--text-primary)] mb-3">
                                                    {formatTime(timerSeconds === 0 && !timerRunning ? settings.ritualDuration * 60 : timerSeconds)}
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                                                    <div
                                                        className="bg-[var(--accent-primary)] h-2 rounded-full transition-all duration-1000"
                                                        style={{ width: `${Math.min(100, (timerSeconds / (settings.ritualDuration * 60)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex gap-2 justify-center">
                                                    <button
                                                        onClick={handleStartTimer}
                                                        className={`px-4 py-2 rounded-md text-sm font-medium ${timerRunning ? 'bg-amber-500 text-white' : 'bg-[var(--accent-primary)] text-white'}`}
                                                    >
                                                        {timerRunning ? 'Pause' : timerSeconds > 0 ? 'Resume' : 'Start'}
                                                    </button>
                                                    {timerSeconds > 0 && (
                                                        <button
                                                            onClick={handleResetTimer}
                                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm"
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Complete button */}
                                        {!ritualCompletedToday ? (
                                            <button
                                                onClick={handleCompleteRitual}
                                                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
                                            >
                                                Mark as Complete
                                            </button>
                                        ) : (
                                            <div className="text-center py-2 text-green-600 dark:text-green-400 text-sm font-medium">
                                                Completed for today
                                            </div>
                                        )}

                                        {/* Edit button */}
                                        <button
                                            onClick={() => setIsEditingRitual(true)}
                                            className="w-full py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                        >
                                            Edit Ritual
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* (b) Personal North Star */}
                    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${activeView !== 'journey' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button onClick={() => toggleSection('manifesto')} className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <span className="font-medium text-[var(--text-primary)]">Personal North Star</span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSection === 'manifesto' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'manifesto' && (
                            <div className="p-4 bg-[var(--card-bg)] text-[var(--text-primary)] font-light whitespace-pre-wrap leading-relaxed border-t border-gray-200 dark:border-gray-700">
                                {userProfile?.idealSelfManifesto || 'Not yet written.'}
                            </div>
                        )}
                    </div>

                    {/* (c) Reports */}
                    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${(settings.weeklyReports || settings.monthlyReports) && activeView === 'journey' ? '' : 'opacity-50 pointer-events-none'}`}>
                        <button onClick={() => toggleSection('reports')} className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-[var(--text-primary)]">Reports</span>
                                {hasUnread && <span className="h-2 w-2 rounded-full bg-red-500"></span>}
                            </div>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSection === 'reports' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'reports' && (
                            <div className="p-2 bg-[var(--card-bg)] border-t border-gray-200 dark:border-gray-700 space-y-3">
                                {/* Monthly Reports Subsection */}
                                {settings.monthlyReports && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-semibold text-[var(--text-secondary)] px-3 pt-2 uppercase tracking-wide">Monthly Reports</h4>
                                        {monthlyReports.length === 0 ? (
                                            <p className="text-center py-2 text-xs text-[var(--text-secondary)] opacity-70">No monthly reports yet</p>
                                        ) : (
                                            monthlyReports.map(report => (
                                                <button
                                                    key={report.id}
                                                    onClick={() => { onViewReport(report); onClose(); }}
                                                    className="w-full text-left p-3 rounded-md hover:bg-[var(--bg-from)] flex justify-between items-center group"
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm text-[var(--text-secondary)]">
                                                            📅 Month {report.summaryData?.period || ''}
                                                        </p>
                                                        <p className="text-xs text-[var(--text-secondary)] opacity-70">{report.summaryData?.dateRange || new Date(report.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className="text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity">View &rarr;</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Weekly Reports Subsection */}
                                {settings.weeklyReports && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-semibold text-[var(--text-secondary)] px-3 pt-2 uppercase tracking-wide">Weekly Reports</h4>
                                        {weeklyReports.length === 0 ? (
                                            <p className="text-center py-2 text-xs text-[var(--text-secondary)] opacity-70">No weekly reports yet</p>
                                        ) : (
                                            weeklyReports.map(report => (
                                                <button
                                                    key={report.id}
                                                    onClick={() => { onViewReport(report); onClose(); }}
                                                    className="w-full text-left p-3 rounded-md hover:bg-[var(--bg-from)] flex justify-between items-center group"
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm text-[var(--text-secondary)]">
                                                            🌿 Week {report.week}
                                                        </p>
                                                        <p className="text-xs text-[var(--text-secondary)] opacity-70">{report.summaryData?.dateRange || new Date(report.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className="text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity">View &rarr;</span>
                                                </button>
                                            ))
                                        )}
                                        {onRegenerateReport && userProfile && (() => {
                                            const { day } = getDayAndMonth(userProfile.startDate);
                                            const lastCompleteWeek = Math.floor((day - 1) / 7);
                                            if (lastCompleteWeek >= 1) {
                                                return (
                                                    <div className="pt-2">
                                                        <button
                                                            onClick={() => { onRegenerateReport(lastCompleteWeek, 'weekly'); }}
                                                            className="w-full py-2 px-3 text-xs text-[var(--accent-primary)] hover:bg-[var(--bg-from)] rounded-md transition-colors"
                                                        >
                                                            🔄 Regenerate Last Week's Report
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}

                                {!settings.weeklyReports && !settings.monthlyReports && (
                                    <p className="text-center py-4 text-sm text-gray-500">Reports are disabled in settings</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* (d) Settings */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <button onClick={() => toggleSection('settings')} className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <span className="font-medium text-[var(--text-primary)]">Settings</span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSection === 'settings' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'settings' && (
                            <div className="p-4 bg-[var(--card-bg)] border-t border-gray-200 dark:border-gray-700 space-y-6">
                                {/* Theme */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Theme</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['default', 'ocean', 'sunset', 'forest'].map(t => (
                                            <button 
                                                key={t} 
                                                onClick={() => onUpdateSettings({ ...settings, theme: t as any })}
                                                className={`px-3 py-2 rounded-md text-xs border ${settings.theme === t ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                                            >
                                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Theme Mode */}
                                <div>
                                     <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Mode</label>
                                     <div className="flex space-x-2">
                                        {['light', 'dark', 'system'].map(m => (
                                            <button
                                                key={m}
                                                onClick={() => onUpdateSettings({...settings, themeMode: m as any})}
                                                className={`flex-1 py-2 rounded-md text-xs border ${settings.themeMode === m ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white' : 'border-gray-300 dark:border-gray-600'}`}
                                            >
                                                {m.charAt(0).toUpperCase() + m.slice(1)}
                                            </button>
                                        ))}
                                     </div>
                                </div>

                                {/* Generate Reports Toggle */}
                                <div>
                                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Generate Reports</h4>
                                    <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                                        
                                        {/* Daily */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">Daily Analysis</span>
                                            <button 
                                                onClick={() => onUpdateSettings({ ...settings, dailyAnalysis: !settings.dailyAnalysis })}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${settings.dailyAnalysis ? 'bg-[var(--accent-primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            >
                                                <span className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.dailyAnalysis ? 'translate-x-5' : ''}`}></span>
                                            </button>
                                        </div>

                                        {/* Weekly */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">Weekly Summaries</span>
                                            <button 
                                                onClick={() => onUpdateSettings({ ...settings, weeklyReports: !settings.weeklyReports })}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${settings.weeklyReports ? 'bg-[var(--accent-primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            >
                                                <span className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.weeklyReports ? 'translate-x-5' : ''}`}></span>
                                            </button>
                                        </div>

                                        {/* Monthly */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">Monthly Summaries</span>
                                            <button
                                                onClick={() => onUpdateSettings({ ...settings, monthlyReports: !settings.monthlyReports })}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${settings.monthlyReports ? 'bg-[var(--accent-primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            >
                                                <span className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.monthlyReports ? 'translate-x-5' : ''}`}></span>
                                            </button>
                                        </div>

                                    </div>
                                </div>

                                {/* Mood Journal Settings */}
                                <div>
                                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Daily Journal</h4>
                                    <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">

                                        {/* Mood Streak Toggle */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">Show Mood Streak</span>
                                            <button
                                                onClick={() => onUpdateSettings({ ...settings, moodStreakEnabled: settings.moodStreakEnabled !== false ? false : true })}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${settings.moodStreakEnabled !== false ? 'bg-[var(--accent-primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            >
                                                <span className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.moodStreakEnabled !== false ? 'translate-x-5' : ''}`}></span>
                                            </button>
                                        </div>

                                    </div>
                                </div>

                                {/* Security / PIN */}
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Security (PIN)</h4>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-xs text-gray-600 dark:text-gray-400">Email for PIN recovery</label>
                                            <input
                                                type="email"
                                                value={emailInput}
                                                onChange={(e) => { setEmailInput(e.target.value); setPinError(''); }}
                                                placeholder="your@email.com"
                                                className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-[var(--text-primary)]"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={pinInput}
                                                onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
                                                placeholder={settings.pin ? "New PIN" : "Set 4 letters"}
                                                maxLength={4}
                                                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-[var(--text-primary)]"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    console.log('🖱️ SAVE BUTTON CLICKED!');
                                                    e.preventDefault();
                                                    handlePinSave();
                                                }}
                                                className="px-4 py-2 bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] rounded-md text-sm font-medium"
                                            >
                                                Save
                                            </button>
                                        </div>
                                        {pinError && <p className="text-xs text-red-500 mt-1">{pinError}</p>}
                                        {settings.pin && (
                                            <button onClick={() => onUpdateSettings({ ...settings, pin: undefined })} className="text-xs text-red-500 mt-2 hover:underline">Remove PIN protection</button>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Pause Journey */}
                                <div className={`pt-4 border-t border-gray-200 dark:border-gray-700 ${activeView !== 'journey' ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Journey Status</h4>
                                    {userProfile?.isPaused ? (
                                        <button onClick={onResumeJourney} className="w-full py-2 bg-[var(--accent-primary)] text-white rounded-md text-sm">Resume Journey</button>
                                    ) : (
                                        <button onClick={onPauseJourney} className="w-full py-2 border border-amber-500 text-amber-600 dark:text-amber-400 rounded-md text-sm">Pause Journey</button>
                                    )}
                                </div>

                                {/* Sync/Backup */}
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Backup & Sync</h4>
                                    {userEmail ? (
                                        <>
                                            <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-lg">☁️</span>
                                                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Cloud Backup Active</span>
                                                </div>
                                                <p className="text-xs text-green-600 dark:text-green-400">
                                                    Your data is automatically syncing to {userEmail}
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-3">You can also export a local backup file:</p>
                                            <button onClick={handleSyncBackup} className="w-full py-2 bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] rounded-md text-sm">Export Backup JSON</button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs text-gray-500 mb-3">Your data is currently stored only on this device.</p>
                                            <div className="space-y-2">
                                                <button
                                                    onClick={onSetupCloudBackup}
                                                    className="w-full py-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                                >
                                                    <span>☁️</span>
                                                    <span>Enable Cloud Backup</span>
                                                </button>
                                                <p className="text-xs text-gray-400 text-center">All your journey history will be backed up</p>
                                                <button onClick={handleSyncBackup} className="w-full py-2 bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] rounded-md text-sm">Export Local Backup</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* (e) Final Summary Config */}
                     <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${activeView !== 'journey' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <button onClick={() => toggleSection('finalSummary')} className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <span className="font-medium text-[var(--text-primary)]">Final Summary Setup</span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSection === 'finalSummary' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'finalSummary' && (
                             <div className="p-4 bg-[var(--card-bg)] border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-[var(--text-primary)]">Include Intuitive Insights</span>
                                    <button 
                                        onClick={() => onUpdateSettings({ ...settings, includeHunchesInFinalSummary: !settings.includeHunchesInFinalSummary })}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${settings.includeHunchesInFinalSummary ? 'bg-[var(--accent-primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <span className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.includeHunchesInFinalSummary ? 'translate-x-5' : ''}`}></span>
                                    </button>
                                </div>
                                
                                {settings.includeHunchesInFinalSummary && (
                                    <div className="space-y-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Select types to include:</p>
                                        {(['insight', 'dream', 'hunch'] as HunchType[]).map(type => {
                                            const currentTypes = settings.finalSummaryIncludedTypes || ['insight', 'dream', 'hunch'];
                                            const isChecked = currentTypes.includes(type);
                                            return (
                                                <label key={type} className="flex items-center space-x-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked} 
                                                        onChange={(e) => {
                                                            const newTypes = e.target.checked 
                                                                ? [...currentTypes, type]
                                                                : currentTypes.filter(t => t !== type);
                                                            onUpdateSettings({ ...settings, finalSummaryIncludedTypes: newTypes });
                                                        }}
                                                        className="rounded text-[var(--accent-primary)] focus:ring-[var(--ring-color)]" 
                                                    />
                                                    <span className="text-sm text-[var(--text-primary)] capitalize">{type}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                )}
                             </div>
                        )}
                    </div>

                    {/* Share Feature (visible always, disabled until enabled) */}
                    {userProfile && (
                        <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mt-4 ${!settings.shareEnabled ? 'opacity-60' : ''}`}>
                            <button
                                onClick={() => settings.shareEnabled && toggleSection('share')}
                                disabled={!settings.shareEnabled}
                                className={`w-full p-4 flex justify-between items-center transition-colors ${
                                    settings.shareEnabled
                                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 cursor-pointer'
                                        : 'bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`font-medium ${
                                        settings.shareEnabled
                                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400'
                                            : 'text-gray-400 dark:text-gray-600'
                                    }`}>
                                        Share Your Journey
                                    </span>
                                    {!settings.shareEnabled && (
                                        <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>
                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${
                                    settings.shareEnabled
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-400 dark:text-gray-600'
                                } ${openSection === 'share' ? 'rotate-180' : ''}`} />
                            </button>
                            {settings.shareEnabled && openSection === 'share' && (
                                <div className="p-4 bg-[var(--card-bg)] border-t border-gray-200 dark:border-gray-700">
                                    <ShareButton
                                        userProfile={userProfile}
                                        onClose={() => setOpenSection(null)}
                                    />
                                </div>
                            )}
                            {!settings.shareEnabled && (
                                <div className="p-4 bg-[var(--card-bg)] border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                        Share feature will be available when the app launches. Get ready to inspire others with your journey! ✨
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Data Management (GDPR) */}
                     <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mt-4">
                         <button onClick={() => toggleSection('data')} className="w-full p-4 flex justify-between items-center bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                            <span className="font-medium text-red-600 dark:text-red-400">Data & Privacy</span>
                             <ChevronDownIcon className={`w-5 h-5 text-red-600 dark:text-red-400 transition-transform ${openSection === 'data' ? 'rotate-180' : ''}`} />
                        </button>
                         {openSection === 'data' && (
                            <div className="p-4 bg-[var(--card-bg)] border-t border-red-100 dark:border-red-900/30 space-y-3">
                                {userEmail && onSignOut && (
                                    <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                            Signed in as: <span className="font-medium">{userEmail}</span>
                                        </p>
                                        <button
                                            onClick={onSignOut}
                                            className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={onExportData} className="flex-1 py-2 border border-[var(--text-primary)] text-[var(--text-primary)] rounded-md text-sm">
                                        Export Data
                                    </button>
                                    <button onClick={onImportData} className="flex-1 py-2 border border-[var(--text-primary)] text-[var(--text-primary)] rounded-md text-sm">
                                        Import Data
                                    </button>
                                </div>

                                {!showDeleteConfirm ? (
                                    <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
                                        Delete All Data
                                    </button>
                                ) : (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                                        <p className="text-xs text-red-700 dark:text-red-300 mb-2 font-bold">WARNING: All data will be lost permanently. This cannot be undone.</p>
                                        <div className="flex gap-2">
                                            <button onClick={onDeleteData} className="flex-1 py-2 bg-red-600 text-white rounded-md text-xs font-bold hover:bg-red-700">I Understand, Delete</button>
                                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-xs">Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                         )}
                     </div>

                </div>

                 <div className="border-t border-gray-200 dark:border-gray-800">
                    <div className="p-4 flex flex-wrap justify-center gap-4 text-xs">
                        {onOpenPrivacyPolicy && (
                            <button
                                onClick={onOpenPrivacyPolicy}
                                className="text-gray-500 dark:text-gray-400 hover:text-accent-color dark:hover:text-accent-color underline"
                            >
                                Privacy Policy
                            </button>
                        )}
                        {onOpenTerms && (
                            <button
                                onClick={onOpenTerms}
                                className="text-gray-500 dark:text-gray-400 hover:text-accent-color dark:hover:text-accent-color underline"
                            >
                                Terms of Service
                            </button>
                        )}
                        {onOpenContact && (
                            <button
                                onClick={onOpenContact}
                                className="text-gray-500 dark:text-gray-400 hover:text-accent-color dark:hover:text-accent-color underline"
                            >
                                Contact Us
                            </button>
                        )}
                    </div>
                    <div className="px-4 pb-4 text-center text-xs text-gray-400">
                        Renew90 v1.2
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes slide-in-left {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-left {
                    animation: slide-in-left 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default Menu;
