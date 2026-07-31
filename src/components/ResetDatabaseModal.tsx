import React, { useState, useRef } from 'react';
import { Download, Upload, Database, AlertTriangle, Trash2, X, RefreshCw, ShieldAlert, Check, FileText } from 'lucide-react';

interface ResetDatabaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

export default function ResetDatabaseModal({ onClose, onSuccess, token }: ResetDatabaseModalProps) {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'reset'>('backup');
  
  // Backup state
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const REQUIRED_CONFIRMATION = 'INICIALIZAR';

  // Handler for downloading database backup
  const handleDownloadBackup = async () => {
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      const res = await fetch('/api/admin/backup-database', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al descargar respaldo de la base de datos.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `backup_convenios_${dateStr}.db`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadSuccess(true);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'No se pudo descargar el archivo de respaldo.'));
    } finally {
      setDownloading(false);
    }
  };

  // Handler for restoring database backup
  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setRestoreError('Por favor selecciona un archivo .db válido.');
      return;
    }

    setRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);

          const res = await fetch('/api/admin/restore-database', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fileData: base64 })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Error al restaurar la base de datos.');
          }

          setRestoreSuccess(true);
          onSuccess();
        } catch (err: any) {
          setRestoreError(err.message || 'Error al procesar el archivo de respaldo.');
        } finally {
          setRestoring(false);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (err: any) {
      setRestoreError('Error al leer el archivo de la base de datos.');
      setRestoring(false);
    }
  };

  // Handler for resetting database
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== REQUIRED_CONFIRMATION) {
      setResetError(`Debes escribir exactamente la palabra "${REQUIRED_CONFIRMATION}" para confirmar la acción.`);
      return;
    }

    setResetting(true);
    setResetError(null);

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
      setResetError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setResetting(false);
    }
  };

  const isConfirmed = confirmText.trim().toUpperCase() === REQUIRED_CONFIRMATION;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-indigo-100 bg-indigo-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Gestión y Respaldo de Base de Datos
              </h2>
              <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                Copia de seguridad, restauración e inicialización SQLite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-indigo-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 border-x border-slate-200/80 shadow-2xs'
                : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Respaldo</span>
          </button>

          <button
            onClick={() => setActiveTab('restore')}
            className={`px-3.5 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'restore'
                ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 border-x border-slate-200/80 shadow-2xs'
                : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restaurar BD</span>
          </button>

          <button
            onClick={() => setActiveTab('reset')}
            className={`px-3.5 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-1.5 ml-auto ${
              activeTab === 'reset'
                ? 'bg-white text-rose-700 border-t-2 border-rose-600 border-x border-slate-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-rose-600'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Inicializar</span>
          </button>
        </div>

        {/* TAB 1: DESCARGAR RESPALDO (.db) */}
        {activeTab === 'backup' && (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Database className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Copia de Seguridad del Sistema SQLite (.db)</span>
              </div>
              <p className="text-xs text-indigo-900/90 leading-relaxed font-medium">
                Descarga un archivo físico independiente con la extensión <strong>.db</strong> que contiene todos los convenios, catálogos, configuraciones e historial actual del sistema.
              </p>
            </div>

            {downloadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡El archivo de respaldo (.db) se ha descargado correctamente!</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500">
                Formato: SQLite DB v3 (.db)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={downloading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-2xs flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  {downloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generando Respaldo...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Descargar Respaldo (.db)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESTAURAR DESDE ARCHIVO RESPALDO (.db) */}
        {activeTab === 'restore' && (
          <form onSubmit={handleRestoreBackup} className="p-6 space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Advertencia de Restauración</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                Al subir un archivo de respaldo <strong>.db</strong>, la base de datos actual será reemplazada completamente por los datos guardados en dicho archivo.
              </p>
            </div>

            {restoreError && (
              <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs rounded-xl font-medium">
                {restoreError}
              </div>
            )}

            {restoreSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡Base de datos restaurada con éxito! La información ha sido actualizada.</span>
              </div>
            )}

            {/* File Input Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Selecciona el archivo de respaldo SQLite (.db):
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/70 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center"
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  accept=".db,.sqlite,.sqlite3"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setRestoreError(null);
                      setRestoreSuccess(false);
                    }
                  }}
                />
                
                {selectedFile ? (
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700">Haz clic para buscar tu archivo .db</span>
                    <span className="text-[10px] text-slate-400">Soporta backups creados por la aplicación (.db)</span>
                  </>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={restoring}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!selectedFile || restoring}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {restoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restaurando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Restaurar Base de Datos</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: INICIALIZAR EN BLANCO */}
        {activeTab === 'reset' && (
          <form onSubmit={handleReset} className="p-6 space-y-4">
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

            {resetError && (
              <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs rounded-xl font-medium">
                {resetError}
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
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={resetting}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isConfirmed || resetting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {resetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Inicializando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Inicializar BD</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
