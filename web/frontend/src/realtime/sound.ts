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

// A single, lower/urgent tone (distinct from the notification chime) —
// played once on the user's side when a consultation is ~1 minute from
// running out, alongside the existing visual top-up banner.
export function playExpiryWarningBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [520, 520].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.3);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.3 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.3 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.25);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {
    // Same as playChimeOnce — never let audio failure break anything else.
  }
}

// A classic ringback tone, looped while a call sits in "Connecting…" —
// stops the moment the call actually connects, fails, or ends.
let ringbackIntervalId: number | null = null;

function playRingbackOnce() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [440, 480].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.setValueAtTime(0.12, now + 0.9);
      gain.gain.linearRampToValueAtTime(0, now + 1.0);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.0);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Same as playChimeOnce — never let audio failure break anything else.
  }
}

export function startRingbackTone() {
  if (ringbackIntervalId !== null) return;
  playRingbackOnce();
  ringbackIntervalId = window.setInterval(playRingbackOnce, 2000);
}

export function stopRingbackTone() {
  if (ringbackIntervalId === null) return;
  window.clearInterval(ringbackIntervalId);
  ringbackIntervalId = null;
}
