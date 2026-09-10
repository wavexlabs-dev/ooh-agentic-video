import React, { useState } from 'react';
import { X, Copy, Check, Download, FileJson, ShieldCheck } from 'lucide-react';
import { AuditoriaOOHResponse } from '../types';
import { OOH_RESPONSE_SCHEMA_JSON } from '../data/sampleAudits';

interface JsonViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: AuditoriaOOHResponse;
}

export const JsonViewerModal: React.FC<JsonViewerModalProps> = ({
  isOpen,
  onClose,
  audit,
}) => {
  const [activeTab, setActiveTab] = useState<'output' | 'schema'>('output');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const contentToDisplay =
    activeTab === 'output'
      ? JSON.stringify(audit, null, 2)
      : JSON.stringify(OOH_RESPONSE_SCHEMA_JSON, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(contentToDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = activeTab === 'output' ? 'censo_ooh_resultado.json' : 'ooh_response_schema.json';
    const blob = new Blob([contentToDisplay], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileJson className="w-5 h-5 text-sky-400" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('output')}
                className={`text-xs font-semibold px-3 py-1 rounded-md transition ${
                  activeTab === 'output'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Respuesta Estructurada JSON (Censo)
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`text-xs font-semibold px-3 py-1 rounded-md transition ${
                  activeTab === 'schema'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Esquema JSON (AI Studio Configuration)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-950 flex-1">
          <pre className="whitespace-pre-wrap leading-relaxed">{contentToDisplay}</pre>
        </div>
      </div>
    </div>
  );
};
