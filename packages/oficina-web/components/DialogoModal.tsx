"use client";

import { useEffect, useState } from "react";
import { reproducirVozNpc } from "@/lib/audio";
import type { MensajeDialogo } from "@/lib/historia";

interface DialogoModalProps {
  personaje: {
    id: string;
    nombre: string;
    rol?: string;
    icono?: string;
    avatarColor?: string;
    ropa?: string;
    pelo?: string;
  };
  dialogo: MensajeDialogo;
  alCerrar: () => void;
}

export default function DialogoModal({ personaje, dialogo, alCerrar }: DialogoModalProps) {
  const [textoVisible, setTextoVisible] = useState("");
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    setTextoVisible("");
    setCompletado(false);

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setTextoVisible(dialogo.texto.slice(0, idx));
      if (idx % 2 === 0) {
        reproducirVozNpc(personaje.id);
      }
      if (idx >= dialogo.texto.length) {
        clearInterval(interval);
        setCompletado(true);
      }
    }, 22);

    return () => clearInterval(interval);
  }, [dialogo.texto, personaje.id]);

  const saltarTypewriter = () => {
    if (!completado) {
      setTextoVisible(dialogo.texto);
      setCompletado(true);
    }
  };

  return (
    <div className="dialogo-overlay" onClick={alCerrar}>
      <div className="dialogo-caja" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado del Personaje */}
        <div className="dialogo-cabecera">
          <div className="dialogo-avatar" style={{ backgroundColor: personaje.avatarColor ?? "#1e293b" }}>
            <span className="dialogo-avatar-icono">{personaje.icono ?? "👷"}</span>
          </div>
          <div className="dialogo-info">
            <h3 className="dialogo-nombre">{personaje.nombre}</h3>
            <span className="dialogo-rol">{personaje.rol ?? "Especialista de Ingeniería"}</span>
          </div>
          <button className="dialogo-cerrar" onClick={alCerrar} aria-label="Cerrar diálogo">
            ✕
          </button>
        </div>

        {/* Texto con efecto máquina de escribir */}
        <div className="dialogo-cuerpo" onClick={saltarTypewriter}>
          <p className="dialogo-texto">{textoVisible}</p>
          {!completado && <span className="dialogo-cursor">▌</span>}
        </div>

        {/* Opciones de respuesta RPG */}
        {completado && (
          <div className="dialogo-opciones">
            {dialogo.opciones.map((op, i) => (
              <button
                key={i}
                className="dialogo-boton-opcion"
                onClick={() => {
                  op.accion();
                  alCerrar();
                }}
              >
                {op.etiqueta}
              </button>
            ))}
            <button className="dialogo-boton-despedida" onClick={alCerrar}>
              👋 Volver al mapa de la oficina
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
