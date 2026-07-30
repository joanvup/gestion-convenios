import React, { useState, useEffect } from 'react';
import { 
  History, RefreshCw, Search, PlusCircle, Edit3, Trash2, UploadCloud, 
  User, ShieldCheck, Clock, FileText, AlertCircle 
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsProps {
  token: string;
}

export default function AuditLogs({ token }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/audit-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al cargar registros de auditoría');
      }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(query) ||
      log.user_name?.toLowerCase().includes(query) ||
      log.action?.toLowerCase().includes(query) ||
      log.details?.toLowerCase().includes(query) ||
      log.entity_id?.toLowerCase().includes(query)
    );
  });

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act === 'CREACION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <PlusCircle className="w-3 h-3 text-emerald-600" />
          CREACIÓN
        </span>
      );
    }
    if (act === 'EDICION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Edit3 className="w-3 h-3 text-blue-600" />
          EDICIÓN
        </span>
      );
    }
    if (act === 'ELIMINACION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <Trash2 className="w-3 h-3 text-rose-600" />
          ELIMINACIÓN
        </span>
      );
    }
    if (act === 'IMPORTACION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <UploadCloud className="w-3 h-3 text-purple-600" />
          IMPORTACIÓN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <FileText className="w-3 h-3" />
        {action}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                Auditoría del Sistema
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Últimos 20 cambios
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Historial de modificaciones recientes realizadas en la base de datos con responsable y marca de tiempo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Actualizar registro de auditoría"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 border-b border-slate-100 bg-white">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por usuario, acción o detalles de convenio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Main Content Table */}
      {error && (
        <div className="p-4 m-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && logs.length === 0 ? (
        <div className="p-12 text-center">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">Cargando registros de auditoría...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center bg-slate-50/30">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No se encontraron registros de auditoría</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {searchQuery ? 'Intenta modificar el término de búsqueda.' : 'Aún no se han registrado eventos de cambio en convenios.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3 min-w-[140px]">Fecha / Hora</th>
                <th className="px-4 py-3 min-w-[120px]">Acción</th>
                <th className="px-4 py-3 min-w-[180px]">Usuario Responsable</th>
                <th className="px-4 py-3 min-w-[300px]">Detalles del Cambio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Timestamp */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px]">{formatDate(log.created_at)}</span>
                    </div>
                  </td>

                  {/* Action Badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>

                  {/* User Responsable */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[11px] shrink-0">
                        {(log.user_name || log.user_email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-800 truncate text-xs">
                          {log.user_name || log.user_email}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {log.user_email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Details */}
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-slate-800 leading-snug">
                        {log.details}
                      </p>
                      {log.entity_id && (
                        <p className="text-[10px] font-mono text-slate-400">
                          Entidad ID: <span className="text-slate-600">{log.entity_id}</span>
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          Registros inmutables de auditoría de convenios
        </span>
        <span>
          Mostrando {filteredLogs.length} de {logs.length} eventos
        </span>
      </div>
    </div>
  );
}
