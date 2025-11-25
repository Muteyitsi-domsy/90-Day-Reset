
import React, { useState, useEffect, useRef } from 'react';
import { Settings, UserProfile, JournalEntry, HunchType } from '../types';
import { getDayAndMonth } from '../services/geminiService';

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
    onDeleteData: () => void;
    onViewReport: (report: JournalEntry) => void;
    onRegenerateReport?: (weekOrMonth: number, type: 'weekly' | 'monthly') => void;
}

const ChevronDownIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const Menu: React.FC<MenuProps> = ({
    isOpen, onClose, userProfile, settings, reports,
    onUpdateSettings, onUpdateProfile, onPauseJourney, onResumeJourney,
    onExportData, onDeleteData, onViewReport, onRegenerateReport
}) => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [pinInput, setPinInput] = useState('');
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
        if (/^[a-zA-Z]{4}$/.test(pinInput)) {
            onUpdateSettings({ ...settings, pin: pinInput.toLowerCase() });
            setPinInput('');
            setPinError('');
        } else {
            setPinError('PIN must be exactly 4 letters.');
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

    // Sort reports by recency (latest first)
    const sortedReports = [...reports].sort((a, b) => {
        // For weekly reports, sort by week number descending (latest first)
        if (a.type === 'weekly_summary_report' && b.type === 'weekly_summary_report') {
            return b.week - a.week;
        }
        // For monthly reports or mixed, sort by day descending (latest first)
        return b.day - a.day;
    });
    const hasUnread = userProfile?.lastViewedReportDate 
        ? sortedReports.some(r => new Date(r.date) > new Date(userProfile.lastViewedReportDate!))
        : sortedReports.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex justify-start">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-slide-in-left">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-light text-[var(--text-secondary)]">Menu</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-[var(--text-primary)]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    
                    {/* (a) Intention */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
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
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
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
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Define your daily ritual to anchor your practice.</p>
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
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{settings.ritualDuration} minutes</p>
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
                                            className="w-full py-2 text-xs text-gray-500 hover:text-[var(--text-primary)]"
                                        >
                                            Edit Ritual
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* (b) Ideal Self Manifesto */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <button onClick={() => toggleSection('manifesto')} className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <span className="font-medium text-[var(--text-primary)]">Ideal Self Manifesto</span>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSection === 'manifesto' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'manifesto' && (
                            <div className="p-4 bg-[var(--card-bg)] text-[var(--text-primary)] font-light whitespace-pre-wrap leading-relaxed border-t border-gray-200 dark:border-gray-700">
                                {userProfile?.idealSelfManifesto || 'Manifesto not yet written.'}
                            </div>
                        )}
                    </div>

                    {/* (c) Reports */}
                    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${(settings.weeklyReports || settings.monthlyReports) ? '' : 'opacity-50 pointer-events-none'}`}>
                        <button onClick={() => toggleSection('reports')} className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-[var(--text-primary)]">Reports</span>
                                {hasUnread && <span className="h-2 w-2 rounded-full bg-red-500"></span>}
                            </div>
                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${openSection === 'reports' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'reports' && (
                            <div className="p-2 bg-[var(--card-bg)] border-t border-gray-200 dark:border-gray-700 space-y-2">
                                {sortedReports.length === 0 ? (
                                    <p className="text-center py-4 text-sm text-gray-500">No reports generated yet.</p>
                                ) : (
                                    sortedReports.map(report => (
                                        <button
                                            key={report.id}
                                            onClick={() => { onViewReport(report); onClose(); }}
                                            className="w-full text-left p-3 rounded-md hover:bg-[var(--bg-from)] flex justify-between items-center group"
                                        >
                                            <div>
                                                <p className="font-medium text-sm text-[var(--text-secondary)]">
                                                    {report.type === 'monthly_summary_report'
                                                        ? `📅 Monthly Report ${report.summaryData?.period || ''}`
                                                        : `🌿 Week ${report.week} Report`}
                                                </p>
                                                <p className="text-xs text-gray-500">{report.summaryData?.dateRange || new Date(report.date).toLocaleDateString()}</p>
                                            </div>
                                            <span className="text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity">View &rarr;</span>
                                        </button>
                                    ))
                                )}
                                {onRegenerateReport && userProfile && (() => {
                                    const { day } = getDayAndMonth(userProfile.startDate);
                                    const lastCompleteWeek = Math.floor((day - 1) / 7);
                                    // Only show button if there's at least one complete week
                                    if (lastCompleteWeek >= 1) {
                                        return (
                                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <button
                                                    onClick={() => {
                                                        onRegenerateReport(lastCompleteWeek, 'weekly');
                                                    }}
                                                    className="w-full py-2 px-3 text-xs text-[var(--accent-primary)] hover:bg-[var(--bg-from)] rounded-md transition-colors"
                                                >
                                                    Regenerate Last Week's Report
                                                </button>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
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

                                {/* Security / PIN */}
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Security (PIN)</h4>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={pinInput}
                                            onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
                                            placeholder={settings.pin ? "New PIN" : "Set 4 letters"}
                                            maxLength={4}
                                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-[var(--text-primary)]"
                                        />
                                        <button onClick={handlePinSave} className="px-4 py-2 bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] rounded-md text-sm font-medium">Save</button>
                                    </div>
                                    {pinError && <p className="text-xs text-red-500 mt-1">{pinError}</p>}
                                    {settings.pin && (
                                        <button onClick={() => onUpdateSettings({ ...settings, pin: undefined })} className="text-xs text-red-500 mt-2 hover:underline">Remove PIN protection</button>
                                    )}
                                </div>
                                
                                {/* Pause Journey */}
                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
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
                                    <p className="text-xs text-gray-500 mb-3">Since your data is private and stored only on this device, use Export to create a backup file you can save elsewhere.</p>
                                    <button onClick={handleSyncBackup} className="w-full py-2 bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] rounded-md text-sm">Export Backup JSON</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* (e) Final Summary Config */}
                     <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
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

                    {/* Data Management (GDPR) */}
                     <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mt-4">
                         <button onClick={() => toggleSection('data')} className="w-full p-4 flex justify-between items-center bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                            <span className="font-medium text-red-600 dark:text-red-400">Data & Privacy</span>
                             <ChevronDownIcon className={`w-5 h-5 text-red-600 dark:text-red-400 transition-transform ${openSection === 'data' ? 'rotate-180' : ''}`} />
                        </button>
                         {openSection === 'data' && (
                            <div className="p-4 bg-[var(--card-bg)] border-t border-red-100 dark:border-red-900/30 space-y-3">
                                <button onClick={onExportData} className="w-full py-2 border border-[var(--text-primary)] text-[var(--text-primary)] rounded-md text-sm">
                                    Download All Data (JSON)
                                </button>
                                
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
                
                 <div className="p-4 text-center text-xs text-gray-400 border-t border-gray-200 dark:border-gray-800">
                    90-Day Identity Reset V1.2
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
