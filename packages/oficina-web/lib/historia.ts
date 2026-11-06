/**
 * Modo Historia, misiones de ingeniería eléctrica, subagentes convocables
 * y árboles de diálogo RPG para los NPCs de la oficina.
 */

export interface MisionHistoria {
  id: string;
  capitulo: number;
  titulo: string;
  subtitulo: string;
  cliente: string;
  tipo: "calidad_energia" | "puesta_a_tierra" | "fotovoltaica";
  descripcion: string;
  sensibilidad: "interno" | "externo";
  normasAplicables: string[];
  datosTecnicos: {
    tension: string;
    frecuencia: string;
    potencia: string;
    sintoma: string;
    valoresMedidos: string[];
  };
  equipoRecomendado: string[];
  entregable: string;
  criterioAprobacion: string;
  xp: number;
}

export interface SubagenteConvocable {
  id: string;
  nombre: string;
  especialidad: string;
  proveedor: string;
  modelo: string;
  icono: string;
  ropa: string;
  pelo: string;
  descripcion: string;
  lineaDialogo: string;
}

export const MISIONES_HISTORIA: MisionHistoria[] = [
  {
    id: "mision_01_armonicos",
    capitulo: 1,
    titulo: "El Enigma de los Transformadores Sobrecalentados",
    subtitulo: "Distorsión armónica, Factor K y saturación de neutro en planta química",
    cliente: "Petroquímica del Caribe S.A.",
    tipo: "calidad_energia",
    sensibilidad: "externo",
    normasAplicables: ["IEEE 519-2022", "IEEE C57.110 (Factor K)", "IEC 61000-4-30"],
    descripcion:
      "Dos transformadores secos de 1500 kVA operan al 68% de carga pero los devanados superan los 135 °C. El neutro del barraje principal transporta 420 A sin carga monofásica evidente. Sospecha de armónicos triplens generados por variadores de 6 pulsos.",
    datosTecnicos: {
      tension: "480 V trifásico / 60 Hz",
      frecuencia: "60.02 Hz",
      potencia: "1500 kVA (x2)",
      sintoma: "Disparos térmicos erráticos, zumbido acústico a 180 Hz y deformación de onda",
      valoresMedidos: [
        "THD-V en barra principal: 8.4% (Límite IEEE 519: 5.0%)",
        "THD-I promedio: 31.2% con fuerte componente de 3er y 5to armónico",
        "Factor K medido de la carga: K=14.8 (Transformador clasificado solo para K=4)",
        "Corriente de neutro: 420 A rms (85% de la corriente de fase)",
      ],
    },
    equipoRecomendado: ["extractor-datos", "investigador-normativo", "redactor-tecnico", "sub-armonicos"],
    entregable: "Informe de Diagnóstico de Calidad de Energía y Dimensionamiento de Filtro Activo de Armónicos (APF)",
    criterioAprobacion: "Cálculo verificado del Factor K, contraste explícito contra tabla 1 de IEEE 519-2022 y recomendación de filtro activo de 300 A.",
    xp: 250,
  },
  {
    id: "mision_02_puesta_a_tierra",
    capitulo: 2,
    titulo: "Auditoría de Puesta a Tierra en Subestación 69 kV",
    subtitulo: "Medición Wenner de resistividad, tensiones de paso/contacto y resistividad de capas",
    cliente: "Consorcio Energético Bonao",
    tipo: "puesta_a_tierra",
    sensibilidad: "interno",
    normasAplicables: ["IEEE Std 80-2013", "IEEE Std 81-2012", "CNE Art. 250"],
    descripcion:
      "Previo a la energización de la bahía de compensación reactiva, se requiere auditar la resistencia de la malla existente de 40x50 m. Mediciones previas arrojaron valores discordantes debido a capas rocosas superficiales.",
    datosTecnicos: {
      tension: "69 kV / 12.47 kV",
      frecuencia: "60 Hz",
      potencia: "45 MVA",
      sintoma: "Resistencia medida de 6.2 Ω (excede el límite de 1.0 Ω para subestaciones de transmisión)",
      valoresMedidos: [
        "Sondeo Wenner a 1 m: 420 Ω·m | a 2 m: 580 Ω·m | a 4 m: 180 Ω·m",
        "Corriente máxima de falla a tierra (If): 8.2 kA en 69 kV",
        "Tiempo de despeje de protecciones (tf): 0.35 s",
        "Espesor de grava superficial: 10 cm (resistividad mojada 2500 Ω·m)",
      ],
    },
    equipoRecomendado: ["extractor-datos", "investigador-normativo", "integrador", "sub-puesta-tierra"],
    entregable: "Estudio de Malla de Puesta a Tierra según IEEE 80 con cálculo de tensiones de paso, contacto y propuesta de pozos profundos",
    criterioAprobacion: "Tensión de paso calculada < límite admisible con grava de 10 cm; resistencia de malla modelada <= 1.0 Ω.",
    xp: 380,
  },
  {
    id: "mision_03_fotovoltaica",
    capitulo: 3,
    titulo: "La Resonancia Solar en Parque Fotovoltaico 15 MW",
    subtitulo: "Disparo simultáneo de 8 inversores centrales por sobretensión en punto de interconexión",
    cliente: "Solaris Green Energy Corp.",
    tipo: "fotovoltaica",
    sensibilidad: "externo",
    normasAplicables: ["IEEE 1547-2018", "IEC 62116", "Grid Code Nacional"],
    descripcion:
      "A las 12:45 pm en pico de irradiación (980 W/m²), los inversores sufren desconexión en cadena por 'Grid Overvoltage Fault'. Se detecta interacción armónica entre los filtros LCL de los inversores y la capacitancia de los cables subterráneos de 34.5 kV.",
    datosTecnicos: {
      tension: "34.5 kV interconexión / 690 V generación",
      frecuencia: "60 Hz",
      potencia: "15 MWp (8 inversores de 1.85 MVA)",
      sintoma: "Picos transitorios de 39.1 kV (1.13 pu) en el bus colector en instantes de baja carga reactiva",
      valoresMedidos: [
        "Frecuencia de resonancia del sistema colector: 780 Hz (cercana al armónico 13)",
        "Capacitancia total del cable subterráneo 34.5 kV: 4.8 μF",
        "Tiempo de reconexión tras falla: 300 segundos (pérdida de 1.2 MWh por evento)",
        "Factor de potencia en bornes: 0.99 capacitivo",
      ],
    },
    equipoRecomendado: ["extractor-datos", "investigador-normativo", "sub-armonicos", "sub-protecciones"],
    entregable: "Análisis de Resonancia Paralela y Ajuste de Algoritmo Volt-VAr según IEEE 1547",
    criterioAprobacion: "Modo Q(V) configurado con curva de droop del 4% y amortiguamiento activo habilitado en los inversores.",
    xp: 500,
  },
];

export const SUBAGENTES_CATALOGO: SubagenteConvocable[] = [
  {
    id: "sub-armonicos",
    nombre: "Ing. Marcos Díaz",
    especialidad: "Especialista en Armónicos y Calidad de Energía (IEEE 519)",
    proveedor: "qwen",
    modelo: "qwen-max",
    icono: "⚡",
    ropa: "#1e3a8a",
    pelo: "#172554",
    descripcion: "Experto en descomposición espectral FFT, filtros pasivos LC, sintonizados y filtros activos shunt (APF).",
    lineaDialogo: "Listo para calcular espectros FFT. Si hay un tercer armónico inflado en el neutro, lo aislamos en minutos.",
  },
  {
    id: "sub-puesta-tierra",
    nombre: "Ing. Elena Ramos",
    especialidad: "Calculista de Mallas de Puesta a Tierra (IEEE 80 / 81)",
    proveedor: "deepseek",
    modelo: "deepseek-chat",
    icono: "🌐",
    ropa: "#065f46",
    pelo: "#78350f",
    descripcion: "Modelación de suelo multicapa por método de Wenner, tensiones de paso y toque, y diseño de electrodos profundos.",
    lineaDialogo: "Dame los sondeos Wenner. Con estratificación de suelo adecuada dejamos la resistencia bajo 1 ohm.",
  },
  {
    id: "sub-arco-electrico",
    nombre: "Ing. Rodrigo Torres",
    especialidad: "Auditor de Arco Eléctrico y Seguridad (NFPA 70E / IEEE 1584)",
    proveedor: "deepseek",
    modelo: "deepseek-reasoner",
    icono: "🔥",
    ropa: "#9a3412",
    pelo: "#1c1917",
    descripcion: "Cálculo de energía incidente (cal/cm²), distancias de aproximación límite y etiquetado de tableros de potencia.",
    lineaDialogo: "La seguridad es innegociable. Ningún técnico toca un barraje sin conocer la energía incidente en cal/cm².",
  },
  {
    id: "sub-flujo-potencia",
    nombre: "Ing. Valeria Mendoza",
    especialidad: "Modeladora de Flujo de Carga y Cortocircuito (ANSI / IEC)",
    proveedor: "qwen",
    modelo: "qwen-plus",
    icono: "📊",
    ropa: "#701a75",
    pelo: "#3b0764",
    descripcion: "Estudios de estabilidad en estado estacionario, regulación de tensión y verificación de capacidad interruptiva.",
    lineaDialogo: "Matriz admitancia armada. Simulamos contingencias N-1 y comprobamos caídas de tensión en terminales.",
  },
  {
    id: "sub-protecciones",
    nombre: "Ing. Samuel Castro",
    especialidad: "Coordinación de Protecciones y Curvas Tiempo-Corriente",
    proveedor: "deepseek",
    modelo: "deepseek-chat",
    icono: "🛡️",
    ropa: "#312e81",
    pelo: "#18181b",
    descripcion: "Parametrización de relés numéricos 50/51, 51N, 87T, 21 y curvas ANSI/IEEE muy inversas con margen de 300 ms.",
    lineaDialogo: "Alineando curvas tiempo-corriente. Aseguro selectividad total para que una falla en derivación no bote el alimentador.",
  },
];

export interface MensajeDialogo {
  texto: string;
  opciones: {
    etiqueta: string;
    accion: () => void;
  }[];
}

export function obtenerDialogoNpc(
  npcId: string,
  nombre: string,
  estadoVisible: string,
  encargoActual: string | null,
  alAsignar?: () => void,
  alVerFicha?: () => void,
  alConvocar?: () => void,
): MensajeDialogo {
  if (npcId === "orquestador") {
    return {
      texto: encargoActual
        ? `Ariel, estamos al frente del encargo "${encargoActual}". Mi estado actual es ${estadoVisible}. ¿Qué instrucción estratégica tienes para el equipo?`
        : `Saludos, Ingeniero Ariel. La oficina está lista y los instrumentos calibrados. Podemos activar una misión del Modo Historia o despachar un encargo técnico.`,
      opciones: [
        {
          etiqueta: "📋 Ver plan y delegar tareas",
          accion: () => alAsignar?.(),
        },
        {
          etiqueta: "✨ Convocar nuevo subagente especialista",
          accion: () => alConvocar?.(),
        },
        {
          etiqueta: "⚡ ¿Cuál es la estrategia de hoy?",
          accion: () => alVerFicha?.(),
        },
      ],
    };
  }

  if (npcId === "director") {
    return {
      texto: `Buen día, Ariel. Como Director Técnico, superviso que todo cálculo cumpla rigor de ingeniería y que ninguna cifra salga sin respaldo normativo verificable.`,
      opciones: [
        {
          etiqueta: "🏛️ Consultar políticas de la oficina",
          accion: () => alVerFicha?.(),
        },
        {
          etiqueta: "📁 Ver expedientes en Mesa de Revisión",
          accion: () => alAsignar?.(),
        },
      ],
    };
  }

  if (npcId === "rrhh") {
    return {
      texto: `Bienvenido a RR. HH. Aquí gestionamos el catálogo de agentes, evaluamos su desempeño con tokens reales y registramos aprendizajes en la biblioteca técnica.`,
      opciones: [
        {
          etiqueta: "👥 Explorar catálogo de fichas",
          accion: () => alVerFicha?.(),
        },
        {
          etiqueta: "🌟 Convocar un subagente al equipo",
          accion: () => alConvocar?.(),
        },
      ],
    };
  }

  // Agentes específicos
  if (npcId === "extractor-datos") {
    return {
      texto: `Extractor de datos en línea (${estadoVisible}). Procesando registros oscilográficos, tablas de armónicos y mediciones de campo. No calculo a ojo; parseo con rigor.`,
      opciones: [
        {
          etiqueta: "📈 Ver estado de datos extraídos",
          accion: () => alVerFicha?.(),
        },
        {
          etiqueta: "🛠️ Asignar nuevo lote de mediciones",
          accion: () => alAsignar?.(),
        },
      ],
    };
  }

  if (npcId === "investigador-normativo") {
    return {
      texto: `Investigador normativo listo (${estadoVisible}). Tengo cargados los códigos IEEE 519, IEEE 80, NFPA 70E y el Código Eléctrico Nacional. Cada cita exige norma, año y cláusula.`,
      opciones: [
        {
          etiqueta: "📚 Revisar cláusulas vigentes",
          accion: () => alVerFicha?.(),
        },
        {
          etiqueta: "⚖️ Auditar cumplimiento técnico",
          accion: () => alAsignar?.(),
        },
      ],
    };
  }

  if (npcId === "redactor-tecnico") {
    return {
      texto: `Redactor técnico a la orden (${estadoVisible}). Estructuro informes ejecutivos con lenguaje de ingeniería, unidades claras en SI y formato apto para presentación oficial.`,
      opciones: [
        {
          etiqueta: "📝 Ver borrador de informe",
          accion: () => alVerFicha?.(),
        },
        {
          etiqueta: "✍️ Redactar conclusiones y recomendaciones",
          accion: () => alAsignar?.(),
        },
      ],
    };
  }

  if (npcId === "integrador") {
    return {
      texto: `Integrador de sistemas verificando consistencia (${estadoVisible}). Mi función es asegurar que las corrientes de neutro, las potencias y los límites concuerden en todas las secciones.`,
      opciones: [
        {
          etiqueta: "🔍 Auditar consistencia numérica",
          accion: () => alVerFicha?.(),
        },
      ],
    };
  }

  // Subagente convocado
  return {
    texto: `Ingeniero ${nombre} en posición (${estadoVisible}). Listo para aportar en la especialidad asignada y colaborar con el Orquestador.`,
    opciones: [
      {
        etiqueta: "💼 Ver especialidad y modelo",
        accion: () => alVerFicha?.(),
      },
      {
        etiqueta: "⚡ Asignar tarea técnica",
        accion: () => alAsignar?.(),
      },
    ],
  };
}
