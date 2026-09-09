// ═══════════════════════════════════════════════════════════════════════════════
// Notification & Sound Utilities — real functionality for Settings toggles
// ═══════════════════════════════════════════════════════════════════════════════

// ── Preferences ───────────────────────────────────────────────────────────────

function isPushEnabled(): boolean {
    return localStorage.getItem('settings_pushNotifs') === 'true';
}

function isSoundEnabled(): boolean {
    return localStorage.getItem('settings_soundEffects') !== 'false'; // default true
}

function isCourseUpdatesEnabled(): boolean {
    return localStorage.getItem('settings_courseUpdates') === 'true';
}

function isEmailEnabled(): boolean {
    return localStorage.getItem('settings_emailNotifs') === 'true';
}

// ── Browser Push Notifications ────────────────────────────────────────────────

export function pushNotification(title: string, body: string, tag?: string) {
    if (!isPushEnabled()) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    try {
        new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: tag || 'devmastery-' + Date.now(),
        });
    } catch {
        // Silent fail — some browsers block notifications in certain contexts
    }
}

export function requestNotificationPermission() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ── Sound Effects ─────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
    if (!isSoundEnabled()) return;

    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch {
        // Silent fail
    }
}

/** Short positive chirp — lesson completion */
export function soundLessonComplete() {
    playTone(880, 0.1, 'sine', 0.12);
    setTimeout(() => playTone(1175, 0.15, 'sine', 0.12), 100);
}

/** Ascending two-note — XP gained */
export function soundXpGain() {
    playTone(660, 0.08, 'sine', 0.1);
    setTimeout(() => playTone(880, 0.12, 'sine', 0.1), 80);
}

/** Three ascending notes — level up */
export function soundLevelUp() {
    playTone(523, 0.12, 'sine', 0.15);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.15), 120);
    setTimeout(() => playTone(784, 0.2, 'sine', 0.15), 240);
}

/** Rapid ascending arpeggio — streak milestone */
export function soundStreakMilestone() {
    playTone(523, 0.08, 'triangle', 0.12);
    setTimeout(() => playTone(659, 0.08, 'triangle', 0.12), 80);
    setTimeout(() => playTone(784, 0.08, 'triangle', 0.12), 160);
    setTimeout(() => playTone(1047, 0.15, 'triangle', 0.12), 240);
}

/** Soft confirmation — general action */
export function soundConfirm() {
    playTone(440, 0.08, 'sine', 0.08);
}

/** Alert — certificate approved */
export function soundAchievement() {
    playTone(784, 0.1, 'sine', 0.12);
    setTimeout(() => playTone(988, 0.1, 'sine', 0.12), 100);
    setTimeout(() => playTone(1175, 0.2, 'sine', 0.12), 200);
}

/** Enrollment success — purchase complete */
export function soundEnrollment() {
    playTone(523, 0.1, 'triangle', 0.15);
    setTimeout(() => playTone(659, 0.1, 'triangle', 0.15), 120);
    setTimeout(() => playTone(784, 0.1, 'triangle', 0.15), 240);
    setTimeout(() => playTone(1047, 0.25, 'triangle', 0.15), 360);
}
