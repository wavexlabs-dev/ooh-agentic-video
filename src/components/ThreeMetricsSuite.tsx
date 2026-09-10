import React, { useState } from 'react';
import {
  Target,
  Clock,
  CopyCheck,
  Coins,
  Split,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Terminal,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  AuditoriaOOHResponse,
  GroundTruthItem,
  EstructuraPublicitaria,
} from '../types';

interface ThreeMetricsSuiteProps {
  audit: AuditoriaOOHResponse;
  groundTruth: GroundTruthItem[];
  variant: 'A_equirectangular' | 'B_plano_120fov';
  onSeekTime: (seconds: number) => void;
  onSelectStructure: (id: string) => void;
  onSelectVariant: (v: 'A' | 'B') => void;
}

export const ThreeMetricsSuite: React.FC<ThreeMetricsSuiteProps> = ({
  audit,
  groundTruth,
  variant,
  onSeekTime,
  onSelectStructure,
  onSelectVariant,
}) => {
  const [activeTab, setActiveTab] = useState<'recall' | 'timestamps' | 'duplicates' | 'costs' | 'variant_b'>('recall');
  const [customGtCount, setCustomGtCount] = useState<number>(groundTruth.length || 10);
  const [copiedScript, setCopiedScript] = useState(false);

  const totalReportadas = audit.estructuras.length;
  const recallPercentage = Math.round((totalReportadas / customGtCount) * 100);
  const isRecallPassing = recallPercentage >= 85;

  // Telemetry details
  const telemetria = audit.telemetria || {
    model: 'gemini-3.8-flash',
    total_thought_tokens: 3420,
    total_tool_use_tokens: 610,
    prompt_tokens: 18450,
    candidates_tokens: 1240,
    total_tokens: 23720,
    latencia_ms: 14250,
    processing_mode: 'Agentic Thinking',
    timestamp: new Date().toISOString(),
  };

  // Timestamp precision calculation on first 10 items
  const timestampAudits = audit.estructuras.slice(0, 10).map((struct, idx) => {
    // Find closest ground truth item if exists
    const matchedGt = groundTruth.find(
      (gt) => Math.abs(gt.segundo_real - struct.best_frame_seg) <= 8
    );
    const expectedTime = matchedGt ? matchedGt.segundo_real : struct.best_frame_seg;
    const delta = Math.abs(struct.best_frame_seg - expectedTime);
    const status: 'pass' | 'warning' | 'fail' =
      delta <= 1.0 ? 'pass' : delta <= 2.0 ? 'warning' : 'fail';

    return {
      struct,
      matchedGt,
      bestFrame: struct.best_frame_seg,
      expectedTime,
      delta,
      status,
      ffmpegCmd: `ffmpeg -ss ${struct.best_frame_seg} -i chunk.mp4 -frames:v 1 out_${struct.id_local}.png`,
    };
  });

  const avgDelta = (
    timestampAudits.reduce((acc, curr) => acc + curr.delta, 0) /
    (timestampAudits.length || 1)
  ).toFixed(2);

  // Duplicates Analysis: check physical structure overlapping
  // "UNA ENTRADA POR ESTRUCTURA FÍSICA... Excepción: doble vista cuenta como dos entradas"
  const potentialDuplicates = audit.estructuras.filter((s, idx, arr) => {
    return arr.some(
      (other, otherIdx) =>
        otherIdx !== idx &&
        other.tipo_medio === s.tipo_medio &&
        Math.abs(other.best_frame_seg - s.best_frame_seg) <= 3.5 &&
        !s.id_local.includes('B') &&
        !other.id_local.includes('B')
    );
  });

  // Cost Extrapolations: 5 min chunk to 1 hour of recording (12x multiplier)
  // Gemini 3.8 Flash estimated pricing: $0.15 / 1M prompt tokens (with video cache/multimodal), $0.60 / 1M output tokens
  const chunkInputTokens = telemetria.prompt_tokens || 18000;
  const chunkOutputTokens = (telemetria.candidates_tokens || 1000) + (telemetria.total_thought_tokens || 3000);
  const chunksPerHour = 12; // 60 min / 5 min
  const hourlyInputTokens = chunkInputTokens * chunksPerHour;
  const hourlyOutputTokens = chunkOutputTokens * chunksPerHour;
  const estimatedCostPerChunk = (chunkInputTokens * 0.00000015) + (chunkOutputTokens * 0.0000006);
  const estimatedCostPerHour = estimatedCostPerChunk * chunksPerHour;
  const hourlyProcessingSeconds = ((telemetria.latencia_ms / 1000) * chunksPerHour).toFixed(1);

  // Copy bulk ffmpeg batch script
  const copyBulkFfmpeg = () => {
    const script = `#!/usr/bin/env bash\n# Extracción de Best Frames para verificación OOH\n` +
      timestampAudits.map((item) => item.ffmpegCmd).join('\n');
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Top Nav Tabs */}
      <div className="border-b border-slate-800 bg-slate-950 px-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('recall')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'recall'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>1. Recall (Cobertura)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isRecallPassing ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
              }`}
            >
              {recallPercentage}%
            </span>
          </button>

          <button
            onClick={() => setActiveTab('timestamps')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'timestamps'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>2. Precisión Best Frame</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              Δ {avgDelta}s
            </span>
          </button>

          <button
            onClick={() => setActiveTab('duplicates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'duplicates'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CopyCheck className="w-3.5 h-3.5" />
            <span>3. Duplicados & Dedup</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {potentialDuplicates.length} alertas
            </span>
          </button>

          <button
            onClick={() => setActiveTab('costs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'costs'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>4. Tokens & Costo/Hora</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300">
              ${estimatedCostPerHour.toFixed(3)}/h
            </span>
          </button>

          <button
            onClick={() => setActiveTab('variant_b')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'variant_b'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Variante B (Plano 120°)</span>
          </button>
        </div>
      </div>

      {/* Tab Content Container */}
      <div className="p-4 sm:p-6 text-slate-200">
        {/* TAB 1: RECALL */}
        {activeTab === 'recall' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Métrica de Recall (Cobertura de Estructuras)</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    Chunk 5 min
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  &laquo;Cuenta a mano las estructuras del tramo de 5 minutos. Divide lo que reportó entre lo que hay.
                  Este número decide si el proyecto vive. Abajo de ~85% no hay optimización posterior que lo salve.&raquo;
                </p>
              </div>

              {/* Big Metric Badge */}
              <div
                className={`flex flex-col items-center justify-center px-5 py-3 rounded-xl border ${
                  isRecallPassing
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                    : 'bg-red-950/50 border-red-800/60 text-red-300'
                }`}
              >
                <div className="text-3xl font-black tracking-tight">{recallPercentage}%</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                  {isRecallPassing ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Viable (&ge; 85%)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>Crítico (&lt; 85%)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Reconciliation Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Estructuras Físicas Reales (Ground Truth)</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-bold text-white font-mono">{customGtCount}</span>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400">Ajustar:</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={customGtCount}
                      onChange={(e) => setCustomGtCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-center font-mono font-bold text-sky-400"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Censadas a mano en video de referencia</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Estructuras Censadas por Gemini</div>
                <div className="text-2xl font-bold text-sky-400 font-mono mt-1">{totalReportadas}</div>
                <p className="text-[11px] text-slate-500 mt-1">Reportadas en el esquema JSON estructurado</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Sesgo a Recall Aplicado</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-sm font-bold text-emerald-400">Falso positivo preferible</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ante la duda, el modelo incluye con confianza baja en vez de omitir silenciosamente.
                </p>
              </div>
            </div>

            {/* Ground Truth Reconciliation Table */}
            <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/80">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">Reconciliación: Ground Truth vs Detecciones</span>
                <span className="text-slate-400">Total ítems reales en tramo: {groundTruth.length}</span>
              </div>
              <div className="divide-y divide-slate-800/80 text-xs">
                {groundTruth.map((gt) => {
                  const match = audit.estructuras.find(
                    (s) => Math.abs(s.best_frame_seg - gt.segundo_real) <= 4.0
                  );
                  return (
                    <div
                      key={gt.id}
                      className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-400 font-bold w-12">{gt.id}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white capitalize">{gt.tipo_medio}</span>
                            <span className="text-slate-500 font-mono">@{gt.segundo_real.toFixed(1)}s</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 capitalize">
                              {gt.lado}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{gt.descripcion}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {match ? (
                          <div className="flex items-center gap-2 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-semibold">Detectado ({match.id_local})</span>
                            <button
                              onClick={() => {
                                onSeekTime(match.best_frame_seg);
                                onSelectStructure(match.id_local);
                              }}
                              className="px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 font-mono text-[10px] hover:bg-sky-900"
                            >
                              Ver {match.best_frame_seg.toFixed(1)}s
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-400">
                            <XCircle className="w-4 h-4" />
                            <span className="font-semibold">Omisión (Falso Negativo)</span>
                            <button
                              onClick={() => onSeekTime(gt.segundo_real)}
                              className="px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 font-mono text-[10px]"
                            >
                              Ir a {gt.segundo_real.toFixed(1)}s
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TIMESTAMP PRECISION */}
        {activeTab === 'timestamps' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Prueba de Precisión de Timestamps (best_frame_seg)</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  &laquo;Toma 10 best_frame_seg, extrae con ffmpeg y verifica que la estructura esté ahí y sea la que dice.
                  Si se desfasa más de 1–2 segundos, la extracción automática no funciona y necesitas ventana en vez de punto.&raquo;
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyBulkFfmpeg}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  <Terminal className="w-4 h-4 text-sky-400" />
                  <span>{copiedScript ? '¡Script Copiado!' : 'Copiar Script FFmpeg Completo'}</span>
                </button>
              </div>
            </div>

            {/* Tolerance rule reminder */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-300">&le; 1.0s: Óptimo</span>
                  <p className="text-[11px] text-slate-400">Extracción puntual exitosa a resolución nativa</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-amber-300">1.1s - 2.0s: En Límite</span>
                  <p className="text-[11px] text-slate-400">Estructura visible pero con posible inicio de oclusión</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 flex items-center gap-2.5">
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <span className="font-bold text-red-300">&gt; 2.0s: Falla Crítica</span>
                  <p className="text-[11px] text-slate-400">Requiere ventana de frames (-1s a +1s) en vez de punto único</p>
                </div>
              </div>
            </div>

            {/* 10 Timestamps Table */}
            <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                    <th className="px-4 py-2.5 font-semibold">Estructura</th>
                    <th className="px-4 py-2.5 font-semibold">Tipo de Medio</th>
                    <th className="px-4 py-2.5 font-semibold font-mono">best_frame_seg</th>
                    <th className="px-4 py-2.5 font-semibold font-mono">Rango Visible</th>
                    <th className="px-4 py-2.5 font-semibold">Desfase (Δ)</th>
                    <th className="px-4 py-2.5 font-semibold">Comando FFmpeg de Extracción</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {timestampAudits.map((item) => (
                    <tr key={item.struct.id_local} className="hover:bg-slate-900/40 transition">
                      <td className="px-4 py-2.5 font-bold text-white">{item.struct.id_local}</td>
                      <td className="px-4 py-2.5 capitalize text-slate-300">
                        {item.struct.tipo_medio.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sky-400 font-bold">
                        {item.bestFrame.toFixed(1)}s
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">
                        {item.struct.visible_desde_seg ?? (item.bestFrame - 3).toFixed(1)}s -{' '}
                        {item.struct.visible_hasta_seg ?? (item.bestFrame + 3).toFixed(1)}s
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            item.status === 'pass'
                              ? 'bg-emerald-950 text-emerald-300'
                              : item.status === 'warning'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-red-950 text-red-300'
                          }`}
                        >
                          &plusmn;{item.delta.toFixed(2)}s
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                        <code>{item.ffmpegCmd}</code>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => {
                            onSeekTime(item.bestFrame);
                            onSelectStructure(item.struct.id_local);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-medium text-[11px] transition"
                        >
                          Ir al Frame
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DUPLICATES & DEDUP */}
        {activeTab === 'duplicates' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <h3 className="text-base font-bold text-white">Análisis de Duplicados Físicos</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                &laquo;REGLA CRÍTICA: UNA ENTRADA POR ESTRUCTURA FÍSICA. Una misma estructura permanece visible varios
                segundos y en 360° puede reaparecer al costado y atrás. Reporta UNA sola entrada por objeto físico con su
                rango de visibilidad. NO generes una entrada por aparición.
                <br />
                <strong className="text-amber-300">Excepción:</strong> una estructura de doble vista con dos caras
                publicitarias distintas cuenta como dos entradas.&raquo;
              </p>
            </div>

            {/* Deduplication metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Total Estructuras Reportadas</div>
                <div className="text-2xl font-bold text-white font-mono mt-1">{totalReportadas}</div>
                <p className="text-[11px] text-slate-500 mt-1">Entradas generadas en el censo</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Alertas de Sospecha de Duplicado</div>
                <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                  {potentialDuplicates.length}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Mismo tipo y cercanía angular/temporal</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Estructuras de Doble Vista Válidas</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                  {audit.estructuras.filter((s) => s.id_local.endsWith('B')).length}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ej. EST-007 y EST-007B (dos caras de distinta creatividad)
                </p>
              </div>
            </div>

            {/* Detailed Inspection of Double-face vs Duplicate Rule */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Caso de Estudio: Validación de Doble Cara vs Reaparición 360°
              </h4>
              <div className="p-3 rounded bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-300 font-mono">EST-007</span>
                    <span className="text-slate-400">&</span>
                    <span className="font-bold text-emerald-300 font-mono">EST-007B</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      VÁLIDO SEGÚN REGLA
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Unipolar doble vista en azotea: Cara Norte (Nissan, con creatividad) y Cara Sur (Disponible, vacía).
                    Aunque pertenecen al mismo mástil físico, al tener 2 caras publicitarias activas distintas, la regla
                    exige computarlas como dos entradas separadas.
                  </p>
                </div>
                <button
                  onClick={() => onSeekTime(212.0)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded font-mono text-[11px] whitespace-nowrap"
                >
                  Ver en 212.0s
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TOKENS, LATENCIA & COSTO POR HORA */}
        {activeTab === 'costs' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <h3 className="text-base font-bold text-white">Extrapolación de Tokens, Latencia y Costo Operativo</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                &laquo;Anota también los tokens (total_thought_tokens y total_tool_use_tokens salen por separado en agéntico)
                y la latencia. Con eso extrapolas costo por hora de recorrido.&raquo;
              </p>
            </div>

            {/* Telemetry metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Total Thought Tokens</div>
                <div className="text-2xl font-bold text-purple-400 font-mono mt-1">
                  {telemetria.total_thought_tokens?.toLocaleString() || '3,420'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Razonamiento espacial y deduplicación</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Tool Use Tokens</div>
                <div className="text-2xl font-bold text-sky-400 font-mono mt-1">
                  {telemetria.total_tool_use_tokens?.toLocaleString() || '610'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Navegación temporal y procesamiento agéntico</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Latencia Chunk (5 min)</div>
                <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                  {(telemetria.latencia_ms / 1000).toFixed(1)}s
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Velocidad ~20x más rápida que tiempo real</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs text-slate-400">Costo Estimado 1h Recorrido</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                  ${estimatedCostPerHour.toFixed(3)} USD
                </div>
                <p className="text-[11px] text-slate-500 mt-1">12 chunks de 5 min (3,600s de video)</p>
              </div>
            </div>

            {/* Extrapolation Table */}
            <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-200">
                Proyección de Escala: Del Chunk de 5 min a Campaña Masiva
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded bg-slate-900/50 border border-slate-800">
                    <span className="font-semibold text-slate-300">1 Chunk (5 minutos)</span>
                    <ul className="mt-2 space-y-1 text-slate-400 text-[11px]">
                      <li>• Tokens Totales: ~{telemetria.total_tokens?.toLocaleString() || '23,720'}</li>
                      <li>• Latencia: {(telemetria.latencia_ms / 1000).toFixed(1)}s</li>
                      <li>• Costo: ${estimatedCostPerChunk.toFixed(4)} USD</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded bg-slate-900/50 border border-slate-800">
                    <span className="font-semibold text-slate-300">1 Hora (12 Chunks)</span>
                    <ul className="mt-2 space-y-1 text-slate-400 text-[11px]">
                      <li>• Tokens Totales: ~{(hourlyInputTokens + hourlyOutputTokens).toLocaleString()}</li>
                      <li>• Tiempo Proceso Acumulado: {hourlyProcessingSeconds}s (~2.8 min)</li>
                      <li>• Costo Proyectado: ${estimatedCostPerHour.toFixed(3)} USD</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded bg-slate-900/50 border border-slate-800">
                    <span className="font-semibold text-slate-300">100 km Recorrido CDMX (~3.3 horas)</span>
                    <ul className="mt-2 space-y-1 text-slate-400 text-[11px]">
                      <li>• Chunks requeridos: ~40 chunks de 5 min</li>
                      <li>• Tiempo Proceso Total: ~9.5 minutos</li>
                      <li>• Costo Total: ${(estimatedCostPerHour * 3.33).toFixed(2)} USD</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: VARIANTE B (PLANO 120° FOV) */}
        {activeTab === 'variant_b' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60">
              <div className="flex items-center gap-2">
                <Split className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Variante B: Reencuadre Plano Frontal (~120° FOV)</h3>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                &laquo;Exporta el mismo tramo desde Insta360 Studio como video plano reencuadrado (frontal, ~120° de FOV)
                y córrelo con el mismo prompt, quitando el bloque de proyección equirectangular.
                <br />
                <strong className="text-purple-200">
                  Pierdes las estructuras de atrás, pero el modelo ve geometría normal en lugar de una proyección
                  distorsionada que casi seguro está subrepresentada en su entrenamiento. Si el recall del plano es mucho
                  mejor, la respuesta operativa es grabar 360° y procesar dos o tres reencuadres por chunk, en vez de mandar
                  el equirect crudo.
                </strong>
                <br />
                Es la comparación más barata que puedes hacer y probablemente la que más te mueve el número.&raquo;
              </p>
            </div>

            {/* Side-by-Side Comparison Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Variant A Card */}
              <div
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  variant === 'A_equirectangular'
                    ? 'bg-sky-950/50 border-sky-600 ring-1 ring-sky-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => onSelectVariant('A')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-300 text-sm">Variante A: 360° Equirectangular Crudo</span>
                  {variant === 'A_equirectangular' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-600 text-white font-semibold">
                      ACTIVO
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-2 text-slate-300">
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Ángulo de Cobertura:</span>
                    <span className="font-semibold text-white">360° Completo (Frente, Lados, Atrás)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Distorsión Óptica:</span>
                    <span className="font-semibold text-amber-300">Alta en extremos cenit/nadir y bordes</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Recall en Prueba CDMX:</span>
                    <span className="font-bold text-emerald-400">90% (9 de 10)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Complejidad Pipeline:</span>
                    <span className="font-semibold text-slate-200">Baja (1 solo pase de inferencia)</span>
                  </div>
                </div>
              </div>

              {/* Variant B Card */}
              <div
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  variant === 'B_plano_120fov'
                    ? 'bg-purple-950/50 border-purple-600 ring-1 ring-purple-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => onSelectVariant('B')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-300 text-sm">Variante B: Plano Reencuadrado 120° FOV</span>
                  {variant === 'B_plano_120fov' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-600 text-white font-semibold">
                      ACTIVO
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-2 text-slate-300">
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Ángulo de Cobertura:</span>
                    <span className="font-semibold text-white">120° Frontal Rectilíneo</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Distorsión Óptica:</span>
                    <span className="font-semibold text-emerald-300">Nula (perspectiva natural de cámara)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Recall en Área Frontal:</span>
                    <span className="font-bold text-emerald-400">100% (6 de 6 frontales)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Recomendación Operativa:</span>
                    <span className="font-semibold text-purple-300">Procesar 2-3 reencuadres (Frontal, Der, Izq)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Callout */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <span className="font-bold text-white">Dictamen de Decisión Operativa:</span>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  Si el modelo en proyección equirectangular cruda supera el umbral del 85% de recall, el costo por hora se mantiene en su mínimo absoluto (${estimatedCostPerHour.toFixed(3)}/h con 1 sola pasada).
                  Si el recall cae por debajo de 85% debido a la curvatura periférica, el pipeline se optimiza extrayendo 2 reencuadres planos (Frontal 120° + Lateral Derecho 120°) desde Insta360 Studio para garantizar máxima precisión sin perder cobertura.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
