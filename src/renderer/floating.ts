/**
 * Floating Window Renderer
 *
 * Displays voice input status:
 * - Microphone state (idle/recording/processing)
 * - ASR connection state (disconnected/connecting/connected/reconnecting/error)
 * - Real-time audio waveform
 */

import { t, setLocale, type Locale } from "../i18n/index";

const micStatusEl = document.getElementById('micStatus') as HTMLElement;
const asrStatusEl = document.getElementById('asrStatus') as HTMLElement;
const waveformCanvas = document.getElementById('waveformCanvas') as HTMLCanvasElement;
const cancelHint = document.getElementById('cancelHint') as HTMLElement;
const actionHint = document.getElementById('actionHint') as HTMLElement;
const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
const transcriptText = document.getElementById('transcriptText') as HTMLElement;
const transcriptCursor = document.getElementById('transcriptCursor') as HTMLElement;

// Audio visualization
const ctxOrNull = waveformCanvas.getContext('2d');
if (!ctxOrNull) {
  throw new Error('Failed to get 2D context for waveform canvas');
}
const ctx = ctxOrNull; // TypeScript now knows this is CanvasRenderingContext2D
let audioData: number[] = new Array(64).fill(0);

// ============= Audio Waveform Visualization =============

function resizeCanvas(): void {
  const rect = waveformCanvas.getBoundingClientRect();
  waveformCanvas.width = rect.width * window.devicePixelRatio;
  waveformCanvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

function drawWaveform(): void {
  const width = waveformCanvas.width / window.devicePixelRatio;
  const height = waveformCanvas.height / window.devicePixelRatio;

  ctx.clearRect(0, 0, width, height);

  const barWidth = width / audioData.length;
  const barGap = 2;

  for (let i = 0; i < audioData.length; i++) {
    const value = audioData[i];
    const barHeight = Math.max(2, value * height * 0.9);
    const x = i * barWidth;
    const y = (height - barHeight) / 2;

    // Gradient color based on amplitude
    const hue = 120 + (value * 60); // Green to yellow to red
    ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;

    ctx.beginPath();
    ctx.roundRect(x + barGap / 2, y, barWidth - barGap, barHeight, 2);
    ctx.fill();
  }
}

function animate(): void {
  // Decay audio data
  audioData = audioData.map(v => v * 0.9);
  drawWaveform();
  requestAnimationFrame(animate);
}

// Start animation loop
resizeCanvas();
animate();
window.addEventListener('resize', resizeCanvas);

// ============= Status Updates =============

function updateMicStatus(status: string): void {
  micStatusEl.className = 'status-value ' + status;

  switch (status) {
    case 'recording':
      micStatusEl.textContent = t('floating.status.recording');
      cancelHint.classList.add('visible');
      actionHint.style.display = 'none';
      break;
    case 'processing':
      micStatusEl.textContent = t('floating.status.processing');
      break;
    case 'idle':
    default:
      micStatusEl.textContent = t('floating.status.idle');
      cancelHint.classList.remove('visible');
      actionHint.style.display = 'block';
      actionHint.textContent = t('floating.action.pressHotkey');
      break;
  }
}

function updateASRStatus(status: string): void {
  asrStatusEl.className = 'status-value ' + status;

  switch (status) {
    case 'connected':
      asrStatusEl.textContent = t('floating.status.online');
      break;
    case 'connecting':
      asrStatusEl.textContent = t('floating.status.connecting');
      break;
    case 'reconnecting':
      asrStatusEl.textContent = t('floating.status.reconnecting');
      break;
    case 'error':
      asrStatusEl.textContent = t('floating.status.error');
      break;
    case 'disconnected':
    default:
      asrStatusEl.textContent = t('floating.status.offline');
      break;
  }
}

// Load language setting and initialize i18n
async function initI18n(): Promise<void> {
  try {
    const lang = await window.api.settings.get<string>("language");
    const locale = lang as Locale || "en";
    setLocale(locale);
  } catch {
    setLocale("en");
  }

  // Update static labels
  const micLabelEl = document.getElementById('micLabel');
  const asrLabelEl = document.getElementById('asrLabel');
  if (micLabelEl) micLabelEl.textContent = t('floating.mic');
  if (asrLabelEl) asrLabelEl.textContent = t('floating.asr');
}

// ============= Audio Level Updates =============

window.api.audio.onLevel((level: number) => {
  // Normalize level to 0-1 range
  const normalizedLevel = Math.min(1, level);

  // Update a few bars randomly around the current level
  for (let i = 0; i < audioData.length; i++) {
    const variance = Math.random() * 0.3;
    audioData[i] = Math.min(1, normalizedLevel + variance - 0.15);
  }
});

// ============= ASR Status Updates =============

window.api.asr.onConnectionStatus((detail: { status: string }) => {
  updateASRStatus(detail.status);
});

window.api.asr.onError((error: { code: string; message: string }) => {
  console.error('ASR Error:', error);
  updateASRStatus('error');
});

// ============= Recording Status Updates =============

// Listen for audio recording state changes
window.api.audio.onAudioData(() => {
  updateMicStatus('recording');
});

// When recording stops, go back to idle
window.api.audio.onError(() => {
  updateMicStatus('idle');
});

// ============= User Interactions =============

// Close button - hide window
closeBtn.addEventListener('click', () => {
  window.api.floatingWindow.hide();
});

// Click on cancel hint - stop recording
cancelHint.addEventListener('click', async () => {
  try {
    await window.api.audio.stopRecording();
    updateMicStatus('idle');
  } catch (err) {
    console.error('Failed to stop recording:', err);
  }
});

// Click anywhere outside cancels (hide window, but don't stop recording)
// Note: actual click-outside detection happens in main process via hover tracking

// ============= Transcript Typing Animation =============

// Typing state
let displayedText = '';
let pendingText = '';
let typingTimer: ReturnType<typeof setTimeout> | null = null;
const TYPING_DELAY_MS = 30; // ms per character
const CLEAR_AFTER_MS = 3000; // clear transcript after 3 seconds

function typeNextChar(): void {
  if (pendingText.length === 0) {
    // Done typing, hide cursor and schedule clear
    transcriptCursor.style.display = 'none';
    // Schedule clear after 3 seconds
    setTimeout(clearTranscript, CLEAR_AFTER_MS);
    return;
  }

  displayedText += pendingText[0];
  pendingText = pendingText.slice(1);
  transcriptText.textContent = displayedText;

  if (pendingText.length > 0) {
    typingTimer = setTimeout(typeNextChar, TYPING_DELAY_MS);
  } else {
    // Done typing, hide cursor and schedule clear
    transcriptCursor.style.display = 'none';
    setTimeout(clearTranscript, CLEAR_AFTER_MS);
  }
}

function clearTranscript(): void {
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
  displayedText = '';
  pendingText = '';
  transcriptText.textContent = '';
  transcriptCursor.style.display = 'inline';
}

// Start typing new text
function startTyping(text: string): void {
  // Cancel any existing typing
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }

  // Append new text to existing displayed text
  pendingText = text;
  displayedText = transcriptText.textContent || '';
  transcriptCursor.style.display = 'inline';

  typeNextChar();
}

// Listen for ASR transcript events
window.api.asr.onTranscript((result: { text: string; isFinal: boolean }) => {
  if (!result.text.trim()) {
    return;
  }

  if (result.isFinal) {
    // Final transcript - type it out
    startTyping(result.text);
  } else {
    // Interim transcript - show directly without animation
    if (typingTimer) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
    displayedText = result.text;
    pendingText = '';
    transcriptText.textContent = result.text;
    transcriptCursor.style.display = 'inline';
  }
});

// ============= Initialization =============

async function init(): Promise<void> {
  await initI18n();
  updateMicStatus('idle');
  updateASRStatus('disconnected');
  console.log('[Floating Window] Initialized');
}

init();
