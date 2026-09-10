import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Upload,
  RefreshCw,
  FileVideo,
  Info,
  Sliders,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  FileCode,
  Check,
} from 'lucide-react';
import { ChunkVideoPreset } from '../types';
import { SYSTEM_INSTRUCTION_OOH, USER_PROMPT_OOH } from '../data/sampleAudits';

interface AuditRunnerPanelProps {
  presets: ChunkVideoPreset[];
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
  onRunAudit: (options: { frameBase64?: string; forceAi?: boolean }) => Promise<void>;
  onRunAgenticAudit: () => Promise<void>;
  isLoading: boolean;
  onUploadCustomVideo: (file: File) => void;
  hasCustomVideo: boolean;
  customVideoInfo?: { name: string; sizeMb: number; durationSec?: number } | null;
  hasApiKey: boolean;
  executionStatusText?: string | null;
}

export const AuditRunnerPanel: React.FC<AuditRunnerPanelProps> = ({
  presets,
  selectedPresetId,
  onSelectPreset,
  onRunAudit,
  onRunAgenticAudit,
  isLoading,
  onUploadCustomVideo,
  hasCustomVideo,
  customVideoInfo,
  hasApiKey,
  executionStatusText,
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useLiveAi, setUseLiveAi] = useState(true);

  useEffect(() => {
    if (hasApiKey) {
      setUseLiveAi(true);
    }
  }, [hasApiKey]);

  const isCustomSelected = selectedPresetId === 'custom-uploaded-video';
  const selectedPreset = presets.find((p) => p.id === selectedPresetId) || presets[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCustomVideo(file);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Control de Ejecución del Censo (5 Min Chunk)</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Agentic Video • gemini-3.8-flash</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isCustomSelected
              ? `Video propio seleccionado: ${customVideoInfo?.name || 'Archivo personalizado'} listo para Agentic Video Understanding.`
              : 'Selecciona un tramo vehicular de calibración o carga tu propio video 360° / plano de Insta360.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>{showInstructions ? 'Ocultar Guía' : 'Ver Guía Agentic'}</span>
          </button>

          {/* Primary Agentic Video Execution */}
          <button
            onClick={onRunAgenticAudit}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-white text-xs font-bold shadow-md transition cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 disabled:bg-slate-800 disabled:opacity-60"
            title="Sube el video a Gemini Files API y permite que el modelo navegue temporalmente (Think → Act → Observe)"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Ejecutando Agentic Video...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200 fill-emerald-300" />
                <span>Ejecutar Agentic Video Audit</span>
              </>
            )}
          </button>

          {/* Fallback frame-by-frame execution */}
          <button
            onClick={() => onRunAudit({ forceAi: true })}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition disabled:opacity-60"
            title="Muestreo estático por fotogramas"
          >
            <Play className="w-3.5 h-3.5 text-slate-400" />
            <span>Muestreo Rápido</span>
          </button>
        </div>
      </div>

      {/* Google Agentic Video Architecture Callout */}
      <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-emerald-900/80 text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="text-slate-300 text-[11px] leading-tight">
            <strong className="text-emerald-300">Google Agentic Video Understanding:</strong> Navegación temporal autónoma (Think → Act → Observe). Hasta <strong className="text-white">88% de ahorro en tokens</strong> y <strong className="text-white">66% en costos</strong> con recuperación sub-segundo de estructuras OOH.
          </div>
        </div>
        <a
          href="https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-agentic-video-in-gemini/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium whitespace-nowrap"
        >
          Ver anuncio oficial de Google &rarr;
        </a>
      </div>

      {/* Execution Progress Banner */}
      {executionStatusText && (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-sky-950/80 border border-sky-500/50 text-sky-200 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
          <span className="font-semibold">{executionStatusText}</span>
        </div>
      )}

      {/* Preset & Source Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {presets.map((preset) => {
          const isSelected = preset.id === selectedPresetId;
          return (
            <div
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              className={`p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-850 border-sky-500 ring-1 ring-sky-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-slate-200">{preset.titulo}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      preset.variante === 'A_equirectangular'
                        ? 'bg-sky-950 text-sky-300 border border-sky-800'
                        : 'bg-purple-950 text-purple-300 border border-purple-800'
                    }`}
                  >
                    {preset.variante === 'A_equirectangular' ? 'Var A (360°)' : 'Var B (Plano)'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{preset.ubicacion}</div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                  {preset.descripcion}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Duración: {preset.duracion_seg}s (5 min)</span>
                <span className="text-sky-400 font-mono">
                  {preset.groundTruth.length} estructuras GT
                </span>
              </div>
            </div>
          );
        })}

        {/* Custom Upload Card */}
        <div
          onClick={() => {
            if (hasCustomVideo) {
              onSelectPreset('custom-uploaded-video');
            } else {
              fileInputRef.current?.click();
            }
          }}
          className={`p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
            isCustomSelected
              ? 'bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/50'
              : hasCustomVideo
              ? 'bg-slate-950/60 border-emerald-700/60 hover:border-emerald-500'
              : 'border-dashed bg-slate-950/40 border-slate-700 hover:border-sky-500'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {hasCustomVideo ? (
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <FileVideo className="w-4 h-4 text-emerald-400" />
                    <span className="truncate max-w-[140px]">{customVideoInfo?.name || 'Video Propio'}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      isCustomSelected
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {isCustomSelected ? 'Activo' : 'Cargado'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {customVideoInfo?.durationSec
                    ? `Duración: ${customVideoInfo.durationSec}s (~${(customVideoInfo.durationSec / 60).toFixed(1)} min)`
                    : 'Video listo para muestreo multi-frame'}
                  {customVideoInfo?.sizeMb ? ` • ${customVideoInfo.sizeMb} MB` : ''}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="text-[10px] text-slate-400 hover:text-sky-300 underline"
                >
                  Cambiar video...
                </button>
                <span className="text-emerald-400 font-medium text-[10px]">
                  {isCustomSelected ? 'Listo para auditar' : 'Clic para activar'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-2 h-full">
              <Upload className="w-5 h-5 text-sky-400 mb-1" />
              <span className="font-semibold text-slate-200">
                Subir Chunk Propio (.mp4 / .webm)
              </span>
              <p className="text-[10px] text-slate-400 mt-1">
                Arrastra o selecciona tu video vehicular para auditar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Guide Drawer */}
      {showInstructions && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-3">
          <h3 className="font-bold text-white flex items-center gap-1.5">
            <Info className="w-4 h-4 text-sky-400" />
            <span>Configuración Recomendada en AI Studio</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Modelo:</span>
              <div className="font-bold text-sky-300">gemini-3.8-flash</div>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Video Processing:</span>
              <div className="font-bold text-emerald-300">Agentic</div>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Media Resolution:</span>
              <div className="font-bold text-slate-200">High</div>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Temperature / Thinking:</span>
              <div className="font-bold text-purple-300">0 / Activado</div>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
            <div className="font-bold text-amber-300">Reglas Críticas del Censo:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>
                <strong className="text-slate-200">Una entrada por estructura física:</strong> Rango visible continuo con <code className="text-sky-300">best_frame_seg</code> óptimo. Estructura doble cara con 2 anuncios distintos = 2 entradas.
              </li>
              <li>
                <strong className="text-slate-200">Sesgo a Recall:</strong> Ante la duda, incluir con confianza baja en vez de omitir en silencio. Falso positivo preferible.
              </li>
              <li>
                <strong className="text-slate-200">No adivinar marca (OCR):</strong> Reportar únicamente texto efectivamente leído. Nunca inferir por color o tipografía.
              </li>
              <li>
                <strong className="text-slate-200">Tramos no analizables:</strong> Declarar túneles o sobreexposiciones explícitamente en el JSON.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
