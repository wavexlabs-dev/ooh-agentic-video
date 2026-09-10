export type TipoMedio =
  | 'espectacular'
  | 'valla'
  | 'muro'
  | 'parabus'
  | 'mupi'
  | 'pantalla_digital'
  | 'puente'
  | 'totem'
  | 'mobiliario_urbano'
  | 'otro';

export type LadoEstructura = 'derecho' | 'izquierdo' | 'frontal' | 'elevado';

export interface TramoNoAnalizable {
  desde_seg: number;
  hasta_seg: number;
  motivo: string;
}

export interface EstructuraPublicitaria {
  id_local: string;
  best_frame_seg: number;
  visible_desde_seg?: number;
  visible_hasta_seg?: number;
  bbox_1000?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalizado a 0-1000
  tipo_medio: TipoMedio;
  lado?: LadoEstructura;
  caras_visibles?: number;
  texto_legible?: string | null;
  hay_creatividad?: boolean;
  confianza_deteccion: number; // 0-100 o escala 1-5
  confianza_tipo_medio?: number;
  nota?: string | null;
  isDuplicate?: boolean;
  groundTruthMatchedId?: string;
}

export interface ResumenAuditoria {
  duracion_analizada_seg: number;
  total_estructuras: number;
  tramos_no_analizables?: TramoNoAnalizable[];
}

export interface AuditoriaOOHResponse {
  resumen: ResumenAuditoria;
  estructuras: EstructuraPublicitaria[];
  telemetria?: {
    model: string;
    total_thought_tokens?: number;
    total_tool_use_tokens?: number;
    prompt_tokens?: number;
    candidates_tokens?: number;
    total_tokens?: number;
    latencia_ms: number;
    processing_mode: string;
    timestamp: string;
    warning?: string;
  };
}

export interface GroundTruthItem {
  id: string;
  segundo_real: number;
  tipo_medio: TipoMedio;
  descripcion: string;
  lado: LadoEstructura;
  hay_creatividad: boolean;
  texto_esperado?: string;
}

export interface ChunkVideoPreset {
  id: string;
  titulo: string;
  ubicacion: string;
  duracion_seg: number;
  descripcion: string;
  variante: 'A_equirectangular' | 'B_plano_120fov';
  videoUrl?: string;
  sampleAudit: AuditoriaOOHResponse;
  groundTruth: GroundTruthItem[];
}
