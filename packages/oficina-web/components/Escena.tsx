"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type TouchEvent } from "react";
import { reproducirPaso } from "@/lib/audio";
import {
  ANCHO_CAMPUS,
  FONDO_CAMPUS,
  PUESTOS_CAMPUS,
  ZONAS_CAMPUS,
  calcularRuta,
  type EstadoOrquestador,
  type EstadoVisible,
  type EstadosEscena,
  type FichaVista,
  type PuntoGrilla,
} from "@/lib/escena";

/** Selección en la escena: zona o personaje */
export type Seleccion =
  | { tipo: "orquestador" }
  | { tipo: "director" }
  | { tipo: "rrhh" }
  | { tipo: "revision" }
  | { tipo: "muro" }
  | { tipo: "ariel" }
  | { tipo: "zona"; id: string }
  | { tipo: "agente"; id: string };

// ---------- Proyección isométrica estándar ----------
const TW = 28; // medio ancho de baldosa
const TH = 14; // medio alto de baldosa
const iso = (gx: number, gy: number, z = 0) => ({ x: (gx - gy) * TW, y: (gx + gy) * TH - z });
const pts = (...p: { x: number; y: number }[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

interface EscenaProps {
  fichas: FichaVista[];
  estados: EstadosEscena;
  orquestador: EstadoOrquestador;
  sinLeer: number;
  entregables: number;
  encargosEnMuro: number;
  seleccion: Seleccion | null;
  alSeleccionar: (s: Seleccion) => void;
  alHablarConNpc?: (npcId: string, nombre: string) => void;
}

// Colores de muebles y materiales estilo Atelier / Habbo
const MADERA_NOBLE = { arriba: "#dfd2b9", izq: "#c5b699", der: "#b3a385" };
const MADERA_OSCURA = { arriba: "#5c4033", izq: "#463024", der: "#36241a" };
const ACERO_LAB = { arriba: "#e2e8f0", izq: "#cbd5e1", der: "#94a3b8" };
const SOFA_CUERO = { arriba: "#1e3a8a", izq: "#1e40af", der: "#172554" };

function CajaIso({
  gx,
  gy,
  w,
  d,
  h,
  arriba,
  izq,
  der,
  z = 0,
}: {
  gx: number;
  gy: number;
  w: number;
  d: number;
  h: number;
  arriba: string;
  izq: string;
  der: string;
  z?: number;
}) {
  const t = h + z;
  return (
    <g>
      <polygon points={pts(iso(gx, gy + d, t), iso(gx + w, gy + d, t), iso(gx + w, gy + d, z), iso(gx, gy + d, z))} fill={izq} />
      <polygon points={pts(iso(gx + w, gy, t), iso(gx + w, gy + d, t), iso(gx + w, gy + d, z), iso(gx + w, gy, z))} fill={der} />
      <polygon points={pts(iso(gx, gy, t), iso(gx + w, gy, t), iso(gx + w, gy + d, t), iso(gx, gy + d, t))} fill={arriba} />
    </g>
  );
}

function EscritorioIso({ gx, gy, encendido, material = MADERA_NOBLE }: { gx: number; gy: number; encendido: boolean; material?: typeof MADERA_NOBLE }) {
  const pantalla = iso(gx + 0.6, gy + 0.25, 30);
  return (
    <g>
      <CajaIso gx={gx} gy={gy} w={1.7} d={0.95} h={20} {...material} />
      {/* Monitor de pantalla plana */}
      <g transform={`translate(${pantalla.x},${pantalla.y})`}>
        <polygon points="-2,0 16,-8 16,6 -2,14" fill="#1e293b" />
        <polygon
          points="0,1 14,-6 14,4 0,11"
          className={encendido ? "pantalla encendida" : "pantalla"}
          fill={encendido ? "#38bdf8" : "#64748b"}
        />
        {/* Soporte */}
        <line x1="7" y1="2" x2="7" y2="8" stroke="#334155" strokeWidth="2" />
        <ellipse cx="7" cy="8" rx="4" ry="2" fill="#475569" />
      </g>
    </g>
  );
}

function PersonajeIso({
  gx,
  gy,
  ropa,
  pelo,
  estado,
  esAriel = false,
  destino,
}: {
  gx: number;
  gy: number;
  ropa: string;
  pelo: string;
  estado?: EstadoVisible;
  esAriel?: boolean;
  destino?: { gx: number; gy: number };
}) {
  const pos = iso(destino ? destino.gx : gx, destino ? destino.gy : gy);
  const activo = estado === "Analizando" || estado === "Coordinando" || estado === "Reuniendo equipo";

  return (
    <g
      transform={`translate(${pos.x},${pos.y})`}
      className={`personaje ${activo ? "activo" : ""} ${destino ? "camina" : ""}`}
      aria-hidden
    >
      {/* Sombra suave */}
      <ellipse cx="0" cy="1" rx="10" ry="5" fill="rgba(15, 23, 42, 0.22)" />

      {/* Cuerpo y vestimenta */}
      <polygon points="-5,-12 5,-12 7,-3 -7,-3" fill={ropa} />
      <polygon points="-7,-3 7,-3 5,0 -5,0" fill="#0f172a" />

      {/* Corbata o credencial de ingeniería */}
      {esAriel ? (
        <polygon points="-1,-12 1,-12 1.5,-4 0,-2 -1.5,-4" fill="#f59e0b" />
      ) : (
        <rect x="-1" y="-9" width="2" height="4" fill="#38bdf8" />
      )}

      {/* Cabeza */}
      <ellipse cx="0" cy="-17" rx="6" ry="6" fill="#fed7aa" />

      {/* Peinado */}
      <path d="M-6,-18 C-6,-24 6,-24 6,-18 C5,-16 4,-14 4,-14 C2,-16 -2,-16 -4,-14 Z" fill={pelo} />

      {/* Casco blanco de seguridad si está en el taller/lab */}
      {estado === "Analizando" && (
        <path d="M-6,-18 C-6,-25 6,-25 6,-18 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5" />
      )}

      {/* Aro indicador en los pies para Ariel */}
      {esAriel && (
        <ellipse cx="0" cy="1" rx="13" ry="6.5" fill="none" stroke="#14b8a6" strokeWidth="1.8" opacity="0.85" />
      )}
    </g>
  );
}

export default function Escena({
  fichas,
  estados,
  orquestador,
  sinLeer,
  entregables,
  encargosEnMuro,
  seleccion,
  alSeleccionar,
  alHablarConNpc,
}: EscenaProps) {
  // Estado de Ariel (posición en la grilla y ruta de movimiento)
  const [posAriel, setPosAriel] = useState<PuntoGrilla>({ gx: 14, gy: 16.5 });
  const [rutaAriel, setRutaAriel] = useState<PuntoGrilla[]>([]);
  const [destinoClick, setDestinoClick] = useState<PuntoGrilla | null>(null);

  // Cámara interactiva (pan & zoom)
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const inicioArrastre = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Mover a Ariel cuadro por cuadro a lo largo de la ruta calculada
  useEffect(() => {
    if (rutaAriel.length === 0) return;

    const timer = setTimeout(() => {
      const siguientePaso = rutaAriel[0];
      setPosAriel(siguientePaso);
      setRutaAriel((prev) => prev.slice(1));
      reproducirPaso();
    }, 120);

    return () => clearTimeout(timer);
  }, [rutaAriel]);

  // Manejar clic en una baldosa para que Ariel camine
  const caminarHacia = useCallback(
    (gx: number, gy: number) => {
      setDestinoClick({ gx, gy });
      const ruta = calcularRuta(posAriel, { gx, gy });
      if (ruta.length > 0) {
        setRutaAriel(ruta);
      }
    },
    [posAriel],
  );

  // Centrar cámara en una zona o personaje
  const centrarEn = (gx: number, gy: number) => {
    const p = iso(gx, gy);
    setOffset({ x: -p.x * zoom + 350, y: -p.y * zoom + 250 });
  };

  // Controles de Pan (arrastrar)
  const iniciarArrastre = (e: MouseEvent | TouchEvent) => {
    setArrastrando(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    inicioArrastre.current = { x: clientX - offset.x, y: clientY - offset.y };
  };

  const moverArrastre = (e: MouseEvent | TouchEvent) => {
    if (!arrastrando) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setOffset({ x: clientX - inicioArrastre.current.x, y: clientY - inicioArrastre.current.y });
  };

  const soltarArrastre = () => setArrastrando(false);

  const cambiarZoom = (delta: number) => {
    setZoom((z) => Math.max(0.6, Math.min(1.8, Number((z + delta).toFixed(2)))));
  };

  // Teclado para accesibilidad y movimiento de Ariel (WASD o Flechas)
  const alTecla = (e: KeyboardEvent<HTMLDivElement>) => {
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") dy = -1;
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") dy = 1;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dx = -1;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dx = 1;

    if (dx !== 0 || dy !== 0) {
      e.preventDefault();
      caminarHacia(posAriel.gx + dx, posAriel.gy + dy);
    }
  };

  // Dimensiones del viewBox del campus ampliado
  const minX = -450;
  const minY = -200;
  const anchoVista = 900;
  const altoVista = 680;

  // Renderizar baldosas del suelo del campus (28 x 20)
  const baldosas = useMemo(() => {
    const arr: React.JSX.Element[] = [];
    for (let gy = 0; gy < FONDO_CAMPUS; gy++) {
      for (let gx = 0; gx < ANCHO_CAMPUS; gx++) {
        // Asignar textura o tonalidad según la zona del campus
        let colorSuelo = (gx + gy) % 2 === 0 ? "#f8fafc" : "#f1f5f9";
        let bordeSuelo = "#e2e8f0";

        // Despacho de Ariel (tarima cálida de madera de roble)
        if (gx >= 10 && gx <= 18 && gy >= 14 && gy <= 19) {
          colorSuelo = (gx + gy) % 2 === 0 ? "#f4ede1" : "#ebe1d2";
          bordeSuelo = "#d8ccb5";
        }
        // Laboratorio de Calidad de Energía (piso antiestático azul técnico)
        else if (gx >= 2 && gx <= 9 && gy >= 2 && gy <= 9) {
          colorSuelo = (gx + gy) % 2 === 0 ? "#f0f9ff" : "#e0f2fe";
          bordeSuelo = "#bae6fd";
        }
        // Taller de Subestaciones (piso industrial ámbar / concreto pulido)
        else if (gx >= 2 && gx <= 9 && gy >= 12 && gy <= 19) {
          colorSuelo = (gx + gy) % 2 === 0 ? "#fefce8" : "#fef9c3";
          bordeSuelo = "#fef08a";
        }
        // Ala de Documentación (piso pulcro perla / lila suave)
        else if (gx >= 19 && gx <= 26 && gy >= 2 && gy <= 9) {
          colorSuelo = (gx + gy) % 2 === 0 ? "#faf5ff" : "#f3e8ff";
          bordeSuelo = "#e9d5ff";
        }
        // Cafetería Lounge (baldosas de café y jade)
        else if (gx >= 19 && gx <= 26 && gy >= 14 && gy <= 19) {
          colorSuelo = (gx + gy) % 2 === 0 ? "#f0fdf4" : "#dcfce7";
          bordeSuelo = "#bbf7d0";
        }

        const p = iso(gx, gy);
        const p1 = iso(gx + 1, gy);
        const p2 = iso(gx + 1, gy + 1);
        const p3 = iso(gx, gy + 1);

        const esDestino = destinoClick && destinoClick.gx === gx && destinoClick.gy === gy;

        arr.push(
          <polygon
            key={`b_${gx}_${gy}`}
            points={pts(p, p1, p2, p3)}
            fill={colorSuelo}
            stroke={esDestino ? "#14b8a6" : bordeSuelo}
            strokeWidth={esDestino ? 2 : 0.6}
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              caminarHacia(gx, gy);
            }}
          />,
        );
      }
    }
    return arr;
  }, [caminarHacia, destinoClick]);

  return (
    <div
      className="escena-contenedor"
      tabIndex={0}
      onKeyDown={alTecla}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", outline: "none" }}
    >
      {/* Controles de cámara flotantes para tablet / gaming */}
      <div className="controles-camara" aria-label="Controles de navegación">
        <button onClick={() => cambiarZoom(0.15)} title="Acercar zoom">
          ➕
        </button>
        <button onClick={() => cambiarZoom(-0.15)} title="Alejar zoom">
          ➖
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          title="Restablecer vista"
        >
          🎯
        </button>
        <button onClick={() => centrarEn(posAriel.gx, posAriel.gy)} title="Centrar en Ariel">
          👤
        </button>
      </div>

      {/* Selector rápido de zonas del campus */}
      <div className="selector-zonas-campus">
        {ZONAS_CAMPUS.map((z) => (
          <button
            key={z.id}
            className="boton-zona-chip"
            style={{ borderLeftColor: z.color }}
            onClick={() => {
              centrarEn(z.centro.gx, z.centro.gy);
              alSeleccionar({ tipo: "zona", id: z.id });
            }}
          >
            <span>{z.icono}</span>
            <span className="zona-nombre-corto">{z.nombre.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="escena-svg-gaming"
        viewBox={`${minX} ${minY} ${anchoVista} ${altoVista}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={iniciarArrastre}
        onMouseMove={moverArrastre}
        onMouseUp={soltarArrastre}
        onTouchStart={iniciarArrastre}
        onTouchMove={moverArrastre}
        onTouchEnd={soltarArrastre}
        style={{
          width: "100%",
          height: "100%",
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          cursor: arrastrando ? "grabbing" : "grab",
        }}
        role="img"
        aria-label="Campus Isométrico de Ingeniería"
      >
        {/* Losa y zócalo exterior del campus */}
        <polygon
          points={pts(iso(0, FONDO_CAMPUS), iso(ANCHO_CAMPUS, FONDO_CAMPUS), iso(ANCHO_CAMPUS, FONDO_CAMPUS, -16), iso(0, FONDO_CAMPUS, -16))}
          fill="#cbd5e1"
        />
        <polygon
          points={pts(iso(ANCHO_CAMPUS, 0), iso(ANCHO_CAMPUS, FONDO_CAMPUS), iso(ANCHO_CAMPUS, FONDO_CAMPUS, -16), iso(ANCHO_CAMPUS, 0, -16))}
          fill="#94a3b8"
        />

        {/* Rejilla de baldosas transitables */}
        <g id="suelo-campus">{baldosas}</g>

        {/* Paredes del fondo del campus con ventanales hacia la ciudad */}
        <polygon
          points={pts(iso(0, 0), iso(0, FONDO_CAMPUS), iso(0, FONDO_CAMPUS, 120), iso(0, 0, 120))}
          fill="#f1f5f9"
          stroke="#e2e8f0"
        />
        <polygon
          points={pts(iso(0, 0), iso(ANCHO_CAMPUS, 0), iso(ANCHO_CAMPUS, 0, 120), iso(0, 0, 120))}
          fill="#f8fafc"
          stroke="#e2e8f0"
        />

        {/* Ventanales de cristal fotovoltaico */}
        {[3, 9, 15, 21].map((g) => (
          <polygon
            key={`vent_${g}`}
            points={pts(iso(g, 0, 35), iso(g + 3.8, 0, 35), iso(g + 3.8, 0, 105), iso(g, 0, 105))}
            fill="#dbeafe"
            opacity={0.85}
            stroke="#93c5fd"
            strokeWidth="0.8"
          />
        ))}

        {/* Muro de encargos técnicos (pared este) */}
        <g
          style={{ cursor: "pointer" }}
          onClick={() => alSeleccionar({ tipo: "muro" })}
        >
          <polygon
            points={pts(iso(11, 0, 35), iso(17, 0, 35), iso(17, 0, 105), iso(11, 0, 105))}
            fill="#fef3c7"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <text
            x={iso(14, 0, 95).x}
            y={iso(14, 0, 95).y}
            textAnchor="middle"
            fill="#78350f"
            fontSize="9"
            fontWeight="bold"
          >
            MURO DE EXPEDIENTES ({encargosEnMuro})
          </text>
        </g>

        {/* ==================================================== */}
        {/* ZONA 1: DESPACHO DE ARIEL Y MESA DE REVISIÓN         */}
        {/* ==================================================== */}
        <g id="zona-despacho-ariel">
          {/* Tarima ejecutiva */}
          <ellipse
            cx={iso(14, 16.5).x}
            cy={iso(14, 16.5).y}
            rx="120"
            ry="60"
            fill="rgba(20, 184, 166, 0.08)"
          />

          {/* Mesa Ejecutiva de Ariel */}
          <g
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar({ tipo: "ariel" });
              alHablarConNpc?.("ariel", "Ariel");
            }}
          >
            <CajaIso gx={13} gy={16} w={2.2} d={1.1} h={22} arriba="#d8ccb5" izq="#bfae8e" der="#a79472" />
            {/* Holograma de plano eléctrico flotante */}
            <ellipse
              cx={iso(14.1, 16.5, 34).x}
              cy={iso(14.1, 16.5, 34).y}
              rx="16"
              ry="8"
              fill="rgba(20, 184, 166, 0.4)"
              className="pantalla encendida"
            />
            <line
              x1={iso(14.1, 16.5, 23).x}
              y1={iso(14.1, 16.5, 23).y}
              x2={iso(14.1, 16.5, 34).x}
              y2={iso(14.1, 16.5, 34).y}
              stroke="#14b8a6"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          </g>

          {/* Mesa de Revisión y Firma oficial */}
          <g
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar({ tipo: "revision" });
            }}
          >
            <CajaIso gx={16.5} gy={15} w={1.8} d={1} h={20} arriba="#fef3c7" izq="#fde68a" der="#fcd34d" />
            {/* Sello de ingeniería y carpetas */}
            <circle cx={iso(17.4, 15.5, 22).x} cy={iso(17.4, 15.5, 22).y} r="5" fill="#dc2626" />
            {entregables > 0 && (
              <g transform={`translate(${iso(17.4, 15.5, 30).x},${iso(17.4, 15.5, 30).y})`}>
                <rect x="-12" y="-8" width="24" height="16" rx="4" fill="#10b981" />
                <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                  {entregables} LISTO
                </text>
              </g>
            )}
          </g>

          {/* Puesto del Director Técnico */}
          <g
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar({ tipo: "director" });
              alHablarConNpc?.("director", "Director Técnico");
            }}
          >
            <EscritorioIso gx={10.5} gy={16} encendido={estados.carpetasEnRevision > 0} material={MADERA_OSCURA} />
            <PersonajeIso
              gx={11.3}
              gy={17.2}
              ropa="#0b1c30"
              pelo="#111827"
              estado={estados.carpetasEnRevision > 0 ? "Esperando a Ariel" : "En reposo"}
            />
          </g>
        </g>

        {/* ==================================================== */}
        {/* ZONA 2: MANDO CENTRAL DEL ORQUESTADOR                */}
        {/* ==================================================== */}
        <g
          id="zona-orquestador"
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            alSeleccionar({ tipo: "orquestador" });
            alHablarConNpc?.("orquestador", "Orquestador");
          }}
        >
          {/* Servidor cuántico con LEDs de latido */}
          <CajaIso gx={12.5} gy={8} w={1.2} d={0.8} h={46} arriba="#1e293b" izq="#0f172a" der="#334155" />
          <circle cx={iso(13.1, 8.4, 38).x} cy={iso(13.1, 8.4, 38).y} r="3" fill="#10b981" className="nucleo activo" />
          <circle cx={iso(13.1, 8.4, 30).x} cy={iso(13.1, 8.4, 30).y} r="2.5" fill="#38bdf8" />
          <circle cx={iso(13.1, 8.4, 22).x} cy={iso(13.1, 8.4, 22).y} r="2.5" fill="#f59e0b" />

          {/* Gran Mesa de Coordinación */}
          <CajaIso gx={13.8} gy={8.8} w={2.4} d={1.4} h={24} arriba="#0284c7" izq="#0369a1" der="#075985" />

          {/* Avatar del Orquestador */}
          <PersonajeIso gx={15} gy={10} ropa="#0284c7" pelo="#0369a1" estado={orquestador.estado} />

          {/* Globo de diálogo o sobre del buzón */}
          {orquestador.dice && (
            <g transform={`translate(${iso(15, 8.5, 45).x},${iso(15, 8.5, 45).y})`} className="dialogo">
              <rect x="-60" y="-20" width="120" height="20" rx="8" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
              <text x="0" y="-6" textAnchor="middle" fill="#0f172a" fontSize="8.5" fontWeight="bold">
                {orquestador.dice.slice(0, 24)}...
              </text>
            </g>
          )}

          {/* Oficina de RR. HH. al costado */}
          <g
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar({ tipo: "rrhh" });
              alHablarConNpc?.("rrhh", "RR. HH.");
            }}
          >
            <CajaIso gx={9} gy={9} w={1.6} d={0.9} h={20} {...MADERA_NOBLE} />
            <PersonajeIso gx={9.8} gy={10.2} ropa="#be123c" pelo="#7c2d12" estado={estados.rrhh} />
          </g>
        </g>

        {/* ==================================================== */}
        {/* ZONA 3: LABORATORIO DE CALIDAD DE ENERGÍA (PQ)      */}
        {/* ==================================================== */}
        <g id="zona-lab-pq">
          {/* Transformador seco experimental a escala */}
          <CajaIso gx={2.5} gy={3} w={1.8} d={1.8} h={36} arriba="#475569" izq="#334155" der="#1e293b" />
          {/* Bobinas de cobre visibles */}
          <ellipse cx={iso(3.4, 3.9, 38).x} cy={iso(3.4, 3.9, 38).y} rx="9" ry="4.5" fill="#b45309" />
          <text x={iso(3.4, 3.9, 44).x} y={iso(3.4, 3.9, 44).y} textAnchor="middle" fill="#fef3c7" fontSize="7" fontWeight="bold">
            1500 kVA (K=14)
          </text>

          {/* Osciloscopio con forma de onda sinusoidal */}
          <CajaIso gx={4.8} gy={3} w={2} d={1} h={22} {...ACERO_LAB} />
          <rect
            x={iso(5.8, 3.5, 24).x - 14}
            y={iso(5.8, 3.5, 24).y - 8}
            width="28"
            height="14"
            fill="#052e16"
            stroke="#22c55e"
            strokeWidth="0.8"
          />
          <path
            d={`M${iso(5.8, 3.5, 24).x - 12},${iso(5.8, 3.5, 24).y} Q${iso(5.8, 3.5, 24).x - 6},${iso(5.8, 3.5, 24).y - 6} ${iso(5.8, 3.5, 24).x},${iso(5.8, 3.5, 24).y} T${iso(5.8, 3.5, 24).x + 12},${iso(5.8, 3.5, 24).y}`}
            fill="none"
            stroke="#4ade80"
            strokeWidth="1.2"
          />

          {/* Puesto del Extractor de Datos */}
          <g
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar({ tipo: "agente", id: "extractor-datos" });
              alHablarConNpc?.("extractor-datos", "Extractor de datos");
            }}
          >
            <EscritorioIso gx={4.5} gy={5.5} encendido={estados.agentes["extractor-datos"] === "Analizando"} />
            <PersonajeIso
              gx={5.3}
              gy={6.8}
              ropa="#0284c7"
              pelo="#0369a1"
              estado={estados.agentes["extractor-datos"] ?? "En reposo"}
            />
          </g>

          {/* Puesto del Subagente de Armónicos (Ing. Marcos) */}
          <g
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar({ tipo: "agente", id: "sub-armonicos" });
              alHablarConNpc?.("sub-armonicos", "Ing. Marcos Díaz");
            }}
          >
            <EscritorioIso gx={7} gy={7} encendido={estados.agentes["sub-armonicos"] === "Analizando"} />
            <PersonajeIso
              gx={7.8}
              gy={8.2}
              ropa="#1e3a8a"
              pelo="#172554"
              estado={estados.agentes["sub-armonicos"] ?? "En reposo"}
            />
          </g>
        </g>

        {/* ==================================================== */}
        {/* ZONA 4: TALLER DE SUBESTACIONES Y PUESTA A TIERRA    */}
        {/* ==================================================== */}
        <g id="zona-subestacion">
          {/* Maqueta de suelo y electrodos Wenner */}
          <CajaIso gx={2.5} gy={13} w={2} d={2} h={12} arriba="#d97706" izq="#b45309" der="#78350f" />
          <line
            x1={iso(3.2, 13.5, 14).x}
            y1={iso(3.2, 13.5, 14).y}
            x2={iso(4.2, 14.5, 14).x}
            y2={iso(4.2, 14.5, 14).y}
            stroke="#fbbf24"
            strokeWidth="2"
          />

          {/* Puesto del Investigador Normativo */}
          <g
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar({ tipo: "agente", id: "investigador-normativo" });
              alHablarConNpc?.("investigador-normativo", "Investigador normativo");
            }}
          >
            <EscritorioIso gx={4.5} gy={14} encendido={estados.agentes["investigador-normativo"] === "Analizando"} />
            <PersonajeIso
              gx={5.3}
              gy={15.2}
              ropa="#059669"
              pelo="#064e3b"
              estado={estados.agentes["investigador-normativo"] ?? "En reposo"}
            />
          </g>

          {/* Puesto del Subagente de Mallas (Ing. Elena) */}
          <g
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar({ tipo: "agente", id: "sub-puesta-tierra" });
              alHablarConNpc?.("sub-puesta-tierra", "Ing. Elena Ramos");
            }}
          >
            <EscritorioIso gx={7} gy={15} encendido={estados.agentes["sub-puesta-tierra"] === "Analizando"} />
            <PersonajeIso
              gx={7.8}
              gy={16.2}
              ropa="#065f46"
              pelo="#78350f"
              estado={estados.agentes["sub-puesta-tierra"] ?? "En reposo"}
            />
          </g>
        </g>

        {/* ==================================================== */}
        {/* ZONA 5: ALA DE REDACCIÓN Y DOCUMENTACIÓN TÉCNICA     */}
        {/* ==================================================== */}
        <g id="zona-redaccion">
          {/* Estantería de normas y manuales técnicos */}
          <CajaIso gx={20.5} gy={1.5} w={3.5} d={0.7} h={52} arriba="#92400e" izq="#78350f" der="#451a03" />

          {/* Puesto de Redactor Técnico */}
          <g
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar({ tipo: "agente", id: "redactor-tecnico" });
              alHablarConNpc?.("redactor-tecnico", "Redactor técnico");
            }}
          >
            <EscritorioIso gx={20.5} gy={4.5} encendido={estados.agentes["redactor-tecnico"] === "Analizando"} />
            <PersonajeIso
              gx={21.3}
              gy={5.7}
              ropa="#7c3aed"
              pelo="#4c1d95"
              estado={estados.agentes["redactor-tecnico"] ?? "En reposo"}
            />
          </g>

          {/* Puesto de Integrador de Sistemas */}
          <g
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              alSeleccionar({ tipo: "agente", id: "integrador" });
              alHablarConNpc?.("integrador", "Integrador");
            }}
          >
            <EscritorioIso gx={23} gy={6.5} encendido={estados.agentes["integrador"] === "Analizando"} />
            <PersonajeIso
              gx={23.8}
              gy={7.7}
              ropa="#9333ea"
              pelo="#581c87"
              estado={estados.agentes["integrador"] ?? "En reposo"}
            />
          </g>
        </g>

        {/* ==================================================== */}
        {/* ZONA 6: CÁMARA DE CONVOCATORIA DE SUBAGENTES         */}
        {/* ==================================================== */}
        <g
          id="zona-convocatoria"
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            alSeleccionar({ tipo: "zona", id: "zona_convocatoria" });
          }}
        >
          {/* Plataforma holográfica hexagonal */}
          <ellipse cx={iso(22, 12).x} cy={iso(22, 12).y} rx="34" ry="17" fill="rgba(236, 72, 153, 0.15)" stroke="#ec4899" strokeWidth="1.5" />
          <ellipse cx={iso(22, 12, 10).x} cy={iso(22, 12, 10).y} rx="24" ry="12" fill="none" stroke="#f472b6" strokeWidth="1" strokeDasharray="4 2" />
          <text x={iso(22, 12, 18).x} y={iso(22, 12, 18).y} textAnchor="middle" fill="#db2777" fontSize="8" fontWeight="bold">
            PORTAL SUBAGENTES
          </text>
        </g>

        {/* ==================================================== */}
        {/* ZONA 7: LOUNGE Y CAFETERÍA DE INGENIEROS             */}
        {/* ==================================================== */}
        <g id="zona-lounge">
          {/* Sillón de ingenieros */}
          <CajaIso gx={20} gy={15.5} w={2.5} d={1.1} h={16} {...SOFA_CUERO} />
          {/* Máquina de café con vapor animado */}
          <CajaIso gx={24} gy={15} w={1} d={1} h={34} arriba="#e2e8f0" izq="#cbd5e1" der="#64748b" />
          <circle cx={iso(24.5, 15.5, 38).x} cy={iso(24.5, 15.5, 38).y} r="2" fill="#ef4444" />
          {/* Máquina Arcade retro 'Volt Defender' */}
          <CajaIso gx={24} gy={17.5} w={1.2} d={1.1} h={42} arriba="#3b82f6" izq="#1d4ed8" der="#172554" />
          <polygon
            points={pts(iso(24.1, 18.2, 28), iso(25.1, 18.2, 28), iso(25.1, 18.2, 38), iso(24.1, 18.2, 38))}
            fill="#0f172a"
          />
          <text x={iso(24.6, 18.2, 34).x} y={iso(24.6, 18.2, 34).y} textAnchor="middle" fill="#22c55e" fontSize="6" fontWeight="bold">
            VOLT
          </text>
        </g>

        {/* ==================================================== */}
        {/* AVATAR JUGABLE DE ARIEL (INGENIERO LÍDER)            */}
        {/* ==================================================== */}
        <g
          id="avatar-ariel"
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            alSeleccionar({ tipo: "ariel" });
            alHablarConNpc?.("ariel", "Ariel");
          }}
        >
          <PersonajeIso
            gx={posAriel.gx}
            gy={posAriel.gy}
            ropa="#0f766e"
            pelo="#1c1917"
            esAriel={true}
          />
          {/* Indicador de nombre sobre Ariel */}
          <g transform={`translate(${iso(posAriel.gx, posAriel.gy, 32).x},${iso(posAriel.gx, posAriel.gy, 32).y})`}>
            <rect x="-18" y="-12" width="36" height="12" rx="4" fill="#0f766e" />
            <text x="0" y="-3" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="bold">
              ARIEL
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
