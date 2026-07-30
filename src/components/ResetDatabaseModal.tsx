import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, RefreshCw, ShieldAlert, Check } from 'lucide-react';

interface ResetDatabaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

export default function ResetDatabaseModal({ onClose, onSuccess, token }: ResetDatabaseModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const REQUIRED_CONFIRMATION = 'INICIALIZAR';

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== REQUIRED_CONFIRMATION) {
      setError(`Debes escribir exactamente la palabra "${REQUIRED_CONFIRMATION}" para confirmar la acción.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al reiniciar la base de datos');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const isConfirmed = confirmText.trim().toUpperCase() === REQUIRED_CONFIRMATION;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-rose-100 bg-rose-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Inicializar Base de Datos
              </h2>
              <p className="text-xs text-rose-700 font-semibold mt-0.5">
                Acción exclusiva de Administrador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-rose-100/80 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleReset} className="p-6 space-y-4">
          
          {/* Warning Box */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>¡ADVERTENCIA DE ACCIÓN DESTRUCTIVA!</span>
            </div>
            <p className="text-[11px] text-rose-900 leading-relaxed font-medium">
              Esta operación eliminará <strong>TODOS</strong> los convenios registrados, catálogos (Planes de Servicio, Facultades Responsables, Tipologías), alertas descartadas e historial previo de auditoría en la base de datos.
            </p>
            <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wide pt-1">
              • Esta acción es irreversible y no se puede deshacer.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Confirmation Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Para confirmar, escribe <span className="text-rose-600 font-mono font-extrabold">{REQUIRED_CONFIRMATION}</span> a continuación:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Escribe INICIALIZAR para confirmar"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || loading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-2xs flex items-center gap-1.5 active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Inicializando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Inicializar Base de Datos</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
