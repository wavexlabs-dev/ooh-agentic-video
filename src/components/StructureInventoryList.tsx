import React, { useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Tag,
  Download,
} from 'lucide-react';
import { EstructuraPublicitaria, TipoMedio } from '../types';

interface StructureInventoryListProps {
  structures: EstructuraPublicitaria[];
  activeStructureId: string | null;
  onSelectStructure: (id: string) => void;
  onSeekTime: (seconds: number) => void;
}

export const StructureInventoryList: React.FC<StructureInventoryListProps> = ({
  structures,
  activeStructureId,
  onSelectStructure,
  onSeekTime,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [filterCreatividad, setFilterCreatividad] = useState<'todos' | 'con_creatividad' | 'disponible'>('todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = structures.filter((s) => {
    const matchesSearch =
      s.id_local.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.texto_legible && s.texto_legible.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.nota && s.nota.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedType === 'todos' || s.tipo_medio === selectedType;

    const matchesCreatividad =
      filterCreatividad === 'todos' ||
      (filterCreatividad === 'con_creatividad' && s.hay_creatividad) ||
      (filterCreatividad === 'disponible' && !s.hay_creatividad);

    return matchesSearch && matchesType && matchesCreatividad;
  });

  const copyFfmpeg = (e: React.MouseEvent, s: EstructuraPublicitaria) => {
    e.stopPropagation();
    const cmd = `ffmpeg -ss ${s.best_frame_seg} -i chunk.mp4 -frames:v 1 out_${s.id_local}.png`;
    navigator.clipboard.writeText(cmd);
    setCopiedId(s.id_local);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCsv = () => {
    const headers = [
      'id_local',
      'best_frame_seg',
      'visible_desde_seg',
      'visible_hasta_seg',
      'tipo_medio',
      'lado',
      'hay_creatividad',
      'texto_legible',
      'confianza_deteccion',
      'confianza_tipo_medio',
      'bbox_1000',
    ];
    const rows = filtered.map((s) => [
      s.id_local,
      s.best_frame_seg,
      s.visible_desde_seg ?? '',
      s.visible_hasta_seg ?? '',
      s.tipo_medio,
      s.lado ?? '',
      s.hay_creatividad ? 'TRUE' : 'FALSE',
      `"${(s.texto_legible || '').replace(/"/g, '""')}"`,
      s.confianza_deteccion,
      s.confianza_tipo_medio ?? '',
      `"[${(s.bbox_1000 || []).join(',')}]"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `censo_ooh_estructuras_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
      {/* Header & Filters */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Inventario de Estructuras Censadas
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-sky-950 border border-sky-800 text-sky-300 text-xs font-mono font-bold">
              {filtered.length} / {structures.length}
            </span>
          </div>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            title="Exportar inventario en formato CSV para SIG / GIS"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID, marca leída, tipo de medio o nota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-hidden"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="espectacular">Espectacular</option>
            <option value="pantalla_digital">Pantalla Digital</option>
            <option value="valla">Valla</option>
            <option value="parabus">Parabús</option>
            <option value="mupi">Mupi</option>
            <option value="muro">Muro</option>
            <option value="puente">Puente</option>
            <option value="totem">Tótem</option>
            <option value="mobiliario_urbano">Mobiliario Urbano</option>
          </select>

          <select
            value={filterCreatividad}
            onChange={(e) => setFilterCreatividad(e.target.value as any)}
            className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-hidden"
          >
            <option value="todos">Estado Comercial (Todos)</option>
            <option value="con_creatividad">Con Creatividad (Activo)</option>
            <option value="disponible">Estructura Disponible (Vacía)</option>
          </select>
        </div>
      </div>

      {/* Cards List */}
      <div className="p-3 overflow-y-auto space-y-2.5 max-h-[580px]">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No se encontraron estructuras que coincidan con los filtros.
          </div>
        ) : (
          filtered.map((s) => {
            const isSelected = s.id_local === activeStructureId;
            return (
              <div
                key={s.id_local}
                onClick={() => {
                  onSelectStructure(s.id_local);
                  onSeekTime(s.best_frame_seg);
                }}
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-850 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-mono text-xs">{s.id_local}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-200">
                      {s.tipo_medio.replace('_', ' ')}
                    </span>
                    {s.lado && (
                      <span className="text-[10px] text-slate-400 capitalize bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {s.lado}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      s.hay_creatividad
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                        : 'bg-amber-950 text-amber-300 border border-amber-800/80'
                    }`}
                  >
                    {s.hay_creatividad ? 'Con Creatividad' : 'Disponible / Vacía'}
                  </span>
                </div>

                {/* Timestamps & Confidence */}
                <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 font-mono text-sky-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>best_frame: <strong>{s.best_frame_seg.toFixed(1)}s</strong></span>
                    </div>

                    <span className="text-slate-600">|</span>

                    <span className="text-[11px] font-mono text-slate-400">
                      visibilidad: {s.visible_desde_seg ?? (s.best_frame_seg - 3).toFixed(1)}s -{' '}
                      {s.visible_hasta_seg ?? (s.best_frame_seg + 3).toFixed(1)}s
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span>Confianza:</span>
                    <span className="font-bold text-emerald-400">{s.confianza_deteccion}%</span>
                  </div>
                </div>

                {/* Text OCR read */}
                {s.texto_legible && (
                  <div className="mt-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800/80 text-xs flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Texto Leído (OCR sin inferencia):</span>
                    <span className="font-semibold text-emerald-300 font-mono">
                      &quot;{s.texto_legible}&quot;
                    </span>
                  </div>
                )}

                {/* Bbox normalized coordinate pill */}
                {s.bbox_1000 && (
                  <div className="mt-1.5 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                    <span>bbox_1000: [{s.bbox_1000.join(', ')}]</span>
                    <button
                      onClick={(e) => copyFfmpeg(e, s)}
                      title="Copiar comando de extracción FFmpeg"
                      className="flex items-center gap-1 text-slate-400 hover:text-sky-300 transition"
                    >
                      {copiedId === s.id_local ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>ffmpeg cmd</span>
                    </button>
                  </div>
                )}

                {s.nota && (
                  <p className="mt-1.5 text-[11px] text-slate-400 italic">
                    {s.nota}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
