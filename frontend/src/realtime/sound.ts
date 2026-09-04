// A short two-tone chime synthesized with the Web Audio API — no audio
// asset to ship, no licensing question, and it respects the same autoplay
// rules as any other audio (must follow a user gesture / explicit opt-in,
// see NotificationPermissionOnboarding).
export function playNotificationChime() {
  playChimeOnce();
}

function playChimeOnce() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Audio isn't available in every environment — the visual notification
    // must never depend on this succeeding (see spec section 8).
  }
}

// Repeats the same chime every 1.5s until stopped — used while a
// consultation request is waiting for the astrologer to accept (see
// RealtimeContext.tsx, which starts/stops this off pendingAssignments).
// Module-level (not per-component) so it can't accidentally end up with two
// independent loops running if more than one place ever calls start.
let alarmIntervalId: number | null = null;

export function startPendingRequestAlarm() {
  if (alarmIntervalId !== null) return;
  playChimeOnce();
  alarmIntervalId = window.setInterval(playChimeOnce, 1500);
}

export function stopPendingRequestAlarm() {
  if (alarmIntervalId === null) return;
  window.clearInterval(alarmIntervalId);
  alarmIntervalId = null;
}
