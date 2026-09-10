import React from 'react';
import { Bot, Cpu, Sparkles, Sliders, ShieldCheck, Video } from 'lucide-react';

interface HeaderProps {
  hasApiKey: boolean;
  activeVariant: 'A' | 'B';
  onSelectVariant: (v: 'A' | 'B') => void;
  onOpenRawJson: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasApiKey,
  activeVariant,
  onSelectVariant,
  onOpenRawJson,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & Main Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-inner text-white font-bold">
              <Video className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Auditor OOH 360° <span className="text-sky-400 font-normal">| Censo AI Exterior</span>
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  México Street-Level
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auditoría de inventario publicitario OOH en video 360° vehicular • Regla de 5 min
              </p>
            </div>
          </div>

          {/* AI Studio Configuration Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700 text-xs">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400">Modelo:</span>
              <span className="font-semibold text-sky-300">gemini-3.8-flash</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700 text-xs">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Video:</span>
              <span className="font-semibold text-emerald-300">Agentic</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700 text-xs">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Temp:</span>
              <span className="font-semibold text-amber-300">0</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">Thinking:</span>
              <span className="font-semibold text-purple-300">Activado</span>
            </div>

            <button
              onClick={onOpenRawJson}
              id="btn-view-schema"
              className="px-3 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition"
            >
              Schema JSON
            </button>
          </div>
        </div>

        {/* Experiment Prompt Banner */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-medium text-amber-300 bg-amber-950/70 border border-amber-800/50 px-2 py-0.5 rounded">
              🎯 Chunk de 5 minutos
            </span>
            <span>«El objetivo es medir, no cubrir. Umbral mínimo de viabilidad: 85% de Recall.»</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">Experimento:</span>
            <div className="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-800">
              <button
                onClick={() => onSelectVariant('A')}
                className={`px-2.5 py-0.5 text-xs rounded font-medium transition ${
                  activeVariant === 'A'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Var. A (360° Equirect)
              </button>
              <button
                onClick={() => onSelectVariant('B')}
                className={`px-2.5 py-0.5 text-xs rounded font-medium transition ${
                  activeVariant === 'B'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Var. B (Plano 120° FOV)
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
