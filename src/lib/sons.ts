import { createLocalStore } from "./local-store";

// Sons de comemoração gerados com Web Audio: nada para baixar, nada para hospedar.

export const sonsStore = createLocalStore<boolean>("lume:sons:v1", true, { preferencia: true });
export const useSonsLigados = sonsStore.use;

let contexto: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined" || !sonsStore.get()) return null;
  const Classe =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Classe) return null;
  contexto ??= new Classe();
  if (contexto.state === "suspended") void contexto.resume();
  return contexto;
}

function nota(
  c: AudioContext,
  frequencia: number,
  inicio: number,
  duracao: number,
  volume: number,
  tipo: OscillatorType = "triangle",
) {
  const t0 = c.currentTime + inicio;
  const osc = c.createOscillator();
  const ganho = c.createGain();
  osc.type = tipo;
  osc.frequency.value = frequencia;
  ganho.gain.setValueAtTime(0, t0);
  ganho.gain.linearRampToValueAtTime(volume, t0 + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.001, t0 + duracao);
  osc.connect(ganho).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duracao + 0.05);
}

const DO5 = 523.25;
const MI5 = 659.25;
const SOL5 = 783.99;
const DO6 = 1046.5;

export function tocarAcerto() {
  const c = audio();
  if (!c) return;
  nota(c, 1318.5, 0, 0.18, 0.16, "sine");
  nota(c, 1760, 0.09, 0.35, 0.16, "sine");
}

export function tocarLicaoConcluida() {
  const c = audio();
  if (!c) return;
  [DO5, MI5, SOL5, DO6].forEach((f, i) => nota(c, f, i * 0.1, 0.4, 0.14));
  nota(c, 1318.5, 0.42, 0.6, 0.09, "sine");
}

export function tocarTrilhaConcluida() {
  const c = audio();
  if (!c) return;
  [392, DO5, MI5, SOL5].forEach((f, i) => nota(c, f, i * 0.12, 0.3, 0.13));
  [DO5, MI5, SOL5, DO6].forEach((f) => nota(c, f, 0.55, 1.2, 0.09));
  nota(c, 1568, 0.6, 1, 0.05, "sine");
  [1318.5, 1568, 2093].forEach((f, i) => nota(c, f, 1.1 + i * 0.08, 0.3, 0.05, "sine"));
}
