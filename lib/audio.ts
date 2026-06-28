// Note frequencies (Hz)
const NOTES: Record<string, number> = {
  A2: 110, C3: 130.81, E3: 164.81, G3: 196, A3: 220,
  B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63,
  F3: 174.61, G4: 392, A4: 440, C5: 523.25,
};

function playTones(freqs: number[], duration = 0.15, tempo = 1) {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * duration * tempo;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + duration * tempo - 0.02);
    osc.start(start);
    osc.stop(start + duration * tempo);
  });
}

export function playIncomeSound() {
  playTones([NOTES.C4, NOTES.E4, NOTES.G4, NOTES.C5]);
}

// level 1–6, gets slower and lower as level increases
const EXPENSE_SEQUENCES: number[][] = [
  [NOTES.E4, NOTES.D4, NOTES.C4],           // 1: mild
  [NOTES.D4, NOTES.B3, NOTES.A3],           // 2: oof
  [NOTES.C4, NOTES.A3, NOTES.F3],           // 3: heavy
  [NOTES.A3, NOTES.G3, NOTES.E3],           // 4: painful
  [NOTES.G3, NOTES.E3, NOTES.C3],           // 5: tragic
  [NOTES.E3, NOTES.C3, NOTES.A2],           // 6: devastated
];

export function getSadnessLevel(amount: number) {
  return Math.min(Math.floor(amount / 500), 6);
}

export function playExpenseSound(level: number) {
  if (level < 1) return;
  const tempo = 1 + (level - 1) * 0.25; // slows down with sadness
  playTones(EXPENSE_SEQUENCES[level - 1], 0.18, tempo);
}
