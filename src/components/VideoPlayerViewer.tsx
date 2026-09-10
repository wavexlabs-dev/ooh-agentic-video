import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Eye,
  Compass,
  Maximize2,
  Copy,
  Check,
  Camera,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { EstructuraPublicitaria, TramoNoAnalizable } from '../types';

interface VideoPlayerViewerProps {
  currentSecond: number;
  duration: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onTogglePlay: () => void;
  structures: EstructuraPublicitaria[];
  activeStructureId: string | null;
  onSelectStructure: (id: string) => void;
  tramosNoAnalizables?: TramoNoAnalizable[];
  variant: 'A_equirectangular' | 'B_plano_120fov';
  videoFileUrl: string | null;
  onAuditCurrentFrame?: () => void;
  isAuditingFrame?: boolean;
  customVideoName?: string;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export const VideoPlayerViewer: React.FC<VideoPlayerViewerProps> = ({
  currentSecond,
  duration,
  isPlaying,
  onTimeChange,
  onTogglePlay,
  structures,
  activeStructureId,
  onSelectStructure,
  tramosNoAnalizables = [],
  variant,
  videoFileUrl,
  onAuditCurrentFrame,
  isAuditingFrame = false,
  customVideoName,
  videoRef: externalVideoRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const [yawAngle, setYawAngle] = useState(0); // For 360 viewer pan (-180 to 180)
  const [viewMode, setViewMode] = useState<'panoramic_full' | 'viewport_360'>(
    variant === 'A_equirectangular' ? 'panoramic_full' : 'viewport_360'
  );
  const [copiedFfmpeg, setCopiedFfmpeg] = useState(false);

  // Sync video element with currentSecond
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentSecond) > 0.3) {
      videoRef.current.currentTime = currentSecond;
    }
  }, [currentSecond]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Find currently visible structures at currentSecond
  const visibleStructures = structures.filter((s) => {
    const start = s.visible_desde_seg ?? s.best_frame_seg - 3;
    const end = s.visible_hasta_seg ?? s.best_frame_seg + 3;
    return currentSecond >= start && currentSecond <= end;
  });

  // Current active structure or best candidate
  const activeStructure =
    structures.find((s) => s.id_local === activeStructureId) ||
    visibleStructures[0] ||
    structures.find((s) => Math.abs(s.best_frame_seg - currentSecond) <= 2);

  // Check if current timestamp is in a non-analyzable zone (e.g. tunnel)
  const currentBlockedZone = tramosNoAnalizables.find(
    (t) => currentSecond >= t.desde_seg && currentSecond <= t.hasta_seg
  );

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const getFfmpegCommand = () => {
    const time = activeStructure ? activeStructure.best_frame_seg : Math.round(currentSecond);
    return `ffmpeg -ss ${time} -i chunk.mp4 -frames:v 1 out_bestframe_${time}s.png`;
  };

  const copyFfmpeg = () => {
    navigator.clipboard.writeText(getFfmpegCommand());
    setCopiedFfmpeg(true);
    setTimeout(() => setCopiedFfmpeg(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Player Header / Status Bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="font-semibold text-slate-200">
            {variant === 'A_equirectangular'
              ? 'Proyección Equirectangular 360° (360° Horizontal x 180° Vertical)'
              : 'Reencuadre Plano Frontal ~120° FOV (Insta360 Studio)'}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            Estructuras en frame actual:{' '}
            <strong className="text-sky-300">{visibleStructures.length}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {variant === 'A_equirectangular' && (
            <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
              <button
                onClick={() => setViewMode('panoramic_full')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  viewMode === 'panoramic_full'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mosaico 360° Completo
              </button>
              <button
                onClick={() => setViewMode('viewport_360')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  viewMode === 'viewport_360'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vista de Rumbo Dinámico
              </button>
            </div>
          )}

          {activeStructure && (
            <button
              onClick={copyFfmpeg}
              title="Copiar comando FFmpeg para extraer best_frame_seg en resolución nativa"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded text-[11px] transition"
            >
              {copiedFfmpeg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>ffmpeg -ss {activeStructure.best_frame_seg}s</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video / Synthetic Canvas Stage */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center select-none"
      >
        {/* Layer 1: Visual Backdrop (Real Video or Synthetic Equirectangular 360 View) */}
        {videoFileUrl ? (
          <video
            ref={videoRef}
            src={videoFileUrl}
            className="w-full h-full object-contain"
            playsInline
            onTimeUpdate={(e) => onTimeChange(e.currentTarget.currentTime)}
          />
        ) : (
          /* High-Fidelity Simulated Street Scene with Equirectangular Distortions */
          <div className="relative w-full h-full bg-linear-to-b from-sky-900 via-slate-800 to-slate-950 overflow-hidden">
            {/* Equirectangular grid lines and horizon indicator */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute w-full h-px top-1/2 bg-sky-400 border-t border-dashed border-sky-400/50" />
              <div className="absolute h-full w-px left-1/2 bg-sky-400 border-l border-dashed border-sky-400/50" />
              <div className="absolute h-full w-px left-1/4 bg-slate-500 border-l border-dotted border-slate-600" />
              <div className="absolute h-full w-px left-3/4 bg-slate-500 border-l border-dotted border-slate-600" />
            </div>

            {/* Cityscape and road rendering */}
            <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-slate-950 via-slate-900 to-transparent">
              {/* Road markings */}
              <div className="absolute bottom-0 inset-x-0 h-2/3 bg-slate-900 flex items-center justify-center">
                <div className="w-full h-1 bg-amber-500/80 mb-4" />
                <div className="absolute w-4 h-full bg-slate-950/40 left-1/2 -translate-x-1/2 transform skew-x-12" />
              </div>
            </div>
          </div>
        )}

        {/* Layer 2: HUD Overlays (Rendered on BOTH real video and synthetic canvas) */}
        {/* Ambient street orientation tags */}
        <div className="absolute top-3 left-4 flex items-center gap-3 text-[10px] text-slate-400 tracking-wider font-mono uppercase bg-slate-950/80 px-2.5 py-1 rounded backdrop-blur-xs border border-slate-800 z-10">
          <span>Atrás (0°)</span>
          <span>•</span>
          <span>Costado Izq (90°)</span>
          <span>•</span>
          <span className="text-sky-300 font-bold">Frente (180°)</span>
          <span>•</span>
          <span>Costado Der (270°)</span>
          <span>•</span>
          <span>Atrás (360°)</span>
          {customVideoName && (
            <span className="text-emerald-300 font-sans normal-case border-l border-slate-700 pl-2">
              {customVideoName}
            </span>
          )}
        </div>

        {/* Quick-action AI Audit Frame Button */}
        {onAuditCurrentFrame && (
          <button
            onClick={onAuditCurrentFrame}
            disabled={isAuditingFrame}
            title="Analizar este instante congelado con Gemini 3.8 Flash"
            className="absolute top-3 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-bold shadow-lg backdrop-blur-xs border border-sky-400/40 transition hover:scale-105 active:scale-95 disabled:bg-slate-800 disabled:opacity-60 cursor-pointer"
          >
            <Camera className={`w-3.5 h-3.5 ${isAuditingFrame ? 'animate-spin' : 'text-white'}`} />
            <span>{isAuditingFrame ? 'Analizando con Gemini...' : 'Auditar Fotograma Actual con IA'}</span>
          </button>
        )}

        {/* Non-analyzable zone overlay */}
        {currentBlockedZone && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertTriangle className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
            <h4 className="text-base font-bold text-amber-300">Tramo No Analizable</h4>
            <p className="text-xs text-slate-300 max-w-md mt-1">{currentBlockedZone.motivo}</p>
            <span className="text-[11px] text-slate-500 mt-2 font-mono">
              Declarado formalmente: {currentBlockedZone.desde_seg}s a {currentBlockedZone.hasta_seg}s (sin omisión silenciosa)
            </span>
          </div>
        )}

        {/* Render detected structures bounding boxes */}
        {visibleStructures.map((struct) => {
          if (!struct.bbox_1000) return null;
          const [ymin, xmin, ymax, xmax] = struct.bbox_1000;
          const top = ymin / 10;
          const left = xmin / 10;
          const height = (ymax - ymin) / 10;
          const width = (xmax - xmin) / 10;
          const isSelected = struct.id_local === activeStructure?.id_local;

          return (
            <div
              key={struct.id_local}
              onClick={() => onSelectStructure(struct.id_local)}
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
              className={`absolute cursor-pointer transition-all duration-150 rounded-sm border-2 z-10 ${
                isSelected
                  ? 'border-sky-400 bg-sky-500/20 shadow-lg shadow-sky-500/30 ring-2 ring-sky-300'
                  : struct.hay_creatividad
                  ? 'border-emerald-400/90 bg-emerald-500/10 hover:border-emerald-300'
                  : 'border-amber-400/90 bg-amber-500/10 hover:border-amber-300'
              }`}
            >
              {/* Floating ID & Classification Pill */}
              <div
                className={`absolute -top-7 left-0 whitespace-nowrap flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold shadow-md z-20 transition-transform ${
                  isSelected
                    ? 'bg-sky-600 text-white scale-105'
                    : struct.hay_creatividad
                    ? 'bg-emerald-800 text-emerald-100'
                    : 'bg-amber-800 text-amber-100'
                }`}
              >
                <span>{struct.id_local}</span>
                <span className="opacity-75">|</span>
                <span className="capitalize">{struct.tipo_medio.replace('_', ' ')}</span>
                <span className="text-[9px] px-1 rounded bg-black/40">
                  {struct.confianza_deteccion}%
                </span>
                {!struct.hay_creatividad && (
                  <span className="text-[9px] font-semibold text-amber-200 bg-amber-950/80 px-1 rounded">
                    DISPONIBLE
                  </span>
                )}
              </div>

              {/* Corner Reticles */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white pointer-events-none" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white pointer-events-none" />

              {/* Read OCR Text Overlay */}
              {struct.texto_legible && (
                <div className="absolute -bottom-6 left-0 bg-black/80 backdrop-blur-xs text-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-tight border border-slate-700 whitespace-nowrap z-20">
                  OCR: &quot;{struct.texto_legible}&quot;
                </div>
              )}
            </div>
          );
        })}

        {/* Floating Best Frame / OCR Detail Card if structure selected */}
        {activeStructure && (
          <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg p-3 text-xs max-w-xs shadow-xl text-slate-200 z-10">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-bold text-white">{activeStructure.id_local}</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  activeStructure.hay_creatividad
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {activeStructure.hay_creatividad ? 'Con Creatividad' : 'Vacía / Disponible'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[11px]">
              <div>
                <span className="text-slate-400">Tipo: </span>
                <span className="font-medium text-slate-100 capitalize">
                  {activeStructure.tipo_medio.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Lado: </span>
                <span className="font-medium text-slate-100 capitalize">
                  {activeStructure.lado || 'N/D'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Best Frame: </span>
                <button
                  onClick={() => onTimeChange(activeStructure.best_frame_seg)}
                  className="font-mono text-sky-400 font-bold hover:underline"
                >
                  {activeStructure.best_frame_seg.toFixed(1)}s
                </button>
              </div>
              <div>
                <span className="text-slate-400">Rango: </span>
                <span className="font-mono text-slate-300">
                  {activeStructure.visible_desde_seg ?? (activeStructure.best_frame_seg - 3).toFixed(1)}s -{' '}
                  {activeStructure.visible_hasta_seg ?? (activeStructure.best_frame_seg + 3).toFixed(1)}s
                </span>
              </div>
            </div>

            {activeStructure.texto_legible && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Texto Leído: </span>
                <span className="font-semibold text-emerald-300 font-mono">
                  &quot;{activeStructure.texto_legible}&quot;
                </span>
              </div>
            )}

            {activeStructure.nota && (
              <p className="mt-1 text-[10px] text-slate-400 italic leading-snug">
                {activeStructure.nota}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Interactive Timeline with Structure Markers */}
      <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
        {/* Scrubber Bar */}
        <div className="relative w-full h-8 flex items-center group">
          {/* Background rail */}
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
            {/* Non-analyzable zones on timeline */}
            {tramosNoAnalizables.map((tramo, idx) => {
              const leftPercent = (tramo.desde_seg / duration) * 100;
              const widthPercent = ((tramo.hasta_seg - tramo.desde_seg) / duration) * 100;
              return (
                <div
                  key={idx}
                  title={`Tramo No Analizable: ${tramo.motivo}`}
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  className="absolute top-0 bottom-0 bg-red-500/40 border-x border-red-500"
                />
              );
            })}

            {/* Played progress */}
            <div
              style={{ width: `${(currentSecond / duration) * 100}%` }}
              className="h-full bg-linear-to-r from-sky-500 to-indigo-500"
            />
          </div>

          {/* Markers for detected structures */}
          {structures.map((s) => {
            const markerPos = (s.best_frame_seg / duration) * 100;
            const isSelected = s.id_local === activeStructure?.id_local;
            return (
              <button
                key={s.id_local}
                onClick={() => {
                  onTimeChange(s.best_frame_seg);
                  onSelectStructure(s.id_local);
                }}
                title={`${s.id_local} (${s.tipo_medio}) @ ${s.best_frame_seg}s`}
                style={{ left: `${markerPos}%` }}
                className={`absolute -translate-x-1/2 w-2.5 h-4.5 rounded-xs transition-transform z-10 ${
                  isSelected
                    ? 'bg-sky-400 ring-2 ring-white scale-125 z-20'
                    : s.hay_creatividad
                    ? 'bg-emerald-400 hover:scale-115'
                    : 'bg-amber-400 hover:scale-115'
                }`}
              />
            );
          })}

          {/* Current playhead handle */}
          <input
            type="range"
            min="0"
            max={duration}
            step="0.1"
            value={currentSecond}
            onChange={(e) => onTimeChange(parseFloat(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Media Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className="w-8 h-8 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center shadow transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => onTimeChange(Math.max(0, currentSecond - 5))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Retroceder 5 segundos"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => onTimeChange(Math.min(duration, currentSecond + 5))}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Avanzar 5 segundos"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => onTimeChange(0)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Reiniciar al inicio (0:00)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="font-mono text-sm ml-2">
              <span className="font-bold text-sky-400">{formatTime(currentSecond)}</span>
              <span className="text-slate-500"> / {formatTime(duration)}</span>
            </div>
          </div>

          {/* Jump to Best Frame of closest structure */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Saltar a Best Frame:</span>
            <div className="flex flex-wrap gap-1">
              {structures.slice(0, 6).map((s) => (
                <button
                  key={s.id_local}
                  onClick={() => {
                    onTimeChange(s.best_frame_seg);
                    onSelectStructure(s.id_local);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                    s.id_local === activeStructure?.id_local
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {s.id_local} ({s.best_frame_seg.toFixed(0)}s)
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
