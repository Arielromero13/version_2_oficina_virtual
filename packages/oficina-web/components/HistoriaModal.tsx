"use client";

import { useState } from "react";
import { reproducirChime } from "@/lib/audio";
import { MISIONES_HISTORIA, type MisionHistoria } from "@/lib/historia";

interface HistoriaModalProps {
  alActivarMision: (mision: MisionHistoria) => void;
  alCerrar: () => void;
}

export default function HistoriaModal({ alActivarMision, alCerrar }: HistoriaModalProps) {
  const [misionSeleccionada, setMisionSeleccionada] = useState<MisionHistoria>(MISIONES_HISTORIA[0]);

  const activar = (m: MisionHistoria) => {
    reproducirChime("exito");
    alActivarMision(m);
    alCerrar();
  };

  return (
    <div className="modal-overlay" onClick={alCerrar}>
      <div className="modal-caja modal-historia" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div>
            <span className="etiqueta">Expedientes de Ingeniería Eléctrica</span>
            <h2>Modo Historia: Despacho de Casos Reales</h2>
            <p className="sub-encargo">
              Casos reales de ingeniería con mediciones de campo, problemas de armónicos, puesta a tierra e integración solar.
            </p>
          </div>
          <button className="dialogo-cerrar" onClick={alCerrar} aria-label="Cerrar ventana">
            ✕
          </button>
        </div>

        <div className="historia-layout">
          {/* Lista de capítulos */}
          <div className="historia-capitulos">
            {MISIONES_HISTORIA.map((m) => {
              const activa = m.id === misionSeleccionada.id;
              return (
                <div
                  key={m.id}
                  className={`tarjeta-capitulo ${activa ? "activo" : ""}`}
                  onClick={() => setMisionSeleccionada(m)}
                >
                  <div className="capitulo-meta">
                    <span className="capitulo-badge">Capítulo {m.capitulo}</span>
                    <span className="capitulo-xp">+{m.xp} XP Estudio</span>
                  </div>
                  <h4 className="capitulo-titulo">{m.titulo}</h4>
                  <span className="capitulo-cliente">{m.cliente}</span>
                </div>
              );
            })}
          </div>

          {/* Detalle del caso seleccionado */}
          <div className="historia-detalle">
            <div className="detalle-top">
              <div>
                <span className="chip estado-en_curso">{misionSeleccionada.tipo.replace("_", " ").toUpperCase()}</span>
                <h3 className="detalle-titulo">{misionSeleccionada.titulo}</h3>
                <p className="detalle-sub">{misionSeleccionada.subtitulo}</p>
              </div>
              <button className="boton-primario boton-iniciar-mision" onClick={() => activar(misionSeleccionada)}>
                ⚡ Iniciar Encargo en la Oficina
              </button>
            </div>

            <div className="detalle-seccion">
              <h4>📋 Descripción del Caso Técnico</h4>
              <p>{misionSeleccionada.descripcion}</p>
            </div>

            <div className="detalle-seccion">
              <h4>📊 Datos Técnicos y Mediciones de Campo</h4>
              <div className="datos-grid">
                <div>
                  <strong>Tensión:</strong> {misionSeleccionada.datosTecnicos.tension}
                </div>
                <div>
                  <strong>Frecuencia:</strong> {misionSeleccionada.datosTecnicos.frecuencia}
                </div>
                <div>
                  <strong>Potencia:</strong> {misionSeleccionada.datosTecnicos.potencia}
                </div>
                <div>
                  <strong>Síntoma Principal:</strong> {misionSeleccionada.datosTecnicos.sintoma}
                </div>
              </div>
              <ul className="lista-mediciones">
                {misionSeleccionada.datosTecnicos.valoresMedidos.map((v, i) => (
                  <li key={i}>🔹 {v}</li>
                ))}
              </ul>
            </div>

            <div className="detalle-seccion">
              <h4>⚖️ Normativa de Referencia</h4>
              <div className="chips-normas">
                {misionSeleccionada.normasAplicables.map((n, i) => (
                  <span key={i} className="chip-norma">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div className="detalle-seccion">
              <h4>🎯 Entregable y Criterio de Aprobación de Ariel</h4>
              <p>
                <strong>Entregable:</strong> {misionSeleccionada.entregable}
              </p>
              <p className="criterio-box">
                <strong>Criterio de Firma en Mesa de Revisión:</strong> {misionSeleccionada.criterioAprobacion}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
