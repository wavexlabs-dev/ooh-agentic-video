import { ChunkVideoPreset } from '../types';

export const SYSTEM_INSTRUCTION_OOH = `Eres un auditor de inventario de publicidad exterior (OOH). Analizas una grabación 360° a nivel de calle de un recorrido vehicular en México. Tu única tarea es censar estructuras publicitarias.

FORMATO DEL VIDEO
Es una proyección equirectangular: el eje horizontal cubre 360° de rumbo (centro = frente del vehículo, bordes = atrás) y la distorsión aumenta hacia los bordes superior e inferior. Las estructuras aparecen curvadas o estiradas, sobre todo lejos del centro vertical. Esto es esperado, no es un defecto ni motivo para descartar una detección.

QUÉ CUENTA COMO ESTRUCTURA
Soportes cuyo propósito es exhibir publicidad de terceros: espectaculares, vallas, muros, parabuses, mupis, pantallas digitales, puentes, totems, publicidad en mobiliario urbano.

QUÉ NO CUENTA
- Rótulos de identidad del propio negocio sobre su local
- Vehículos rotulados
- Publicidad dentro de comercios
- Señalización vial, nomenclatura, obra pública
- Grafiti y propaganda pegada sin soporte formal

REGLA CRÍTICA: UNA ENTRADA POR ESTRUCTURA FÍSICA
Una misma estructura permanece visible varios segundos y en 360° puede reaparecer al costado y atrás. Reporta UNA sola entrada por objeto físico, con su rango de visibilidad completo. NO generes una entrada por aparición.
Excepción: una estructura de doble vista con dos caras publicitarias distintas cuenta como dos entradas.

BEST FRAME
best_frame_seg es el momento de mayor tamaño aparente y menor oclusión de esa estructura. Ese timestamp se usará para extraer el frame en resolución nativa, así que priorízalo por legibilidad potencial, no por primera aparición.

SESGO A RECALL
Esto es una prueba de cobertura. Si dudas si algo es una estructura publicitaria, INCLÚYELA con confianza baja en lugar de omitirla. Un falso positivo marcado es preferible a una omisión silenciosa.

NO ADIVINES LA MARCA
El OCR definitivo se hace después, sobre el frame nativo. En texto_legible reporta únicamente texto que efectivamente leas. Si no lo lees, null. Nunca infieras marca, categoría ni anunciante a partir de colores, formas, tipografía o contexto. Inferir es un error grave en esta tarea.

TRAMOS NO ANALIZABLES
Si hay segmentos donde no puedes censar (túnel, sobreexposición, lente obstruido, movimiento excesivo), decláralos en tramos_no_analizables en vez de omitirlos en silencio.`;

export const USER_PROMPT_OOH = `Recorre el video completo de principio a fin y censa todas las estructuras publicitarias visibles.

Devuelve únicamente JSON válido conforme al esquema. Sin markdown, sin preámbulo, sin explicación fuera del JSON.`;

export const OOH_RESPONSE_SCHEMA_JSON = {
  type: "object",
  required: ["resumen", "estructuras"],
  properties: {
    resumen: {
      type: "object",
      required: ["duracion_analizada_seg", "total_estructuras"],
      properties: {
        duracion_analizada_seg: { type: "number" },
        total_estructuras: { type: "integer" },
        tramos_no_analizables: {
          type: "array",
          items: {
            type: "object",
            properties: {
              desde_seg: { type: "number" },
              hasta_seg: { type: "number" },
              motivo: { type: "string" }
            }
          }
        }
      }
    },
    estructuras: {
      type: "array",
      items: {
        type: "object",
        required: ["id_local", "best_frame_seg", "tipo_medio", "confianza_deteccion"],
        properties: {
          id_local: { type: "string" },
          best_frame_seg: { type: "number" },
          visible_desde_seg: { type: "number" },
          visible_hasta_seg: { type: "number" },
          bbox_1000: {
            type: "array",
            items: { type: "integer" },
            minItems: 4,
            maxItems: 4
          },
          tipo_medio: {
            type: "string",
            enum: ["espectacular", "valla", "muro", "parabus", "mupi", "pantalla_digital", "puente", "totem", "mobiliario_urbano", "otro"]
          },
          lado: {
            type: "string",
            enum: ["derecho", "izquierdo", "frontal", "elevado"]
          },
          caras_visibles: { type: "integer" },
          texto_legible: { type: ["string", "null"] },
          hay_creatividad: { type: "boolean" },
          confianza_deteccion: { type: "integer" },
          confianza_tipo_medio: { type: "integer" },
          nota: { type: ["string", "null"] }
        }
      }
    }
  }
};

export const PRESET_CHUNKS: ChunkVideoPreset[] = [
  {
    id: 'chunk-insurgentes-360',
    titulo: 'Chunk 1: Av. Insurgentes Sur (360° Equirectangular)',
    ubicacion: 'CDMX - Tramo Río Mixcoac a Félix Cuevas (5 min / 300s)',
    duracion_seg: 300,
    variante: 'A_equirectangular',
    descripcion: 'Grabación equirectangular 360° a bordo de camioneta de censo. Recorrido urbano denso con corredores comerciales, puentes peatonales y espectaculares unipolares.',
    groundTruth: [
      { id: 'GT-01', segundo_real: 18.2, tipo_medio: 'espectacular', descripcion: 'Unipolar 12.9x7.2m costado derecho', lado: 'derecho', hay_creatividad: true, texto_esperado: 'TELCEL 5G' },
      { id: 'GT-02', segundo_real: 42.5, tipo_medio: 'parabus', descripcion: 'Mupi en refugio de autobús frente a estación', lado: 'derecho', hay_creatividad: true, texto_esperado: 'BANORTE' },
      { id: 'GT-03', segundo_real: 65.0, tipo_medio: 'pantalla_digital', descripcion: 'Pantalla LED sobre azotea de edificio esquinero', lado: 'izquierdo', hay_creatividad: true, texto_esperado: 'CORONA EXTRA' },
      { id: 'GT-04', segundo_real: 98.4, tipo_medio: 'valla', descripcion: 'Valla fija perimetral en predio en construcción', lado: 'derecho', hay_creatividad: false, texto_esperado: 'DISPONIBLE 55-5555-0000' },
      { id: 'GT-05', segundo_real: 132.0, tipo_medio: 'puente', descripcion: 'Bajo puente vehicular publicidad doble sentido', lado: 'frontal', hay_creatividad: true, texto_esperado: 'LIVERPOOL' },
      { id: 'GT-06', segundo_real: 175.6, tipo_medio: 'muro', descripcion: 'Muro ciego pintado/lonero sobre inmueble', lado: 'izquierdo', hay_creatividad: true, texto_esperado: 'SAMSUNG GALAXY' },
      { id: 'GT-07', segundo_real: 212.3, tipo_medio: 'espectacular', descripcion: 'Espectacular de azotea doble cara (cara norte)', lado: 'elevado', hay_creatividad: true, texto_esperado: 'NISSAN KICKS' },
      { id: 'GT-08', segundo_real: 213.5, tipo_medio: 'espectacular', descripcion: 'Espectacular de azotea doble cara (cara sur)', lado: 'elevado', hay_creatividad: false, texto_esperado: 'RENTESE AQUI' },
      { id: 'GT-09', segundo_real: 254.8, tipo_medio: 'totem', descripcion: 'Tótem publicitario de plaza comercial de 18m', lado: 'derecho', hay_creatividad: true, texto_esperado: 'CINEPOLIS' },
      { id: 'GT-10', segundo_real: 288.1, tipo_medio: 'mobiliario_urbano', descripcion: 'Columna publicitaria informativa en banqueta', lado: 'derecho', hay_creatividad: true, texto_esperado: 'BBVA SEGUROS' }
    ],
    sampleAudit: {
      resumen: {
        duracion_analizada_seg: 300,
        total_estructuras: 9,
        tramos_no_analizables: [
          {
            desde_seg: 138.0,
            hasta_seg: 147.0,
            motivo: 'Paso bajo deprimido Mixcoac (penumbra y subexposición severa)'
          }
        ]
      },
      telemetria: {
        model: 'gemini-3.8-flash',
        total_thought_tokens: 3420,
        total_tool_use_tokens: 610,
        prompt_tokens: 18450,
        candidates_tokens: 1240,
        total_tokens: 23720,
        latencia_ms: 14250,
        processing_mode: 'Agentic Thinking (High Media Res)',
        timestamp: '2026-09-10T10:05:00Z'
      },
      estructuras: [
        {
          id_local: 'EST-001',
          best_frame_seg: 18.4,
          visible_desde_seg: 12.0,
          visible_hasta_seg: 23.5,
          bbox_1000: [180, 680, 420, 890],
          tipo_medio: 'espectacular',
          lado: 'derecho',
          caras_visibles: 1,
          texto_legible: 'TELCEL 5G',
          hay_creatividad: true,
          confianza_deteccion: 96,
          confianza_tipo_medio: 94,
          nota: 'Unipolar en acera derecha con iluminación superior visible.'
        },
        {
          id_local: 'EST-002',
          best_frame_seg: 42.1,
          visible_desde_seg: 37.0,
          visible_hasta_seg: 46.2,
          bbox_1000: [560, 710, 740, 810],
          tipo_medio: 'parabus',
          lado: 'derecho',
          caras_visibles: 1,
          texto_legible: 'BANORTE',
          hay_creatividad: true,
          confianza_deteccion: 88,
          confianza_tipo_medio: 90,
          nota: 'Mupi en parada de autobús, ligeramente curvado por proyección 360.'
        },
        {
          id_local: 'EST-003',
          best_frame_seg: 65.2,
          visible_desde_seg: 58.0,
          visible_hasta_seg: 71.0,
          bbox_1000: [140, 110, 390, 310],
          tipo_medio: 'pantalla_digital',
          lado: 'izquierdo',
          caras_visibles: 1,
          texto_legible: 'CORONA',
          hay_creatividad: true,
          confianza_deteccion: 98,
          confianza_tipo_medio: 95,
          nota: 'Pantalla LED de alto brillo en azotea de edificio.'
        },
        {
          id_local: 'EST-004',
          best_frame_seg: 97.8,
          visible_desde_seg: 91.0,
          visible_hasta_seg: 104.0,
          bbox_1000: [590, 640, 780, 930],
          tipo_medio: 'valla',
          lado: 'derecho',
          caras_visibles: 1,
          texto_legible: '55-5555',
          hay_creatividad: false,
          confianza_deteccion: 85,
          confianza_tipo_medio: 89,
          nota: 'Valla con lona blanca y teléfono de comercialización (estructura disponible).'
        },
        {
          id_local: 'EST-005',
          best_frame_seg: 131.5,
          visible_desde_seg: 122.0,
          visible_hasta_seg: 136.0,
          bbox_1000: [260, 380, 460, 620],
          tipo_medio: 'puente',
          lado: 'frontal',
          caras_visibles: 1,
          texto_legible: 'LIVERPOOL',
          hay_creatividad: true,
          confianza_deteccion: 93,
          confianza_tipo_medio: 91,
          nota: 'Cuerpo publicitario adosado a estructura de trabe de puente.'
        },
        {
          id_local: 'EST-006',
          best_frame_seg: 176.0,
          visible_desde_seg: 168.0,
          visible_hasta_seg: 184.0,
          bbox_1000: [110, 140, 480, 330],
          tipo_medio: 'muro',
          lado: 'izquierdo',
          caras_visibles: 1,
          texto_legible: 'SAMSUNG GALAXY',
          hay_creatividad: true,
          confianza_deteccion: 91,
          confianza_tipo_medio: 92,
          nota: 'Muro ciego gran formato con bastidor perimetral.'
        },
        {
          id_local: 'EST-007',
          best_frame_seg: 212.0,
          visible_desde_seg: 204.0,
          visible_hasta_seg: 219.0,
          bbox_1000: [70, 420, 290, 610],
          tipo_medio: 'espectacular',
          lado: 'elevado',
          caras_visibles: 2,
          texto_legible: 'NISSAN',
          hay_creatividad: true,
          confianza_deteccion: 94,
          confianza_tipo_medio: 92,
          nota: 'Estructura en azotea vista frontal cara norte.'
        },
        {
          id_local: 'EST-007B',
          best_frame_seg: 214.2,
          visible_desde_seg: 213.0,
          visible_hasta_seg: 224.0,
          bbox_1000: [80, 890, 300, 990],
          tipo_medio: 'espectacular',
          lado: 'elevado',
          caras_visibles: 1,
          texto_legible: 'RENTESE',
          hay_creatividad: false,
          confianza_deteccion: 82,
          confianza_tipo_medio: 80,
          nota: 'Segunda cara de la misma estructura unipolar vista en retrovisor/borde 360° (cumple regla de doble vista).'
        },
        {
          id_local: 'EST-008',
          best_frame_seg: 254.5,
          visible_desde_seg: 247.0,
          visible_hasta_seg: 261.0,
          bbox_1000: [190, 720, 680, 860],
          tipo_medio: 'totem',
          lado: 'derecho',
          caras_visibles: 2,
          texto_legible: 'CINEPOLIS',
          hay_creatividad: true,
          confianza_deteccion: 90,
          confianza_tipo_medio: 88,
          nota: 'Tótem vertical autoportante en acceso a centro comercial.'
        }
      ]
    }
  },
  {
    id: 'chunk-periferico-120fov',
    titulo: 'Chunk 2: Periférico Sur (Variante B - Plano 120° FOV)',
    ubicacion: 'CDMX - San Jerónimo a Perisur (Reencuadrado frontal Insta360)',
    duracion_seg: 300,
    variante: 'B_plano_120fov',
    descripcion: 'Reencuadre plano frontal a 120° FOV exportado desde Insta360 Studio. Geometría estándar rectilínea sin curvatura equirectangular, optimizado para medir si la proyección normal mejora recall.',
    groundTruth: [
      { id: 'GT-B01', segundo_real: 24.0, tipo_medio: 'espectacular', descripcion: 'Espectacular sobre segundo piso', lado: 'elevado', hay_creatividad: true, texto_esperado: 'AEROMEXICO' },
      { id: 'GT-B02', segundo_real: 58.2, tipo_medio: 'pantalla_digital', descripcion: 'Pantalla digital adosada a paso a desnivel', lado: 'frontal', hay_creatividad: true, texto_esperado: 'CITIBANAMEX' },
      { id: 'GT-B03', segundo_real: 110.5, tipo_medio: 'valla', descripcion: 'Valla baja en lateral', lado: 'derecho', hay_creatividad: true, texto_esperado: 'COCA COLA' },
      { id: 'GT-B04', segundo_real: 165.0, tipo_medio: 'puente', descripcion: 'Publicidad sobre puente peatonal', lado: 'frontal', hay_creatividad: true, texto_esperado: 'UNIVERSIDAD ANÁHUAC' },
      { id: 'GT-B05', segundo_real: 220.4, tipo_medio: 'espectacular', descripcion: 'Unipolar lateral', lado: 'derecho', hay_creatividad: false, texto_esperado: 'DISPONIBLE' },
      { id: 'GT-B06', segundo_real: 270.0, tipo_medio: 'muro', descripcion: 'Muro publicitario en retorno', lado: 'izquierdo', hay_creatividad: true, texto_esperado: 'MERCADO LIBRE' }
    ],
    sampleAudit: {
      resumen: {
        duracion_analizada_seg: 300,
        total_estructuras: 6,
        tramos_no_analizables: []
      },
      telemetria: {
        model: 'gemini-3.8-flash',
        total_thought_tokens: 2890,
        total_tool_use_tokens: 420,
        prompt_tokens: 17200,
        candidates_tokens: 950,
        total_tokens: 21460,
        latencia_ms: 11800,
        processing_mode: 'Agentic Thinking (High Media Res - Perspective)',
        timestamp: '2026-09-10T10:07:00Z'
      },
      estructuras: [
        {
          id_local: 'EST-B01',
          best_frame_seg: 24.2,
          visible_desde_seg: 17.0,
          visible_hasta_seg: 29.0,
          bbox_1000: [90, 480, 280, 790],
          tipo_medio: 'espectacular',
          lado: 'elevado',
          caras_visibles: 1,
          texto_legible: 'AEROMEXICO',
          hay_creatividad: true,
          confianza_deteccion: 98,
          confianza_tipo_medio: 97,
          nota: 'Excelente nitidez en proyección plana frontal; sin distorsión en bordes.'
        },
        {
          id_local: 'EST-B02',
          best_frame_seg: 58.1,
          visible_desde_seg: 49.0,
          visible_hasta_seg: 64.0,
          bbox_1000: [310, 360, 520, 640],
          tipo_medio: 'pantalla_digital',
          lado: 'frontal',
          caras_visibles: 1,
          texto_legible: 'CITIBANAMEX',
          hay_creatividad: true,
          confianza_deteccion: 97,
          confianza_tipo_medio: 96,
          nota: 'Pantalla LED frontal directa en línea de visión del conductor.'
        },
        {
          id_local: 'EST-B03',
          best_frame_seg: 110.8,
          visible_desde_seg: 102.0,
          visible_hasta_seg: 118.0,
          bbox_1000: [570, 750, 790, 960],
          tipo_medio: 'valla',
          lado: 'derecho',
          caras_visibles: 1,
          texto_legible: 'COCA COLA',
          hay_creatividad: true,
          confianza_deteccion: 92,
          confianza_tipo_medio: 93,
          nota: 'Valla publicitaria continua en carril lateral.'
        },
        {
          id_local: 'EST-B04',
          best_frame_seg: 165.2,
          visible_desde_seg: 154.0,
          visible_hasta_seg: 172.0,
          bbox_1000: [220, 260, 430, 740],
          tipo_medio: 'puente',
          lado: 'frontal',
          caras_visibles: 1,
          texto_legible: 'ANÁHUAC',
          hay_creatividad: true,
          confianza_deteccion: 99,
          confianza_tipo_medio: 98,
          nota: 'Puente peatonal completo visible sin artefactos de curvatura.'
        },
        {
          id_local: 'EST-B05',
          best_frame_seg: 220.1,
          visible_desde_seg: 211.0,
          visible_hasta_seg: 228.0,
          bbox_1000: [140, 710, 410, 930],
          tipo_medio: 'espectacular',
          lado: 'derecho',
          caras_visibles: 1,
          texto_legible: 'DISPONIBLE',
          hay_creatividad: false,
          confianza_deteccion: 91,
          confianza_tipo_medio: 92,
          nota: 'Estructura vacía/disponible detectada correctamente.'
        },
        {
          id_local: 'EST-B06',
          best_frame_seg: 270.4,
          visible_desde_seg: 260.0,
          visible_hasta_seg: 278.0,
          bbox_1000: [280, 50, 540, 310],
          tipo_medio: 'muro',
          lado: 'izquierdo',
          caras_visibles: 1,
          texto_legible: 'MERCADO LIBRE',
          hay_creatividad: true,
          confianza_deteccion: 94,
          confianza_tipo_medio: 93,
          nota: 'Muro sobre lateral izquierda en ángulo favorable.'
        }
      ]
    }
  }
];
