"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { derivarEscena, derivarOrquestador, describirEvento, ZONAS_CAMPUS, type BuzonEscena, type FichaVista } from "@/lib/escena";
import type { Decision, EstadoOficina, FilaConsumo, Resultado } from "@/lib/estado";
import Chat from "./Chat";
import Escena, { type Seleccion } from "./Escena";
import Gasto, { gastoReal, tokensDe, usd } from "./Gasto";
import DialogoModal from "./DialogoModal";
import ConvocatoriaModal from "./ConvocatoriaModal";
import HistoriaModal from "./HistoriaModal";
import { alternarSonido, estaSonidoHabilitado } from "@/lib/audio";
import { obtenerDialogoNpc, type MensajeDialogo, type MisionHistoria } from "@/lib/historia";

export type Pestana = "conversacion" | "encargo" | "gasto";

function buzonEscena(e: EstadoOficina | null): BuzonEscena {
  const m = e?.buzon.mensajes ?? [];
  const ultimo = (autor: string) => [...m].reverse().find((x) => x.autor === autor) ?? null;
  return {
    sinLeer: m.filter((x) => x.autor === "ariel" && !x.leido_en).length,
    ultimoAriel: ultimo("ariel"),
    ultimoOrquestador: ultimo("orquestador"),
    leido: e?.buzon.leido ?? null,
    latido: e?.buzon.latido ?? null,
  };
}

const INTERVALO_MS = 1500; // criterio 7: la escena refleja el estado en menos de 3 s

const NOMBRE_ESTADO: Record<string, string> = {
  abierto: "Abierto",
  en_curso: "En curso",
  en_revision: "Esperando a Ariel",
  emitido: "Emitido",
  cerrado: "Cerrado",
};

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export default function Oficina() {
  const [estado, setEstado] = useState<EstadoOficina | null>(null);
  const [conexion, setConexion] = useState<"ok" | "error">("ok");
  const [seleccion, setSeleccion] = useState<Seleccion | null>({ tipo: "orquestador" });
  const [pestana, setPestana] = useState<Pestana>("conversacion");

  // Estados Gaming & Modo Historia
  const [subagentesExtra, setSubagentesExtra] = useState<FichaVista[]>([]);
  const [modalHistoria, setModalHistoria] = useState(false);
  const [modalConvocatoria, setModalConvocatoria] = useState(false);
  const [dialogoActivo, setDialogoActivo] = useState<{
    personaje: { id: string; nombre: string; rol?: string; icono?: string; avatarColor?: string };
    dialogo: MensajeDialogo;
  } | null>(null);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(false);
  const [estudioXp, setEstudioXp] = useState(250);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/estado", { cache: "no-store" });
      if (r.status === 401) {
        window.location.href = "/entrar";
        return;
      }
      setEstado((await r.json()) as EstadoOficina);
      setConexion("ok");
    } catch {
      setConexion("error");
    }
  }, []);

  useEffect(() => {
    void cargar();
    const t = setInterval(() => void cargar(), INTERVALO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  // Fichas del servidor + subagentes convocados dinámicamente
  const fichasCombinadas = useMemo(() => {
    const base = estado?.fichas ?? [];
    const ids = new Set(base.map((f) => f.id));
    return [...base, ...subagentesExtra.filter((s) => !ids.has(s.id))];
  }, [estado?.fichas, subagentesExtra]);

  const escena = useMemo(
    () =>
      estado
        ? derivarEscena(fichasCombinadas, estado.encargo, estado.eventos, estado.decisiones.length, estado.ahora)
        : derivarEscena([], null, [], 0),
    [estado, fichasCombinadas],
  );
  const buzon = useMemo(() => buzonEscena(estado), [estado]);
  const orquestador = useMemo(
    () =>
      derivarOrquestador(
        escena.orquestador,
        buzon,
        estado?.ahora ?? new Date().toISOString(),
        !!estado?.encargo && !["emitido", "cerrado"].includes(estado.encargo.estado),
      ),
    [escena.orquestador, buzon, estado?.ahora, estado?.encargo],
  );
  const entregables = useMemo(
    () =>
      (estado?.buzon.mensajes ?? [])
        .filter((m) => m.autor === "orquestador" && estado?.encargo && m.encargo_id === estado.encargo.id)
        .reduce((n, m) => n + m.archivos.length, 0),
    [estado],
  );
  const contador = useMemo(() => {
    const filas = estado?.consumo.total ?? [];
    return { tokens: filas.reduce((n, f) => n + tokensDe(f), 0), pagado: gastoReal(filas).rango.min };
  }, [estado?.consumo.total]);

  const abrir = (p: Pestana) => {
    setSeleccion({ tipo: "orquestador" });
    setPestana(p);
  };
  const nombres = useMemo(
    () => Object.fromEntries(fichasCombinadas.map((f) => [f.id, f.nombre])),
    [fichasCombinadas],
  );

  const toggleAudio = () => {
    const nuevo = alternarSonido();
    setSonidoHabilitado(nuevo);
  };

  const hablarConNpc = useCallback(
    (npcId: string, nombre: string) => {
      const estadoVis = escena.agentes[npcId] ?? (npcId === "orquestador" ? orquestador.estado : "En reposo");
      const encargoTitulo = estado?.encargo?.titulo ?? null;

      const dlg = obtenerDialogoNpc(
        npcId,
        nombre,
        estadoVis,
        encargoTitulo,
        () => abrir("encargo"),
        () => setSeleccion(npcId === "orquestador" ? { tipo: "orquestador" } : { tipo: "agente", id: npcId }),
        () => setModalConvocatoria(true),
      );

      const iconos: Record<string, string> = {
        ariel: "👑",
        orquestador: "⚡",
        director: "🏛️",
        rrhh: "👥",
        "extractor-datos": "📈",
        "investigador-normativo": "⚖️",
        "redactor-tecnico": "📝",
        integrador: "🔍",
      };

      setDialogoActivo({
        personaje: {
          id: npcId,
          nombre,
          rol: npcId === "ariel" ? "Ingeniero Líder" : npcId === "orquestador" ? "Líder de Sesión" : "Agente Técnico",
          icono: iconos[npcId] ?? "👷",
        },
        dialogo: dlg,
      });
    },
    [escena.agentes, orquestador.estado, estado?.encargo?.titulo],
  );

  const alActivarMision = useCallback((m: MisionHistoria) => {
    setEstado((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        encargo: {
          id: m.id,
          titulo: m.titulo,
          descripcion: m.descripcion,
          estado: "en_curso",
          sensibilidad: m.sensibilidad,
          version_actual: 1,
        },
        plan: `Objetivo: ${m.subtitulo}\nNormativa: ${m.normasAplicables.join(", ")}\nCriterio de aprobación: ${m.criterioAprobacion}`,
        eventos: [
          ...prev.eventos,
          {
            id: prev.eventos.length + 1,
            encargo_id: m.id,
            tipo: "encargo_abierto",
            actor: "ariel",
            datos: { titulo: m.titulo },
            creado: new Date().toISOString(),
          },
          {
            id: prev.eventos.length + 2,
            encargo_id: m.id,
            tipo: "plan_propuesto",
            actor: "orquestador",
            datos: { plan: m.subtitulo },
            creado: new Date().toISOString(),
          },
        ],
        decisiones: [
          {
            id: `dec_${m.id}`,
            tipo: "resultado",
            pregunta: `¿Aprobar el ${m.entregable} para ${m.cliente}? Verificar: ${m.criterioAprobacion}`,
            estado: "pendiente",
            creado: new Date().toISOString(),
          },
        ],
      };
    });
    setEstudioXp((xp) => xp + 80);
  }, []);

  const alConvocarSubagente = (nuevaFicha: FichaVista) => {
    setSubagentesExtra((prev) => [...prev, nuevaFicha]);
    setEstudioXp((xp) => xp + 40);
  };

  const nivelEstudio = Math.floor(estudioXp / 100) + 1;

  return (
    <div className="oficina">
      <section className="lienzo">
        <header className="cabecera">
          <div className="tarjeta-encargo">
            <span className="icono-encargo" aria-hidden>
              ⚡
            </span>
            <div>
              {estado?.encargo ? (
                <>
                  <p className="titulo-encargo">
                    {estado.encargo.titulo}
                    <span className={`chip estado-${estado.encargo.estado}`}>{NOMBRE_ESTADO[estado.encargo.estado]}</span>
                  </p>
                  <p className="sub-encargo">
                    Versión {estado.encargo.version_actual} · {estado.encargo.sensibilidad === "interno" ? "Interno, solo sesión nativa" : "Permite APIs externas"}
                  </p>
                </>
              ) : (
                <>
                  <p className="titulo-encargo">Sin encargo activo</p>
                  <p className="sub-encargo">Abre un encargo desde la sesión del Orquestador.</p>
                </>
              )}
            </div>
          </div>
          <div className="contadores">
            <button className="boton-gaming-hud chip-xp" onClick={() => setModalHistoria(true)} title="Modo Historia y Misiones Técnicas">
              📜 Nivel {nivelEstudio} ({estudioXp} XP) · Casos
            </button>
            <button className="boton-gaming-hud" onClick={() => setModalConvocatoria(true)} title="Convocar Subagente Especialista">
              ✨ + Convocar
            </button>
            <button className="boton-gaming-hud" onClick={toggleAudio} title="Activar/Silenciar Efectos de Sonido">
              {sonidoHabilitado ? "🔊 Audio ON" : "🔇 Audio OFF"}
            </button>
            <button className="chip-contador" onClick={() => abrir("conversacion")} title="Conversación con el Orquestador">
              💬 {buzon.sinLeer > 0 ? `${buzon.sinLeer} sin leer` : "Buzón"}
            </button>
            <button className="chip-contador" onClick={() => abrir("gasto")} title="Tokens registrados y gasto en APIs">
              🪙 {contador.tokens.toLocaleString("es-DO")} tokens · {usd(contador.pagado)} pagado
            </button>
          </div>
          <Aviso estado={estado} conexion={conexion} alPreparar={cargar} />
        </header>

        <Escena
          fichas={fichasCombinadas}
          estados={escena}
          orquestador={orquestador}
          sinLeer={buzon.sinLeer}
          entregables={entregables}
          encargosEnMuro={estado?.muro.length ?? 0}
          seleccion={seleccion}
          alSeleccionar={setSeleccion}
          alHablarConNpc={hablarConNpc}
        />

        <div className="pie-lienzo">
          <span className="chip-modo">Campus Isométrico · Modo Habbo Gaming</span>
          <form method="post" action="/api/salir">
            <button className="boton-texto" type="submit">
              Salir
            </button>
          </form>
        </div>
      </section>

      <aside className="panel">
        <Panel
          estado={estado}
          fichas={fichasCombinadas}
          seleccion={seleccion}
          nombres={nombres}
          estadosEscena={escena}
          estadoOrquestador={orquestador.estado}
          pestana={pestana}
          estudioXp={estudioXp}
          alCambiarPestana={setPestana}
          alResponder={cargar}
          alAbrirHistoria={() => setModalHistoria(true)}
          alAbrirConvocatoria={() => setModalConvocatoria(true)}
        />
      </aside>

      {/* Modales RPG y Diálogos */}
      {dialogoActivo && (
        <DialogoModal
          personaje={dialogoActivo.personaje}
          dialogo={dialogoActivo.dialogo}
          alCerrar={() => setDialogoActivo(null)}
        />
      )}

      {modalHistoria && (
        <HistoriaModal
          alActivarMision={alActivarMision}
          alCerrar={() => setModalHistoria(false)}
        />
      )}

      {modalConvocatoria && (
        <ConvocatoriaModal
          fichasActuales={fichasCombinadas}
          alConvocarSubagente={alConvocarSubagente}
          alCerrar={() => setModalConvocatoria(false)}
        />
      )}
    </div>
  );
}

function Aviso({ estado, conexion, alPreparar }: { estado: EstadoOficina | null; conexion: "ok" | "error"; alPreparar: () => Promise<void> }) {
  const [preparando, setPreparando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  if (conexion === "error") return <p className="aviso">Sin conexión con el servidor. Reintentando…</p>;
  if (!estado) return null;
  if (estado.base === "sin_configurar")
    return <p className="aviso">Estado compartido no configurado: el servidor no ve ninguna variable con una cadena de conexión de Postgres. Revisa que la base esté conectada a este proyecto en Production y vuelve a desplegar.</p>;
  if (estado.base === "sin_migrar") {
    const preparar = async () => {
      setPreparando(true);
      setFallo(null);
      const r = await fetch("/api/preparar", { method: "POST" });
      setPreparando(false);
      if (!r.ok) setFallo(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo preparar la base");
      await alPreparar();
    };
    return (
      <div className="aviso">
        <p>{estado.detalle === "actualizar" ? "La base de datos necesita las tablas nuevas de esta versión (buzón y archivos)." : "La base de datos está conectada pero todavía no tiene tablas."}</p>
        <button className="boton-primario" disabled={preparando} onClick={() => void preparar()}>
          {preparando ? "Preparando…" : estado.detalle === "actualizar" ? "Actualizar base de datos" : "Preparar base de datos"}
        </button>
        {fallo && <p>{fallo}</p>}
      </div>
    );
  }
  if (estado.base === "error") return <p className="aviso">Error al leer el estado: {estado.detalle}</p>;
  return null;
}

function Panel({
  estado,
  fichas,
  seleccion,
  nombres,
  estadosEscena,
  estadoOrquestador,
  pestana,
  estudioXp,
  alCambiarPestana,
  alResponder,
  alAbrirHistoria,
  alAbrirConvocatoria,
}: {
  estado: EstadoOficina | null;
  fichas: FichaVista[];
  seleccion: Seleccion | null;
  nombres: Record<string, string>;
  estadosEscena: ReturnType<typeof derivarEscena>;
  estadoOrquestador: string;
  pestana: Pestana;
  estudioXp: number;
  alCambiarPestana: (p: Pestana) => void;
  alResponder: () => Promise<void>;
  alAbrirHistoria?: () => void;
  alAbrirConvocatoria?: () => void;
}) {
  if (!estado) return <p className="vacio">Cargando la oficina…</p>;
  const s = seleccion ?? { tipo: "orquestador" as const };

  if (s.tipo === "ariel") {
    const nivel = Math.floor(estudioXp / 100) + 1;
    return (
      <>
        <CabeceraPanel titulo="Ariel Romero" chip="Ingeniero Líder" estado="En el Campus" />
        <Bloque titulo="Perfil Profesional">
          <p>
            Ingeniero eléctrico especializado en calidad de energía, estudios de puesta a tierra y diseño de subestaciones.
          </p>
          <div className="detalle" style={{ marginTop: "8px" }}>
            <span>Nivel de Estudio: {nivel}</span> · <span>{estudioXp} XP Acumulada</span>
          </div>
        </Bloque>
        <Bloque titulo="Misiones y Equipo">
          <div className="acciones">
            <button className="boton-primario" onClick={alAbrirHistoria}>
              📜 Despachar Caso del Modo Historia
            </button>
            <button className="boton-secundario" onClick={alAbrirConvocatoria}>
              ✨ Convocar Nuevo Subagente Especialista
            </button>
          </div>
        </Bloque>
      </>
    );
  }

  if (s.tipo === "zona") {
    const zona = ZONAS_CAMPUS.find((z) => z.id === s.id);
    if (!zona) return null;
    return (
      <>
        <CabeceraPanel titulo={zona.nombre} chip={zona.icono} estado="Sector Activo" />
        <Bloque titulo="Equipamiento y Propósito">
          <p>{zona.descripcion}</p>
        </Bloque>
        <Bloque titulo="Operaciones de Ingeniería">
          <div className="acciones">
            <button className="boton-secundario" onClick={alAbrirHistoria}>
              📋 Ver Casos Relacionados con este Sector
            </button>
          </div>
        </Bloque>
      </>
    );
  }

  if (s.tipo === "agente") {
    const f = fichas.find((x) => x.id === s.id) ?? estado.fichas.find((x) => x.id === s.id);
    if (!f) return null;
    const propios = estado.resultados.filter((r) => r.ficha_id === f.id);
    const fallo = [...estado.eventos].reverse().find((e) => e.actor === f.id && e.tipo === "agente_fallo");
    const vigente = fallo && ["Bloqueado", "Error"].includes(estadosEscena.agentes[f.id]);
    return (
      <>
        <CabeceraPanel titulo={f.nombre} chip={modoFicha(f)} estado={estadosEscena.agentes[f.id] ?? "En reposo"} />
        <Bloque titulo="Ficha Técnica">
          <p>{f.especialidad}</p>
          {!f.configurado && f.respaldo_nativo && (
            <p className="aviso">Sin clave de {f.proveedor}: trabaja como subagente de la sesión nativa y su resultado queda para revisión de Ariel.</p>
          )}
          {!f.configurado && !f.respaldo_nativo && <p className="aviso">Proveedor No configurado: el plan no le asigna tareas.</p>}
          {vigente && (
            <p className="aviso">
              Último fallo ({hora(fallo.creado)}): {String(fallo.datos.estado)}
              {fallo.datos.detalle ? ` — ${String(fallo.datos.detalle)}` : ""}
            </p>
          )}
        </Bloque>
        <Bloque titulo="Resultados en este encargo">
          {propios.length === 0 ? <p className="vacio">Sin resultados todavía.</p> : propios.map((r) => <TarjetaResultado key={r.id} r={r} />)}
        </Bloque>
      </>
    );
  }

  if (s.tipo === "rrhh") {
    return (
      <>
        <CabeceraPanel titulo="Oficina de RR. HH." estado={estadosEscena.rrhh} />
        <Bloque titulo="Catálogo de fichas">
          {estado.fichas.length === 0 && <p className="vacio">No hay fichas sincronizadas.</p>}
          <ul className="lista">
            {estado.fichas.map((f) => (
              <li key={f.id}>
                <strong>{f.nombre}</strong>
                <span className="detalle">
                  {modoFicha(f)} · {f.configurado ? "Configurado" : f.respaldo_nativo ? "Respaldo nativo" : "No configurado"}
                </span>
              </li>
            ))}
          </ul>
        </Bloque>
        <Bloque titulo="Biblioteca">
          {estado.biblioteca.length === 0 ? (
            <p className="vacio">Todavía no hay recursos. Las plantillas y aprendizajes aparecen aquí cuando apruebas guardarlos.</p>
          ) : (
            <ul className="lista">
              {estado.biblioteca.map((r) => (
                <li key={r.id}>
                  <strong>
                    {r.tipo === "plantilla" ? "📄 " : ""}
                    {r.titulo}
                  </strong>
                  <span className="detalle">
                    {r.tipo} · {r.estado === "guardado" ? "Guardado" : "Candidato (espera tu aprobación)"} · {r.resumen}
                  </span>
                  {r.archivo_id && (
                    <a className="detalle" href={`/api/archivos/${encodeURIComponent(r.archivo_id)}`} download={r.archivo_nombre ?? undefined}>
                      Descargar {r.archivo_nombre ?? "archivo"}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      </>
    );
  }

  if (s.tipo === "muro") {
    return (
      <>
        <CabeceraPanel titulo="Muro de encargos" />
        <Bloque titulo="Encargos recientes">
          {estado.muro.length === 0 && <p className="vacio">Todavía no hay encargos.</p>}
          <ul className="lista">
            {estado.muro.map((e) => (
              <li key={e.id}>
                <strong>{e.titulo}</strong>
                <span className="detalle">
                  {NOMBRE_ESTADO[e.estado] ?? e.estado} · {new Date(e.actualizado).toLocaleString("es-DO")}
                </span>
                <span className="detalle">{resumenGasto(e.consumo)}</span>
              </li>
            ))}
          </ul>
        </Bloque>
      </>
    );
  }

  const mesa = (
    <Bloque titulo="Mesa de revisión">
      {estado.decisiones.length === 0 ? (
        <p className="vacio">No hay decisiones pendientes.</p>
      ) : (
        estado.decisiones.map((d) => <TarjetaDecision key={d.id} d={d} alResponder={alResponder} />)
      )}
    </Bloque>
  );

  if (s.tipo === "revision" || s.tipo === "director") {
    return (
      <>
        <CabeceraPanel titulo={s.tipo === "director" ? "Puesto del Director" : "Mesa de revisión"} />
        {mesa}
        <Bloque titulo="Resultados del encargo">
          {estado.resultados.length === 0 ? <p className="vacio">Sin resultados todavía.</p> : estado.resultados.map((r) => <TarjetaResultado key={r.id} r={r} nombre={nombres[r.ficha_id]} />)}
        </Bloque>
      </>
    );
  }

  // Mesa del Orquestador (vista por defecto): conversación, encargo y gasto.
  const sinLeer = estado.buzon.mensajes.filter((m) => m.autor === "ariel" && !m.leido_en).length;
  const pestanas = (
    <div className="pestanas" role="tablist">
      {(
        [
          ["conversacion", sinLeer ? `Conversación (${sinLeer})` : "Conversación"],
          ["encargo", "Encargo"],
          ["gasto", "Gasto"],
        ] as const
      ).map(([id, texto]) => (
        <button key={id} role="tab" aria-selected={pestana === id} className={pestana === id ? "activo" : ""} onClick={() => alCambiarPestana(id)}>
          {texto}
        </button>
      ))}
    </div>
  );
  const cabecera = <CabeceraPanel titulo="Mesa del Orquestador" chip="Sesión nativa" estado={estadoOrquestador} />;

  if (pestana === "conversacion") {
    return (
      <>
        {cabecera}
        {pestanas}
        <Chat buzon={estado.buzon} ahora={estado.ahora} encargoId={estado.encargo && !["emitido", "cerrado"].includes(estado.encargo.estado) ? estado.encargo.id : null} alEnviar={alResponder} />
      </>
    );
  }
  if (pestana === "gasto") {
    return (
      <>
        {cabecera}
        {pestanas}
        <Gasto encargo={estado.consumo.encargo} total={estado.consumo.total} hayEncargo={!!estado.encargo} />
      </>
    );
  }
  return (
    <>
      {cabecera}
      {pestanas}
      <Bloque titulo="Plan del encargo">
        {estado.plan ? <p>{estado.plan}</p> : <p className="vacio">El Orquestador aún no registra un plan.</p>}
        {estado.equipo.length > 0 && (
          <ul className="lista">
            {estado.equipo.map((m, i) => (
              <li key={`${m.ficha_id}-${i}`}>
                <strong>{nombres[m.ficha_id] ?? m.ficha_id}</strong>
                <span className="detalle">
                  {m.tarea} · {estadosEscena.agentes[m.ficha_id] ?? "En reposo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bloque>
      {mesa}
      <Bloque titulo="Actividad">
        {estado.eventos.length === 0 ? (
          <p className="vacio">Sin actividad registrada.</p>
        ) : (
          <ol className="actividad">
            {[...estado.eventos].reverse().slice(0, 30).map((e) => (
              <li key={e.id}>
                <time>{hora(e.creado)}</time>
                <span>{describirEvento(e, nombres)}</span>
              </li>
            ))}
          </ol>
        )}
      </Bloque>
    </>
  );
}

/** Texto corto de tokens y costo de un encargo. Solo lo registrado; nada estimado. */
function resumenGasto(filas: FilaConsumo[]): string {
  const tokens = filas.reduce((n, f) => n + tokensDe(f), 0);
  if (tokens === 0) return "Sin tokens registrados";
  const { rango } = gastoReal(filas);
  const sesion = filas.some((f) => f.origen === "sesion");
  return `${tokens.toLocaleString("es-DO")} tokens · ${usd(rango.min)} pagado${sesion ? " (+ sesión nativa en tu suscripción)" : ""}`;
}

function modoFicha(f: FichaVista) {
  return f.configurado || !f.respaldo_nativo ? `${f.proveedor} · ${f.modelo}` : "Sesión nativa · subagente";
}

function CabeceraPanel({ titulo, chip, estado }: { titulo: string; chip?: string; estado?: string }) {
  return (
    <header className="cabecera-panel">
      <div>
        <h2>{titulo}</h2>
        {estado && <p className="estado-panel">{estado}</p>}
      </div>
      {chip && <span className="chip-modelo">{chip}</span>}
    </header>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bloque">
      <h3>{titulo}</h3>
      {children}
    </section>
  );
}

function TarjetaResultado({ r, nombre }: { r: Resultado; nombre?: string }) {
  const procedencia =
    r.origen === "api"
      ? `${r.proveedor} · ${r.modelo} · ${r.tokens_entrada ?? "?"} + ${r.tokens_salida ?? "?"} tokens · ${hora(r.creado)}`
      : `${r.motivo_relevo === "sin_clave" ? "Subagente de la sesión" : "Relevo nativo"} (${r.modelo_nativo ?? "sesión"}) · original: ${r.proveedor_original}, ${r.motivo_relevo}${r.tokens_total != null ? ` · ${r.tokens_total} tokens` : ""} · ${hora(r.creado)}`;
  return (
    <article className={r.origen === "api" ? "resultado" : "resultado relevo"}>
      {nombre && <strong>{nombre}</strong>}
      <p className="detalle">{procedencia}</p>
      <details>
        <summary>Ver contenido</summary>
        <pre>{r.contenido}</pre>
      </details>
    </article>
  );
}

function TarjetaDecision({ d, alResponder }: { d: Decision; alResponder: () => Promise<void> }) {
  const [comentario, setComentario] = useState("");
  const [devolviendo, setDevolviendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function responder(estado: "aprobada" | "devuelta") {
    setEnviando(true);
    setError(null);
    const r = await fetch(`/api/decisiones/${encodeURIComponent(d.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, comentario }),
    });
    setEnviando(false);
    if (!r.ok) {
      setError(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo registrar la decisión");
      return;
    }
    await alResponder();
  }

  return (
    <article className="decision">
      <p className="etiqueta">{d.tipo}</p>
      <p>{d.pregunta}</p>
      {devolviendo && (
        <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentarios para el Orquestador" rows={3} />
      )}
      {error && <p className="aviso">{error}</p>}
      <div className="acciones">
        <button className="boton-primario" disabled={enviando} onClick={() => void responder("aprobada")}>
          Aprobar
        </button>
        {devolviendo ? (
          <button className="boton-secundario" disabled={enviando || !comentario.trim()} onClick={() => void responder("devuelta")}>
            Enviar devolución
          </button>
        ) : (
          <button className="boton-secundario" disabled={enviando} onClick={() => setDevolviendo(true)}>
            Devolver con comentarios
          </button>
        )}
      </div>
    </article>
  );
}
