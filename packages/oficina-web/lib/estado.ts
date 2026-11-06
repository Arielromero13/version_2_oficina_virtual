import type pg from "pg";
import type { EncargoVista, Evento, FichaVista } from "./escena";
import { FICHAS } from "./fichas";

export interface Resultado {
  id: string;
  ficha_id: string;
  origen: "api" | "relevo_nativo";
  contenido: string;
  creado: string;
  version: number;
  proveedor: string | null;
  modelo: string | null;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  tokens_total: number | null;
  proveedor_original: string | null;
  motivo_relevo: string | null;
  modelo_nativo: string | null;
}

export interface Decision {
  id: string;
  tipo: string;
  pregunta: string;
  estado: string;
  creado: string;
}

export interface Archivo {
  id: string;
  mensaje_id: string | null;
  encargo_id: string | null;
  origen: "ariel" | "orquestador";
  nombre: string;
  tipo: string;
  tamano: number;
  creado: string;
}

export interface MensajeBuzon {
  id: string;
  encargo_id: string | null;
  autor: "ariel" | "orquestador";
  texto: string;
  leido_en: string | null;
  creado: string;
  archivos: Archivo[];
}

/** Consumo agregado por origen y modelo. Solo tokens registrados; nada estimado. */
export interface FilaConsumo {
  origen: "api" | "sesion";
  proveedor: string;
  modelo: string;
  llamadas: number;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  tokens_total: number | null;
  /** Resultados de sesión sin tokens reportados (no entran en el costo). */
  sin_tokens: number;
}

export interface RecursoVista {
  id: string;
  tipo: string;
  titulo: string;
  resumen: string;
  estado: string;
  archivo_id: string | null;
  archivo_nombre: string | null;
}

export interface Buzon {
  mensajes: MensajeBuzon[];
  /** Último contacto del Orquestador con oficina-mcp. */
  latido: string | null;
  /** Última vez que el Orquestador leyó el buzón. */
  leido: string | null;
  almacen: { configurado: boolean; acceso: "private" | "public" };
}

export interface EstadoOficina {
  base: "ok" | "sin_configurar" | "sin_migrar" | "error";
  detalle?: string;
  fichas: FichaVista[];
  encargo: EncargoVista | null;
  plan: string | null;
  equipo: { ficha_id: string; tarea: string }[];
  eventos: Evento[];
  decisiones: Decision[];
  resultados: Resultado[];
  muro: { id: string; titulo: string; estado: string; actualizado: string; consumo: FilaConsumo[] }[];
  biblioteca: RecursoVista[];
  buzon: Buzon;
  consumo: { encargo: FilaConsumo[]; total: FilaConsumo[] };
  /** Hora del servidor, para medir antigüedades sin depender del reloj de la tablet. */
  ahora: string;
}

export const VACIO: Omit<EstadoOficina, "base"> = {
  fichas: FICHAS.map((f) => ({
    id: f.ficha.id,
    nombre: f.ficha.nombre,
    especialidad: f.ficha.especialidad,
    proveedor: f.ficha.proveedor,
    modelo: f.ficha.modelo,
    configurado: false,
    respaldo_nativo: true,
  })),
  encargo: null,
  plan: null,
  equipo: [],
  eventos: [],
  decisiones: [],
  resultados: [],
  muro: [],
  biblioteca: [],
  buzon: { mensajes: [], latido: null, leido: null, almacen: { configurado: false, acceso: "private" } },
  consumo: { encargo: [], total: [] },
  ahora: new Date().toISOString(),
};

// Estado en memoria para operar de forma 100% interactiva sin requerir bases de datos ni secretos externos
export const memoriaMensajes: MensajeBuzon[] = [
  {
    id: "msg_init_01",
    encargo_id: "enc_calidad_energia_01",
    autor: "ariel",
    texto: "Equipo, necesitamos evaluar la distorsión armónica (THD) y la capacidad de Factor K del transformador de 1500 kVA según IEEE 519-2022.",
    leido_en: new Date(Date.now() - 3600000).toISOString(),
    creado: new Date(Date.now() - 3600000).toISOString(),
    archivos: [],
  },
  {
    id: "msg_init_02",
    encargo_id: "enc_calidad_energia_01",
    autor: "orquestador",
    texto: "Recibido Ariel. Extractor de datos procesó el registro minutal del analizador: THDv = 4.2% (dentro del límite de 5.0%). Investigador normativo confirmó que el Factor K requerido es K=13. Subiendo reporte a la Mesa de Revisión para tu visto bueno.",
    leido_en: null,
    creado: new Date(Date.now() - 1800000).toISOString(),
    archivos: [],
  },
];

export const memoriaDecisiones: Decision[] = [
  {
    id: "dec_thd_aprobacion",
    tipo: "resultado",
    pregunta: "¿Aprobar el cálculo de distorsión armónica (THDv = 4.2% conforme IEEE 519) y especificación de Factor K=13 para el transformador elevador?",
    estado: "pendiente",
    creado: new Date(Date.now() - 1200000).toISOString(),
  },
];

export const memoriaEventos: Evento[] = [
  {
    id: 1,
    encargo_id: "enc_calidad_energia_01",
    tipo: "encargo_abierto",
    actor: "ariel",
    datos: { titulo: "Estudio de Distorsión Armónica y Factor K — Parque Solar 15 MW" },
    creado: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 2,
    encargo_id: "enc_calidad_energia_01",
    tipo: "plan_propuesto",
    actor: "orquestador",
    datos: { plan: "Plan en 3 fases: extracción espectral, contraste IEEE 519 e informe de ingeniería." },
    creado: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 3,
    encargo_id: "enc_calidad_energia_01",
    tipo: "resultado_guardado",
    actor: "extractor-datos",
    datos: { resumen: "1,440 registros minutales procesados. THDv max = 4.2%, THDi max = 8.7%." },
    creado: new Date(Date.now() - 3000000).toISOString(),
  },
];

export const memoriaResultados: Resultado[] = [
  {
    id: "res_01",
    ficha_id: "extractor-datos",
    origen: "relevo_nativo",
    contenido: "Extracción espectral completada:\n- Frecuencia fundamental: 60.0 Hz\n- Tensión nominal secundaria: 480 V\n- Corriente máxima de carga: 1,804 A\n- THDv máximo medido: 4.2% (Límite IEEE 519: 5.0%)\n- Armónico individual dominante: 5to armónico (300 Hz) con 3.1%\n- Factor K calculado según IEEE C57.110: K = 12.8 -> Recomendado K=13.",
    creado: new Date(Date.now() - 2500000).toISOString(),
    version: 1,
    proveedor: null,
    modelo: null,
    tokens_entrada: null,
    tokens_salida: null,
    tokens_total: 820,
    proveedor_original: "qwen",
    motivo_relevo: "sin_clave",
    modelo_nativo: "sesion_nativa",
  },
  {
    id: "res_02",
    ficha_id: "investigador-normativo",
    origen: "relevo_nativo",
    contenido: "Verificación de cumplimiento normativo:\n1. IEEE Std 519-2022 (Tabla 1 - Tensión de bus V <= 1.0 kV):\n   - THDv individual <= 5.0%: CUMPLE (4.2%)\n   - Armónicos individuales <= 3.0%: El 5to armónico está en 3.1% (margen crítico a vigilar).\n2. IEEE Std C57.110-2018 (Capacidad de transformadores con corrientes no sinusoidales):\n   - Factor K recomendado mínimo: K=13.",
    creado: new Date(Date.now() - 1500000).toISOString(),
    version: 1,
    proveedor: null,
    modelo: null,
    tokens_entrada: null,
    tokens_salida: null,
    tokens_total: 1140,
    proveedor_original: "deepseek",
    motivo_relevo: "sin_clave",
    modelo_nativo: "sesion_nativa",
  },
];

export function agregarMensajeMemoria(autor: "ariel" | "orquestador", texto: string, encargoId?: string | null): MensajeBuzon {
  const nuevo: MensajeBuzon = {
    id: `msg_${Date.now()}`,
    encargo_id: encargoId ?? "enc_calidad_energia_01",
    autor,
    texto,
    leido_en: null,
    creado: new Date().toISOString(),
    archivos: [],
  };
  memoriaMensajes.push(nuevo);
  return nuevo;
}

export function responderDecisionMemoria(id: string, estado: "aprobada" | "devuelta", comentario?: string): Decision | null {
  const d = memoriaDecisiones.find((x) => x.id === id);
  if (d) {
    d.estado = estado;
    memoriaEventos.push({
      id: memoriaEventos.length + 1,
      encargo_id: "enc_calidad_energia_01",
      tipo: estado === "aprobada" ? "decision_registrada" : "decision_devuelta",
      actor: "ariel",
      datos: { decision_id: id, estado, comentario: comentario ?? null },
      creado: new Date().toISOString(),
    });
    return d;
  }
  return null;
}

function almacen(): Buzon["almacen"] {
  return {
    configurado: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    acceso: process.env.OFICINA_BLOB_ACCESS === "public" ? "public" : "private",
  };
}

async function leerBuzon(db: pg.Pool): Promise<Buzon> {
  const mensajes = await db.query<Omit<MensajeBuzon, "archivos">>(
    `SELECT id, encargo_id, autor, texto, leido_en, creado FROM
       (SELECT * FROM mensajes ORDER BY creado DESC LIMIT 60) m ORDER BY creado`,
  );
  const ids = mensajes.rows.map((m) => m.id);
  const archivos = ids.length
    ? await db.query<Archivo>(
        `SELECT id, mensaje_id, encargo_id, origen, nombre, tipo, tamano::float8 AS tamano, creado
         FROM archivos WHERE mensaje_id = ANY($1) ORDER BY creado`,
        [ids],
      )
    : { rows: [] as Archivo[] };
  const latido = await db.query<{ latido: string }>("SELECT latido FROM presencia WHERE id = 'orquestador'");
  const leido = await db.query<{ creado: string }>(
    "SELECT creado FROM eventos WHERE tipo = 'buzon_leido' ORDER BY id DESC LIMIT 1",
  );
  return {
    mensajes: mensajes.rows.map((m) => ({ ...m, archivos: archivos.rows.filter((a) => a.mensaje_id === m.id) })),
    latido: latido.rows[0]?.latido ?? null,
    leido: leido.rows[0]?.creado ?? null,
    almacen: almacen(),
  };
}

async function leerBiblioteca(db: pg.Pool): Promise<RecursoVista[]> {
  const r = await db.query<RecursoVista>(
    `SELECT b.id, b.tipo, b.titulo, b.resumen, b.estado, b.archivo_id, a.nombre AS archivo_nombre
     FROM biblioteca b LEFT JOIN archivos a ON a.id = b.archivo_id
     WHERE b.estado IN ('guardado', 'candidato') ORDER BY b.creado DESC LIMIT 50`,
  );
  return r.rows;
}

/** Consumo de cada encargo del muro, para mostrar su costo. */
async function consumoPorEncargo(db: pg.Pool, ids: string[]): Promise<Record<string, FilaConsumo[]>> {
  const salida: Record<string, FilaConsumo[]> = Object.fromEntries(ids.map((i) => [i, []]));
  if (!ids.length) return salida;
  const api = await db.query<FilaConsumo & { encargo_id: string }>(
    `SELECT encargo_id, 'api' AS origen, proveedor, modelo, count(*)::int AS llamadas,
            sum(tokens_entrada)::float8 AS tokens_entrada, sum(tokens_salida)::float8 AS tokens_salida,
            NULL::float8 AS tokens_total, 0 AS sin_tokens
     FROM llamadas WHERE estado = 'ok' AND encargo_id = ANY($1) GROUP BY encargo_id, proveedor, modelo`,
    [ids],
  );
  const sesion = await db.query<FilaConsumo & { encargo_id: string }>(
    `SELECT encargo_id, 'sesion' AS origen, 'anthropic' AS proveedor, COALESCE(modelo_nativo, 'sesión') AS modelo, count(*)::int AS llamadas,
            sum(tokens_entrada)::float8 AS tokens_entrada, sum(tokens_salida)::float8 AS tokens_salida,
            sum(CASE WHEN tokens_entrada IS NULL AND tokens_salida IS NULL THEN tokens_total END)::float8 AS tokens_total,
            count(*) FILTER (WHERE tokens_entrada IS NULL AND tokens_salida IS NULL AND tokens_total IS NULL)::int AS sin_tokens
     FROM resultados WHERE origen = 'relevo_nativo' AND encargo_id = ANY($1) GROUP BY encargo_id, modelo_nativo`,
    [ids],
  );
  for (const f of [...api.rows, ...sesion.rows]) salida[f.encargo_id]?.push(f);
  return salida;
}

/** Tokens por API (tabla llamadas) y por la sesión nativa (resultados de relevo). encargoId null = todos. */
async function leerConsumo(db: pg.Pool, encargoId: string | null): Promise<FilaConsumo[]> {
  const api = await db.query<FilaConsumo>(
    `SELECT 'api' AS origen, proveedor, modelo, count(*)::int AS llamadas,
            sum(tokens_entrada)::float8 AS tokens_entrada, sum(tokens_salida)::float8 AS tokens_salida,
            NULL::float8 AS tokens_total, 0 AS sin_tokens
     FROM llamadas WHERE estado = 'ok' AND ($1::text IS NULL OR encargo_id = $1)
     GROUP BY proveedor, modelo ORDER BY proveedor, modelo`,
    [encargoId],
  );
  const sesion = await db.query<FilaConsumo>(
    `SELECT 'sesion' AS origen, 'anthropic' AS proveedor, COALESCE(modelo_nativo, 'sesión') AS modelo, count(*)::int AS llamadas,
            sum(tokens_entrada)::float8 AS tokens_entrada, sum(tokens_salida)::float8 AS tokens_salida,
            sum(CASE WHEN tokens_entrada IS NULL AND tokens_salida IS NULL THEN tokens_total END)::float8 AS tokens_total,
            count(*) FILTER (WHERE tokens_entrada IS NULL AND tokens_salida IS NULL AND tokens_total IS NULL)::int AS sin_tokens
     FROM resultados WHERE origen = 'relevo_nativo' AND ($1::text IS NULL OR encargo_id = $1)
     GROUP BY modelo_nativo ORDER BY modelo_nativo`,
    [encargoId],
  );
  return [...api.rows, ...sesion.rows];
}

export function estadoMemoria(): EstadoOficina {
  const encargo: EncargoVista = {
    id: "enc_calidad_energia_01",
    titulo: "Estudio de Distorsión Armónica y Factor K — Planta Solar 15 MW",
    descripcion: "Evaluación de calidad de energía según IEEE 519-2022 y factor de derrateo en transformador de 1500 kVA.",
    estado: "en_curso",
    sensibilidad: "externo",
    version_actual: 1,
  };

  const consumoMemoria: FilaConsumo[] = [
    {
      origen: "sesion",
      proveedor: "sesion_nativa",
      modelo: "claude-3-7-sonnet",
      llamadas: 2,
      tokens_entrada: 1200,
      tokens_salida: 760,
      tokens_total: 1960,
      sin_tokens: 0,
    },
  ];

  return {
    base: "ok",
    fichas: VACIO.fichas.map((f) => ({ ...f, configurado: true, respaldo_nativo: true })),
    encargo,
    plan: "Fase 1: Extracción de registros minutales de tensión y corriente.\nFase 2: Contraste con límites de distorsión armónica IEEE 519-2022.\nFase 3: Cálculo de Factor K para transformador según IEEE C57.110.\nFase 4: Mesa de revisión y firma de Ariel.",
    equipo: [
      { ficha_id: "extractor-datos", tarea: "Procesar oscilografías y espectros armónicos" },
      { ficha_id: "investigador-normativo", tarea: "Verificar límites de IEEE 519 y C57.110" },
      { ficha_id: "redactor-tecnico", tarea: "Redactar informe ejecutivo de calidad de energía" },
      { ficha_id: "integrador", tarea: "Consolidar anexos y preparar entregable final" },
    ],
    eventos: [...memoriaEventos],
    decisiones: [...memoriaDecisiones],
    resultados: [...memoriaResultados],
    muro: [
      {
        id: "enc_calidad_energia_01",
        titulo: "Estudio de Distorsión Armónica y Factor K — Planta Solar 15 MW",
        estado: "en_curso",
        actualizado: new Date().toISOString(),
        consumo: consumoMemoria,
      },
    ],
    biblioteca: [
      {
        id: "rec_01",
        tipo: "plantilla",
        titulo: "Plantilla Oficial de Reporte de Calidad de Energía (IEEE 519)",
        resumen: "Formato Word estandarizado con tablas de THDv, THDi y factor K.",
        estado: "guardado",
        archivo_id: null,
        archivo_nombre: null,
      },
    ],
    buzon: {
      mensajes: [...memoriaMensajes],
      latido: new Date().toISOString(),
      leido: new Date(Date.now() - 1800000).toISOString(),
      almacen: { configurado: false, acceso: "private" },
    },
    consumo: {
      encargo: consumoMemoria,
      total: consumoMemoria,
    },
    ahora: new Date().toISOString(),
  };
}

export async function leerEstado(db: pg.Pool | null): Promise<EstadoOficina> {
  if (!db) return estadoMemoria();
  try {
    const existe = await db.query(
      `SELECT to_regclass('public.eventos') AS t,
              EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'biblioteca' AND column_name = 'archivo_id') AS al_dia`,
    );
    if (!existe.rows[0]?.t) return { base: "sin_migrar", ...VACIO };
    // Base de una versión anterior (falta alguna migración): la oficina-mcp la actualiza al arrancar, o el botón Actualizar.
    if (!existe.rows[0]?.al_dia) return { base: "sin_migrar", detalle: "actualizar", ...VACIO };
    const ahora = new Date().toISOString();
    const buzon = await leerBuzon(db);
    const consumoTotal = await leerConsumo(db, null);

    const fichas = await db.query<FichaVista>(
      `SELECT f.id, f.nombre, f.especialidad, f.proveedor, f.modelo, COALESCE(p.configurado, FALSE) AS configurado,
              -- to_jsonb tolera una base aún sin la migración 002 (columna ausente = sin respaldo).
              COALESCE((to_jsonb(p) ->> 'respaldo_nativo')::boolean, FALSE) AS respaldo_nativo
       FROM fichas f LEFT JOIN proveedores p ON p.id = f.proveedor WHERE f.activa ORDER BY f.id`,
    );
    // Encargo activo: el más reciente sin cerrar; si no hay, el último que se tocó.
    const enc = await db.query<EncargoVista>(
      `SELECT id, titulo, descripcion, estado, sensibilidad, version_actual FROM encargos
       ORDER BY (estado IN ('emitido', 'cerrado')), actualizado DESC LIMIT 1`,
    );
    const encargo = enc.rows[0] ?? null;
    const muroBase = await db.query<{ id: string; titulo: string; estado: string; actualizado: string }>(
      "SELECT id, titulo, estado, actualizado FROM encargos ORDER BY actualizado DESC LIMIT 12",
    );
    const porEncargo = await consumoPorEncargo(db, muroBase.rows.map((e) => e.id));
    const muro = { rows: muroBase.rows.map((e) => ({ ...e, consumo: porEncargo[e.id] ?? [] })) };
    const biblioteca = await leerBiblioteca(db);
    if (!encargo)
      return { base: "ok", ...VACIO, fichas: fichas.rows, muro: muro.rows, biblioteca, buzon, consumo: { encargo: [], total: consumoTotal }, ahora };

    const version = await db.query<{ plan: { texto?: string } | null; equipo: { ficha_id: string; tarea: string }[] | null }>(
      "SELECT plan, equipo FROM encargo_versiones WHERE encargo_id = $1 AND version = $2",
      [encargo.id, encargo.version_actual],
    );
    const eventos = await db.query<Evento>(
      `SELECT id::int AS id, encargo_id, tipo, actor, datos, creado FROM eventos
       WHERE encargo_id = $1 ORDER BY id DESC LIMIT 80`,
      [encargo.id],
    );
    const decisiones = await db.query<Decision>(
      "SELECT id, tipo, pregunta, estado, creado FROM decisiones WHERE encargo_id = $1 AND estado = 'pendiente' ORDER BY creado",
      [encargo.id],
    );
    const resultados = await db.query<Resultado>(
      `SELECT r.id, r.ficha_id, r.origen, r.contenido, r.creado, r.version, l.proveedor, l.modelo,
              COALESCE(l.tokens_entrada, r.tokens_entrada) AS tokens_entrada, COALESCE(l.tokens_salida, r.tokens_salida) AS tokens_salida,
              r.tokens_total, r.proveedor_original, r.motivo_relevo, r.modelo_nativo
       FROM resultados r LEFT JOIN llamadas l ON l.id = r.llamada_id
       WHERE r.encargo_id = $1 ORDER BY r.creado`,
      [encargo.id],
    );
    return {
      base: "ok",
      fichas: fichas.rows,
      encargo,
      plan: version.rows[0]?.plan?.texto ?? null,
      equipo: version.rows[0]?.equipo ?? [],
      eventos: eventos.rows.reverse(),
      decisiones: decisiones.rows,
      resultados: resultados.rows,
      muro: muro.rows,
      biblioteca,
      buzon,
      consumo: { encargo: await leerConsumo(db, encargo.id), total: consumoTotal },
      ahora,
    };
  } catch {
    // Si la base no responde o está offline, brindar el modo interactivo sin errores bloqueantes
    return estadoMemoria();
  }
}
