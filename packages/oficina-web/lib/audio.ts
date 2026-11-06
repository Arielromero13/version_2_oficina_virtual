/**
/**
 * Motor de audio procedural y sintetizado en el navegador con Web Audio API.
 * No requiere archivos pesados ni dependencias externas.
 * Silenciado por defecto según las reglas de accesibilidad del proyecto.
 */

let ctx: AudioContext | null = null;
let sonidoHabilitado = false;

// Desbloquear AudioContext en el primer toque o clic del usuario según políticas del navegador
if (typeof window !== "undefined") {
  const desbloquear = () => {
    if (!ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
  };
  window.addEventListener("pointerdown", desbloquear, { passive: true });
  window.addEventListener("keydown", desbloquear, { passive: true });
  window.addEventListener("touchstart", desbloquear, { passive: true });
}

function obtenerContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  }
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

export function estaSonidoHabilitado(): boolean {
  return sonidoHabilitado;
}

export function alternarSonido(activar?: boolean): boolean {
  sonidoHabilitado = activar ?? !sonidoHabilitado;
  if (sonidoHabilitado) {
    const c = obtenerContexto();
    if (c) {
      if (c.state === "suspended") {
        void c.resume().then(() => reproducirChime("alta"));
      } else {
        reproducirChime("alta");
      }
    }
  }
  return sonidoHabilitado;
}

/** Sonido sutil al hacer clic en botones, fichas o chips del HUD */
export function reproducirClick() {
  if (!sonidoHabilitado) return;
  const c = obtenerContexto();
  if (!c) return;

  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(800, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.03);

  gain.gain.setValueAtTime(0.03, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.03);
}

/** Tono retro de diálogo tipo typewriter para NPCs con frecuencias personalizadas por personaje */
export function reproducirVozNpc(tipoPersonaje: string = "default") {
  if (!sonidoHabilitado) return;
  const c = obtenerContexto();
  if (!c) return;

  const frecuencias: Record<string, number> = {
    ariel: 380,
    orquestador: 520,
    "extractor-datos": 640,
    "investigador-normativo": 460,
    "redactor-tecnico": 580,
    integrador: 490,
    director: 330,
    rrhh: 610,
    subagente: 550,
    default: 440,
  };

  const baseFreq = frecuencias[tipoPersonaje] ?? frecuencias.default;
  const variation = (Math.random() - 0.5) * 60;
  const freq = Math.max(150, baseFreq + variation);

  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = tipoPersonaje === "orquestador" ? "sawtooth" : "triangle";
  osc.frequency.setValueAtTime(freq, c.currentTime);

  gain.gain.setValueAtTime(0.04, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.05);
}

/** Sonido sutil de paso al caminar sobre las baldosas */
export function reproducirPaso() {
  if (!sonidoHabilitado) return;
  const c = obtenerContexto();
  if (!c) return;

  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(120 + Math.random() * 40, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.04);

  gain.gain.setValueAtTime(0.02, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.04);
}

/** Chime para convocatorias, logros o entregas de resultados */
export function reproducirChime(tipo: "exito" | "convocatoria" | "alta" | "sello" = "exito") {
  if (!sonidoHabilitado) return;
  const c = obtenerContexto();
  if (!c) return;

  const notas: Record<string, number[]> = {
    exito: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6
    convocatoria: [392.0, 523.25, 659.25, 880.0], // G4, C5, E5, A5
    alta: [440.0, 880.0],
    sello: [220.0, 160.0], // Golpe sordo de aprobación
  };

  const secuencia = notas[tipo] ?? notas.exito;
  const duracionPaso = tipo === "sello" ? 0.08 : 0.07;

  secuencia.forEach((f, idx) => {
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = tipo === "sello" ? "square" : "sine";
    osc.frequency.setValueAtTime(f, c.currentTime + idx * duracionPaso);

    gain.gain.setValueAtTime(0.05, c.currentTime + idx * duracionPaso);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + idx * duracionPaso + 0.18);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(c.currentTime + idx * duracionPaso);
    osc.stop(c.currentTime + idx * duracionPaso + 0.2);
  });
}
