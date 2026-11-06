"use client";

import { useState } from "react";
import { reproducirChime } from "@/lib/audio";
import { SUBAGENTES_CATALOGO, type SubagenteConvocable } from "@/lib/historia";
import type { FichaVista } from "@/lib/escena";

interface ConvocatoriaModalProps {
  fichasActuales: FichaVista[];
  alConvocarSubagente: (ficha: FichaVista) => void;
  alCerrar: () => void;
}

export default function ConvocatoriaModal({ fichasActuales, alConvocarSubagente, alCerrar }: ConvocatoriaModalProps) {
  const [personalizado, setPersonalizado] = useState(false);
  const [nombre, setNombre] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [proveedor, setProveedor] = useState("qwen");
  const [modelo, setModelo] = useState("qwen-plus");

  const idsPresentes = new Set(fichasActuales.map((f) => f.id));

  const convocarPredefinido = (s: SubagenteConvocable) => {
    reproducirChime("convocatoria");
    const nuevaFicha: FichaVista = {
      id: s.id,
      nombre: s.nombre,
      especialidad: s.especialidad,
      proveedor: s.proveedor,
      modelo: s.modelo,
      configurado: true,
      respaldo_nativo: true,
    };
    alConvocarSubagente(nuevaFicha);
    alCerrar();
  };

  const convocarCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !especialidad.trim()) return;

    reproducirChime("convocatoria");
    const id = `sub-${nombre.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString().slice(-4)}`;
    const nuevaFicha: FichaVista = {
      id,
      nombre: nombre.trim(),
      especialidad: especialidad.trim(),
      proveedor,
      modelo,
      configurado: true,
      respaldo_nativo: true,
    };
    alConvocarSubagente(nuevaFicha);
    alCerrar();
  };

  return (
    <div className="modal-overlay" onClick={alCerrar}>
      <div className="modal-caja modal-convocatoria" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cabecera">
          <div>
            <span className="etiqueta">Portal del Orquestador</span>
            <h2>Convocar Subagente Especialista</h2>
            <p className="sub-encargo">
              Invoca ingenieros especialistas a la oficina. Cada subagente se materializa con su estación de trabajo, equipo y modelo asignado.
            </p>
          </div>
          <button className="dialogo-cerrar" onClick={alCerrar} aria-label="Cerrar ventana">
            ✕
          </button>
        </div>

        <div className="convocatoria-tabs">
          <button className={`tab-boton ${!personalizado ? "activo" : ""}`} onClick={() => setPersonalizado(false)}>
            Catálogo de Especialistas ({SUBAGENTES_CATALOGO.length})
          </button>
          <button className={`tab-boton ${personalizado ? "activo" : ""}`} onClick={() => setPersonalizado(true)}>
            + Diseñar Subagente a Medida
          </button>
        </div>

        {!personalizado ? (
          <div className="convocatoria-grid">
            {SUBAGENTES_CATALOGO.map((s) => {
              const yaEnOficina = idsPresentes.has(s.id);
              return (
                <div key={s.id} className={`tarjeta-subagente ${yaEnOficina ? "ya-presente" : ""}`}>
                  <div className="subagente-top">
                    <span className="subagente-icono">{s.icono}</span>
                    <div>
                      <h4 className="subagente-nombre">{s.nombre}</h4>
                      <span className="subagente-modelo">
                        {s.proveedor} · {s.modelo}
                      </span>
                    </div>
                  </div>
                  <p className="subagente-esp">{s.especialidad}</p>
                  <p className="subagente-desc">{s.descripcion}</p>
                  <div className="subagente-accion">
                    <button
                      className="boton-primario boton-convocar"
                      disabled={yaEnOficina}
                      onClick={() => convocarPredefinido(s)}
                    >
                      {yaEnOficina ? "En la Oficina" : "⚡ Convocar al Campus"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <form className="formulario-custom" onSubmit={convocarCustom}>
            <label>
              Nombre del Ingeniero / Subagente
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Ing. Camilo Morales"
                required
              />
            </label>
            <label>
              Especialidad Técnica
              <input
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                placeholder="Ej. Análisis de Pérdidas Técnicas y Transformadores"
                required
              />
            </label>
            <div className="fila-doble">
              <label>
                Proveedor de IA
                <select value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
                  <option value="qwen">Qwen (DashScope)</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="anthropic">Anthropic (Sesión Nativa)</option>
                </select>
              </label>
              <label>
                Modelo
                <input value={modelo} onChange={(e) => setModelo(e.target.value)} required />
              </label>
            </div>
            <button className="boton-primario" type="submit">
              ✨ Materializar Subagente en la Oficina
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
