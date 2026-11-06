/**
 * Traduce el estado compartido a estados visibles de la escena. Función pura: cada estado
 * sale de un evento o fila registrada; la escena no inventa actividad.
 */

export type EstadoVisible =
  | "En reposo"
  | "Reuniendo equipo"
  | "Convocado"
  | "Analizando"
  | "Coordinando"
  | "Esperando a Ariel"
  | "Completado"
  | "Relevo nativo"
  | "Bloqueado"
  | "Error"
  | "No configurado"
  | "Mensaje sin leer"
  | "Leyó tus mensajes"
  | "Te respondió"
  | "Sin sesión abierta";

export interface Evento {
  id: number;
  encargo_id: string | null;
  tipo: string;
  actor: string;
  datos: Record<string, unknown>;
  creado: string;
}

export interface FichaVista {
  id: string;
  nombre: string;
  especialidad: string;
  proveedor: string;
  modelo: string;
  configurado: boolean;
  /** Sin clave, pero cubierta por subagentes de la sesión nativa. */
  respaldo_nativo: boolean;
}

export interface EncargoVista {
  id: string;
  titulo: string;
  descripcion: string;
  estado: "abierto" | "en_curso" | "en_revision" | "emitido" | "cerrado";
  sensibilidad: string;
  version_actual: number;
}

export interface EstadosEscena {
  orquestador: EstadoVisible;
  rrhh: EstadoVisible;
  agentes: Record<string, EstadoVisible>;
  carpetasEnRevision: number;
  /** Agentes que acaban de entregar un resultado y llevan su carpeta a la Mesa de revisión. */
  entregando: string[];
}

/** Segundos que el agente permanece en la Mesa de revisión tras entregar. */
export const SEGUNDOS_ENTREGA = 8;

export function derivarEscena(
  fichas: FichaVista[],
  encargo: EncargoVista | null,
  eventos: Evento[],
  decisionesPendientes: number,
  ahoraIso?: string,
): EstadosEscena {
  const agentes: Record<string, EstadoVisible> = {};
  for (const f of fichas) agentes[f.id] = f.configurado || f.respaldo_nativo ? "En reposo" : "No configurado";

  if (!encargo) {
    return { orquestador: "En reposo", rrhh: "En reposo", agentes, carpetasEnRevision: 0, entregando: [] };
  }

  const propios = eventos.filter((e) => e.encargo_id === encargo.id).sort((a, b) => a.id - b.id);
  const abierto = encargo.estado !== "emitido" && encargo.estado !== "cerrado";

  for (const e of propios) {
    if (!(e.actor in agentes) && e.tipo !== "agente_convocado") continue;
    switch (e.tipo) {
      case "agente_convocado": {
        const id = String(e.datos.ficha_id ?? "");
        if (id in agentes && agentes[id] !== "No configurado") agentes[id] = "Convocado";
        break;
      }
      case "agente_trabajando":
        agentes[e.actor] = "Analizando";
        break;
      case "resultado_entregado":
        agentes[e.actor] = e.datos.origen === "relevo_nativo" ? "Relevo nativo" : "Completado";
        break;
      case "agente_fallo":
        agentes[e.actor] = e.datos.estado === "sin_cuota" || e.datos.estado === "no_configurado" ? "Bloqueado" : "Error";
        break;
    }
  }
  // Al cerrar el encargo los agentes vuelven a reposo; los no configurados conservan su estado.
  if (!abierto) {
    for (const id of Object.keys(agentes)) if (agentes[id] !== "No configurado") agentes[id] = "En reposo";
  }

  const ultimo = propios.at(-1);
  let rrhh: EstadoVisible = "En reposo";
  if (abierto && ultimo && (ultimo.tipo === "rrhh_busqueda" || ultimo.tipo === "agente_convocado")) rrhh = "Reuniendo equipo";

  let orquestador: EstadoVisible;
  switch (encargo.estado) {
    case "abierto":
      orquestador = "Reuniendo equipo";
      break;
    case "en_curso":
      orquestador = "Coordinando";
      break;
    case "en_revision":
      orquestador = "Esperando a Ariel";
      break;
    default:
      orquestador = "Completado";
  }

  // Solo se anima una entrega registrada hace pocos segundos; la hora sale del servidor.
  const entregando: string[] = [];
  if (ahoraIso && abierto) {
    const ahora = new Date(ahoraIso).getTime();
    for (const e of propios) {
      if (e.tipo === "resultado_entregado" && e.actor in agentes && (ahora - new Date(e.creado).getTime()) / 1000 <= SEGUNDOS_ENTREGA) {
        if (!entregando.includes(e.actor)) entregando.push(e.actor);
      }
    }
  }

  return { orquestador, rrhh, agentes, carpetasEnRevision: decisionesPendientes, entregando };
}

/** Datos del buzón que animan al Orquestador. Todos salen de filas registradas. */
export interface BuzonEscena {
  sinLeer: number;
  /** Último mensaje de cada autor. */
  ultimoAriel: { id: string; creado: string } | null;
  ultimoOrquestador: { id: string; texto: string; creado: string } | null;
  leido: string | null;
  latido: string | null;
}

export interface EstadoOrquestador {
  estado: EstadoVisible;
  /** Texto para el globo de diálogo, solo mientras la respuesta es reciente. */
  dice: string | null;
  /** Id del mensaje de Ariel que vuela hacia la mesa (animación de envío). */
  cartaEnVuelo: string | null;
  sesion: "reciente" | "sin_contacto";
}

export const SEGUNDOS_RESPUESTA_VISIBLE = 90;
export const SEGUNDOS_LECTURA_VISIBLE = 120;
export const SEGUNDOS_CARTA = 4;
/** Sin llamadas a oficina-mcp en este tiempo, la web dice que no hay sesión abierta (es lo único que puede saber). */
export const MINUTOS_SESION = 20;

const seg = (desde: string | null, ahora: number) => (desde ? (ahora - new Date(desde).getTime()) / 1000 : Infinity);

/**
 * Estado visible del Orquestador combinando el encargo y el buzón. Prioridad: respuesta reciente,
 * mensaje sin leer, lectura reciente, estado del encargo, y por último la falta de sesión.
 */
export function derivarOrquestador(base: EstadoVisible, b: BuzonEscena, ahoraIso: string, hayEncargoAbierto: boolean): EstadoOrquestador {
  const ahora = new Date(ahoraIso).getTime();
  const sesion = seg(b.latido, ahora) <= MINUTOS_SESION * 60 ? "reciente" : "sin_contacto";
  const cartaEnVuelo = b.ultimoAriel && seg(b.ultimoAriel.creado, ahora) <= SEGUNDOS_CARTA ? b.ultimoAriel.id : null;
  const respuestaReciente =
    b.ultimoOrquestador &&
    seg(b.ultimoOrquestador.creado, ahora) <= SEGUNDOS_RESPUESTA_VISIBLE &&
    (!b.ultimoAriel || b.ultimoOrquestador.creado >= b.ultimoAriel.creado);
  if (respuestaReciente) {
    const t = b.ultimoOrquestador!.texto.replace(/\s+/g, " ").trim();
    return { estado: "Te respondió", dice: t.length > 70 ? `${t.slice(0, 67)}…` : t, cartaEnVuelo, sesion };
  }
  if (b.sinLeer > 0) return { estado: "Mensaje sin leer", dice: null, cartaEnVuelo, sesion };
  if (seg(b.leido, ahora) <= SEGUNDOS_LECTURA_VISIBLE) return { estado: "Leyó tus mensajes", dice: null, cartaEnVuelo, sesion };
  if (!hayEncargoAbierto && sesion === "sin_contacto") return { estado: "Sin sesión abierta", dice: null, cartaEnVuelo, sesion };
  return { estado: base, dice: null, cartaEnVuelo, sesion };
}

/** Frase corta y verificable para el panel de actividad. No describe razonamiento privado. */
export function describirEvento(e: Evento, nombres: Record<string, string>): string {
  const n = (id: unknown) => nombres[String(id)] ?? String(id);
  switch (e.tipo) {
    case "encargo_abierto":
      return `Encargo abierto: ${e.datos.titulo ?? ""}`;
    case "rrhh_busqueda":
      return `RR. HH. buscó perfiles${e.datos.consulta ? ` para «${e.datos.consulta}»` : ""}`;
    case "plan_propuesto":
      return "El Orquestador registró el plan y el equipo";
    case "agente_convocado":
      return `${n(e.datos.ficha_id)} convocado: ${e.datos.tarea ?? ""}`;
    case "agente_trabajando":
      return e.datos.ejecucion === "sesion_nativa"
        ? `${n(e.actor)} trabajando como subagente de la sesión nativa (sin clave de ${e.datos.proveedor_original})`
        : `${n(e.actor)} trabajando con ${e.datos.proveedor} (${e.datos.modelo})`;
    case "resultado_entregado":
      if (e.datos.origen === "relevo_nativo" && e.datos.motivo === "sin_clave") {
        return `${n(e.actor)}: resultado del subagente de la sesión nativa (sin clave de ${e.datos.proveedor_original}). Revisión para Ariel.`;
      }
      return e.datos.origen === "relevo_nativo"
        ? `${n(e.actor)}: resultado por relevo nativo (${e.datos.proveedor_original}, ${e.datos.motivo}). Revisión para Ariel.`
        : `${n(e.actor)} entregó su resultado`;
    case "agente_fallo":
      return `${n(e.actor)}: ${e.datos.estado}${e.datos.detalle ? ` — ${e.datos.detalle}` : ""}`;
    case "decision_pendiente":
      return "Decisión pendiente en la Mesa de revisión";
    case "decision_aprobada":
      return `Ariel aprobó (${e.datos.via === "web" ? "desde la oficina" : "en la sesión"})`;
    case "decision_devuelta":
      return `Ariel devolvió con comentarios (${e.datos.via === "web" ? "desde la oficina" : "en la sesión"})`;
    case "encargo_emitido":
      return "Encargo emitido";
    case "encargo_cerrado":
      return "Encargo cerrado sin emisión";
    case "encargo_reabierto":
      return `Encargo reabierto como versión ${e.datos.version}: ${e.datos.motivo ?? ""}`;
    case "rrhh_candidatos":
      return "RR. HH. propuso recursos para la biblioteca";
    case "recurso_guardado":
      return "Recurso guardado en la biblioteca";
    case "mensaje_ariel":
      return `Ariel dejó un mensaje en el buzón${Number(e.datos.archivos) ? ` con ${e.datos.archivos} archivo(s)` : ""}`;
    case "buzon_leido":
      return `El Orquestador leyó ${e.datos.mensajes} mensaje(s) del buzón`;
    case "orquestador_respondio":
      return `El Orquestador respondió${Number(e.datos.archivos) ? ` y entregó ${e.datos.archivos} archivo(s)` : ""}`;
    default:
      return e.tipo;
  }
}

// ==========================================
// Mapa ampliado del Campus de Ingeniería
// Dimensiones: ANCHO_CAMPUS = 28, FONDO_CAMPUS = 20
// ==========================================

export interface PuntoGrilla {
  gx: number;
  gy: number;
}

export interface ZonaCampus {
  id: string;
  nombre: string;
  icono: string;
  centro: PuntoGrilla;
  color: string;
  descripcion: string;
}

export const ANCHO_CAMPUS = 28;
export const FONDO_CAMPUS = 20;

export const ZONAS_CAMPUS: ZonaCampus[] = [
  {
    id: "despacho_ariel",
    nombre: "Despacho de Ariel y Mesa de Revisión",
    icono: "👑",
    centro: { gx: 14, gy: 16 },
    color: "#0f766e",
    descripcion: "Mesa ejecutiva con holograma y la Mesa de Revisión donde se firman y emiten los informes de ingeniería.",
  },
  {
    id: "mesa_orquestador",
    nombre: "Mando del Orquestador",
    icono: "⚡",
    centro: { gx: 14, gy: 9 },
    color: "#2563eb",
    descripcion: "Terminal central del Orquestador con buzón físico, servidor cuántico y tablero de coordinación general.",
  },
  {
    id: "lab_calidad_energia",
    nombre: "Laboratorio de Calidad de Energía (PQ)",
    icono: "🔬",
    centro: { gx: 6, gy: 6 },
    color: "#0284c7",
    descripcion: "Banco de osciloscopios, analizador de Factor K y filtros de armónicos. Puesto del Extractor e Ing. Marcos.",
  },
  {
    id: "taller_subestaciones",
    nombre: "Taller de Puesta a Tierra y Subestaciones",
    icono: "⚡",
    centro: { gx: 6, gy: 15 },
    color: "#d97706",
    descripcion: "Maqueta de malla IEEE 80, sondeos Wenner y celdas 69 kV. Puesto del Investigador Normativo e Ing. Elena.",
  },
  {
    id: "ala_redaccion",
    nombre: "Ala de Documentación y Normas",
    icono: "📐",
    centro: { gx: 22, gy: 6 },
    color: "#7c3aed",
    descripcion: "Pizarrón unifilar, estanterías técnicas y estaciones del Redactor Técnico y el Integrador de Sistemas.",
  },
  {
    id: "zona_convocatoria",
    nombre: "Cámara de Convocatoria de Subagentes",
    icono: "✨",
    centro: { gx: 22, gy: 12 },
    color: "#be185d",
    descripcion: "Plataforma holográfica donde el Orquestador y Ariel invocan subagentes especialistas con habilidades únicas.",
  },
  {
    id: "lounge_ingenieros",
    nombre: "Cafetería y Lounge de Descanso",
    icono: "☕",
    centro: { gx: 22, gy: 17 },
    color: "#15803d",
    descripcion: "Sillón de ingenieros, cafetera espresso de vapor y la máquina arcade 'Volt Defender'.",
  },
];

/** Puestos de trabajo en el campus ampliado */
export interface PuestoCampus {
  id: string;
  nombre: string;
  gx: number;
  gy: number;
  zonaId: string;
  orientacion?: "izq" | "der";
}

export const PUESTOS_CAMPUS: Record<string, PuestoCampus> = {
  // Puesto de Ariel
  ariel: { id: "ariel", nombre: "Mesa Ejecutiva de Ariel", gx: 14, gy: 17, zonaId: "despacho_ariel" },
  // Mesa del Orquestador
  orquestador: { id: "orquestador", nombre: "Terminal del Orquestador", gx: 14, gy: 9, zonaId: "mesa_orquestador" },
  // Mesa de Revisión
  revision: { id: "revision", nombre: "Mesa de Revisión y Firma", gx: 16.5, gy: 15.5, zonaId: "despacho_ariel" },
  // Director
  director: { id: "director", nombre: "Despacho de Dirección Técnica", gx: 11, gy: 16.5, zonaId: "despacho_ariel" },
  // RR. HH.
  rrhh: { id: "rrhh", nombre: "Oficina de RR. HH.", gx: 10, gy: 10, zonaId: "mesa_orquestador" },

  // Agentes principales
  "extractor-datos": { id: "extractor-datos", nombre: "Puesto Extractor de Datos", gx: 5, gy: 6, zonaId: "lab_calidad_energia" },
  "investigador-normativo": { id: "investigador-normativo", nombre: "Puesto Investigador Normativo", gx: 5, gy: 14, zonaId: "taller_subestaciones" },
  "redactor-tecnico": { id: "redactor-tecnico", nombre: "Puesto Redactor Técnico", gx: 21, gy: 5, zonaId: "ala_redaccion" },
  integrador: { id: "integrador", nombre: "Puesto Integrador de Sistemas", gx: 23, gy: 7, zonaId: "ala_redaccion" },

  // Puestos de subagentes convocables
  "sub-armonicos": { id: "sub-armonicos", nombre: "Estación de Espectroscopía FFT", gx: 7, gy: 7.5, zonaId: "lab_calidad_energia" },
  "sub-puesta-tierra": { id: "sub-puesta-tierra", nombre: "Estación de Malla IEEE 80", gx: 7, gy: 15.5, zonaId: "taller_subestaciones" },
  "sub-arco-electrico": { id: "sub-arco-electrico", nombre: "Estación de Seguridad NFPA 70E", gx: 5, gy: 17, zonaId: "taller_subestaciones" },
  "sub-flujo-potencia": { id: "sub-flujo-potencia", nombre: "Estación de Flujo y Cortocircuito", gx: 23, gy: 5, zonaId: "ala_redaccion" },
  "sub-protecciones": { id: "sub-protecciones", nombre: "Estación de Coordinación de Relés", gx: 21, gy: 8.5, zonaId: "ala_redaccion" },
};

/** Matriz de obstáculos del campus ampliado para pathfinding determinista (0 = transitable, 1 = sólido) */
export function esBaldosaTransitable(gx: number, gy: number): boolean {
  const x = Math.round(gx);
  const y = Math.round(gy);

  if (x < 1 || x >= ANCHO_CAMPUS - 1 || y < 1 || y >= FONDO_CAMPUS - 1) return false;

  // Obstáculos conocidos: escritorios, paredes divisorias y maquinaria
  const obstaculos: [number, number, number, number][] = [
    // [xMin, yMin, xMax, yMax]
    [13, 8, 15, 10], // Mesa Orquestador
    [13, 16, 15, 18], // Escritorio Ariel
    [16, 15, 18, 16], // Mesa revisión
    [10, 16, 12, 17], // Mesa Director
    [4, 5, 6, 7], // Escritorio Extractor
    [4, 13, 6, 15], // Escritorio Investigador
    [20, 4, 22, 6], // Escritorio Redactor
    [22, 6, 24, 8], // Escritorio Integrador
    [6, 7, 8, 8], // Mesa FFT
    [6, 15, 8, 16], // Mesa IEEE 80
    [20, 16, 23, 18], // Sillón y cafetera lounge
    [1, 1, 3, 3], // Banco de pruebas transformador
  ];

  for (const [x1, y1, x2, y2] of obstaculos) {
    if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return false;
  }

  return true;
}

/** Pathfinding simple por BFS sobre la grilla para caminar esquivando muebles */
export function calcularRuta(origen: PuntoGrilla, destino: PuntoGrilla): PuntoGrilla[] {
  const ox = Math.max(1, Math.min(ANCHO_CAMPUS - 2, Math.round(origen.gx)));
  const oy = Math.max(1, Math.min(FONDO_CAMPUS - 2, Math.round(origen.gy)));
  let dx = Math.max(1, Math.min(ANCHO_CAMPUS - 2, Math.round(destino.gx)));
  let dy = Math.max(1, Math.min(FONDO_CAMPUS - 2, Math.round(destino.gy)));

  // Si el destino exacto no es transitable (por ejemplo se hizo clic sobre un escritorio), buscar la celda adyacente transitable más cercana
  if (!esBaldosaTransitable(dx, dy)) {
    const vecinos = [
      { gx: dx, gy: dy + 1 },
      { gx: dx + 1, gy: dy },
      { gx: dx, gy: dy - 1 },
      { gx: dx - 1, gy: dy },
    ];
    const trans = vecinos.find((v) => esBaldosaTransitable(v.gx, v.gy));
    if (trans) {
      dx = trans.gx;
      dy = trans.gy;
    }
  }

  if (ox === dx && oy === dy) return [{ gx: dx, gy: dy }];

  const cola: PuntoGrilla[] = [{ gx: ox, gy: oy }];
  const visitados = new Set<string>([`${ox},${oy}`]);
  const padres = new Map<string, PuntoGrilla>();

  const dir = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  let encontrado = false;

  while (cola.length > 0) {
    const actual = cola.shift()!;
    if (actual.gx === dx && actual.gy === dy) {
      encontrado = true;
      break;
    }

    for (const d of dir) {
      const nx = actual.gx + d.x;
      const ny = actual.gy + d.y;
      const clave = `${nx},${ny}`;

      if (!visitados.has(clave) && (esBaldosaTransitable(nx, ny) || (nx === dx && ny === dy))) {
        visitados.add(clave);
        padres.set(clave, actual);
        cola.push({ gx: nx, gy: ny });
      }
    }
  }

  if (!encontrado) {
    // Si no hay camino libre, devolver directamente un paso intermedio
    return [{ gx: dx, gy: dy }];
  }

  // Reconstruir ruta
  const ruta: PuntoGrilla[] = [];
  let actual: PuntoGrilla | undefined = { gx: dx, gy: dy };

  while (actual && !(actual.gx === ox && actual.gy === oy)) {
    ruta.unshift(actual);
    actual = padres.get(`${actual.gx},${actual.gy}`);
  }

  return ruta;
}

