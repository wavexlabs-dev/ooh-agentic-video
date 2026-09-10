import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Header } from './components/Header';
import { VideoPlayerViewer } from './components/VideoPlayerViewer';
import { ThreeMetricsSuite } from './components/ThreeMetricsSuite';
import { StructureInventoryList } from './components/StructureInventoryList';
import { AuditRunnerPanel } from './components/AuditRunnerPanel';
import { JsonViewerModal } from './components/JsonViewerModal';
import { PRESET_CHUNKS } from './data/sampleAudits';
import { AuditoriaOOHResponse, ChunkVideoPreset } from './types';
import { extractSampleFrames } from './utils/videoExtractor';

interface CustomVideoMeta {
  name: string;
  sizeMb: number;
  durationSec: number;
}

export default function App() {
  const [presets, setPresets] = useState<ChunkVideoPreset[]>(PRESET_CHUNKS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('chunk-insurgentes-360');
  const [activeVariant, setActiveVariant] = useState<'A' | 'B'>('A');

  const selectedPreset =
    presets.find((p) => p.id === selectedPresetId) || presets[0];

  const [audit, setAudit] = useState<AuditoriaOOHResponse>(selectedPreset.sampleAudit);
  const [currentSecond, setCurrentSecond] = useState<number>(18.4);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeStructureId, setActiveStructureId] = useState<string | null>('EST-001');

  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [executionStatusText, setExecutionStatusText] = useState<string | null>(null);
  const [isAuditingSingleFrame, setIsAuditingSingleFrame] = useState(false);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [customVideoMeta, setCustomVideoMeta] = useState<CustomVideoMeta | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const videoElementRef = useRef<HTMLVideoElement>(null);

  // Effective duration based on active source
  const effectiveDuration =
    selectedPresetId === 'custom-uploaded-video' && customVideoMeta?.durationSec
      ? customVideoMeta.durationSec
      : selectedPreset.duracion_seg;

  // Check health and API key status on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(Boolean(data.hasApiKey));
      })
      .catch(() => {});
  }, []);

  // Sync audit when preset changes (do not overwrite if custom video is selected)
  useEffect(() => {
    if (selectedPresetId === 'custom-uploaded-video') {
      return;
    }
    const targetPreset = presets.find((p) => p.id === selectedPresetId) || presets[0];
    setAudit(targetPreset.sampleAudit);
    setActiveVariant(targetPreset.variante === 'A_equirectangular' ? 'A' : 'B');
    if (targetPreset.sampleAudit.estructuras.length > 0) {
      const first = targetPreset.sampleAudit.estructuras[0];
      setActiveStructureId(first.id_local);
      setCurrentSecond(first.best_frame_seg);
    }
  }, [selectedPresetId, presets]);

  // Handle Playback Interval
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentSecond((prev) => {
          if (prev >= effectiveDuration) {
            setIsPlaying(false);
            return 0;
          }
          return Number((prev + 0.2).toFixed(1));
        });
      }, 200);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, effectiveDuration]);

  // Run audit through backend (supports custom video with multi-frame extraction)
  const handleRunAudit = async (options?: { frameBase64?: string; forceAi?: boolean }) => {
    setIsLoadingAudit(true);
    setExecutionStatusText('Iniciando auditoría de inventario exterior...');

    try {
      let payload: any = {
        presetId: selectedPresetId,
        variant: activeVariant,
        forceAi: true,
      };

      if (options?.frameBase64) {
        payload.frameBase64 = options.frameBase64;
        setExecutionStatusText('Analizando fotograma con Gemini 3.8 Flash...');
      } else if (selectedPresetId === 'custom-uploaded-video' && customVideoUrl) {
        setExecutionStatusText('Paso 1/3: Muestreando fotogramas clave del video vehicular...');

        // Extract 6 representative frames across the video
        const frames = await extractSampleFrames(
          customVideoUrl,
          6,
          (curr, tot) => setExecutionStatusText(`Paso 1/3: Extrayendo fotograma ${curr} de ${tot}...`)
        );

        if (!frames || frames.length === 0) {
          throw new Error('No se pudieron extraer fotogramas del video. Verifica que el archivo sea compatible y reproducible.');
        }

        setExecutionStatusText('Paso 2/3: Enviando fotogramas a Gemini 3.8 Flash (Visión Multimodal)...');
        payload = {
          frames: frames.map((f) => ({ timeSec: f.timeSec, base64: f.base64 })),
          videoDuration: customVideoMeta?.durationSec || 300,
          isCustomVideo: true,
          forceAi: true,
          filename: customVideoMeta?.name || 'custom_video.mp4',
        };
      } else {
        setExecutionStatusText('Ejecutando auditoría con Gemini 3.8 Flash...');
      }

      setExecutionStatusText('Paso 3/3: Procesando estructuras y validando esquema OOH...');

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error en auditoría (${res.status})`);
      }

      const newAudit: AuditoriaOOHResponse = await res.json();
      setAudit(newAudit);

      if (newAudit.estructuras && newAudit.estructuras.length > 0) {
        setActiveStructureId(newAudit.estructuras[0].id_local);
        setCurrentSecond(newAudit.estructuras[0].best_frame_seg);
      }
    } catch (err: any) {
      console.error('Audit execution error:', err);
      alert(`Error al ejecutar censo con Gemini: ${err.message || err}`);
    } finally {
      setIsLoadingAudit(false);
      setExecutionStatusText(null);
    }
  };

  // Quick single-frame analysis from the player
  const handleAuditCurrentFrame = async () => {
    try {
      setIsAuditingSingleFrame(true);
      setExecutionStatusText(`Capturando y analizando fotograma en ${currentSecond.toFixed(1)}s con Gemini...`);

      let base64Image: string | null = null;
      if (videoElementRef.current && customVideoUrl) {
        const video = videoElementRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 1280, 1280);
        canvas.height = Math.min(video.videoHeight || 720, 720);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          base64Image = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        }
      }

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameBase64: base64Image,
          videoDuration: effectiveDuration,
          forceAi: true,
          variant: activeVariant,
          currentSecond,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error (${res.status})`);
      }

      const newAudit: AuditoriaOOHResponse = await res.json();
      setAudit(newAudit);
      if (newAudit.estructuras && newAudit.estructuras.length > 0) {
        setActiveStructureId(newAudit.estructuras[0].id_local);
      }
    } catch (err: any) {
      console.error('Single frame audit error:', err);
      alert(`Error al auditar fotograma con Gemini: ${err.message || err}`);
    } finally {
      setIsAuditingSingleFrame(false);
      setExecutionStatusText(null);
    }
  };

  const handleSelectVariant = (v: 'A' | 'B') => {
    setActiveVariant(v);
    if (v === 'A') {
      setSelectedPresetId('chunk-insurgentes-360');
    } else {
      setSelectedPresetId('chunk-periferico-120fov');
    }
  };

  const handleUploadCustomVideo = (file: File) => {
    const url = URL.createObjectURL(file);
    setCustomVideoUrl(url);

    // Read metadata and duration
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const duration = Math.round(tempVideo.duration || 300);
      const meta: CustomVideoMeta = {
        name: file.name,
        sizeMb: Number((file.size / (1024 * 1024)).toFixed(1)),
        durationSec: duration,
      };
      setCustomVideoMeta(meta);
      setSelectedPresetId('custom-uploaded-video');
      setCurrentSecond(0);

      // Clean slate ready for custom video analysis
      setAudit({
        estructuras: [],
        resumen: {
          total_estructuras: 0,
          con_creatividad: 0,
          disponibles: 0,
          por_tipo: {
            espectacular: 0,
            valla: 0,
            muro: 0,
            parabus: 0,
            mupi: 0,
            pantalla_digital: 0,
            puente: 0,
            totem: 0,
            mobiliario_urbano: 0,
            otro: 0,
          },
          tramos_no_analizables: [],
          duracion_analizada_seg: duration,
        },
        telemetria: {
          model: 'gemini-3.8-flash',
          prompt_tokens: 0,
          candidates_tokens: 0,
          total_tokens: 0,
          total_thought_tokens: 0,
          total_tool_use_tokens: 0,
          latencia_ms: 0,
          processing_mode: `Video cargado: ${file.name} listo para censar`,
          timestamp: new Date().toISOString(),
        },
      });
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <Header
        hasApiKey={hasApiKey}
        activeVariant={activeVariant}
        onSelectVariant={handleSelectVariant}
        onOpenRawJson={() => setIsJsonModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* System Resilience & Telemetry Notice Banner */}
        {audit.telemetria?.warning && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-3 shadow-lg backdrop-blur-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold text-amber-300">
                Aviso del Motor de Detección OOH
              </div>
              <p className="text-amber-200/90 leading-relaxed">
                {audit.telemetria.warning} Puedes continuar inspeccionando estructuras, marcas y telemetría sin problemas.
              </p>
            </div>
          </div>
        )}

        {/* Runner & Preset Selector */}
        <AuditRunnerPanel
          presets={presets}
          selectedPresetId={selectedPresetId}
          onSelectPreset={setSelectedPresetId}
          onRunAudit={handleRunAudit}
          isLoading={isLoadingAudit}
          onUploadCustomVideo={handleUploadCustomVideo}
          hasCustomVideo={Boolean(customVideoUrl)}
          customVideoInfo={customVideoMeta}
          hasApiKey={hasApiKey}
          executionStatusText={executionStatusText}
        />

        {/* Video & 360 / Planar Stage + Inventory List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Visual Player (7 cols) */}
          <div className="lg:col-span-7">
            <VideoPlayerViewer
              currentSecond={currentSecond}
              duration={effectiveDuration}
              isPlaying={isPlaying}
              onTimeChange={(t) => setCurrentSecond(t)}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              structures={audit.estructuras}
              activeStructureId={activeStructureId}
              onSelectStructure={setActiveStructureId}
              tramosNoAnalizables={audit.resumen.tramos_no_analizables}
              variant={selectedPreset.variante}
              videoFileUrl={customVideoUrl}
              videoRef={videoElementRef}
              onAuditCurrentFrame={handleAuditCurrentFrame}
              isAuditingFrame={isAuditingSingleFrame}
              customVideoName={customVideoMeta?.name}
            />
          </div>

          {/* Censused Inventory List (5 cols) */}
          <div className="lg:col-span-5">
            <StructureInventoryList
              structures={audit.estructuras}
              activeStructureId={activeStructureId}
              onSelectStructure={setActiveStructureId}
              onSeekTime={(time) => {
                setCurrentSecond(time);
                setIsPlaying(false);
              }}
            />
          </div>
        </div>

        {/* The 3 Core Evaluation Metrics Suite */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              Evaluación del Censo: Métricas de Viabilidad Operativa
            </h2>
            <span className="text-xs text-slate-400">
              Recall • Precisión Best Frame • Duplicados • Tokens & Costos • Variante B
            </span>
          </div>

          <ThreeMetricsSuite
            audit={audit}
            groundTruth={selectedPreset.groundTruth}
            variant={selectedPreset.variante}
            onSeekTime={(t) => {
              setCurrentSecond(t);
              setIsPlaying(false);
            }}
            onSelectStructure={setActiveStructureId}
            onSelectVariant={handleSelectVariant}
          />
        </div>
      </main>

      {/* Structured Output JSON Modal */}
      <JsonViewerModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        audit={audit}
      />
    </div>
  );
}
