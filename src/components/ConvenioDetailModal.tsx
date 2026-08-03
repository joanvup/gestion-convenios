import { useState, useEffect } from 'react';
import { X, Calendar, User, DollarSign, Clock, ShieldCheck, Activity, Mail, History, ArrowRight } from 'lucide-react';
import { Convenio } from '../types';

interface ConvenioDetailModalProps {
  convenio: Convenio;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
}

type TabType = 'general' | 'investigacion' | 'financiero' | 'fechas' | 'suspensiones' | 'historial';

export default function ConvenioDetailModal({ convenio, onClose, onEdit, canEdit }: ConvenioDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const token = localStorage.getItem('convenios_token');
        const res = await fetch(`/api/convenios/${convenio.id}/status-history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        } else {
          setHistoryError('No se pudo cargar el historial de estados');
        }
      } catch (err) {
        console.error(err);
        setHistoryError('Error de red al cargar el historial');
      } finally {
        setIsLoadingHistory(false);
      }
    }
    fetchHistory();
  }, [convenio.id]);

  const getStatusBadgeStyle = (statusName: string) => {
    switch (statusName) {
      case 'Suspendido':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Vencido':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Vence Pronto (<30d)':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Próximo (<90d)':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Vigente':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Sin Fecha Fin':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || isNaN(val)) return 'No especificado';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  const getStatusLabel = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check suspension first
    if (convenio.fecha_suspension && !convenio.fecha_reinicio) {
      return { text: 'Suspendido', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    }

    let effectiveEndDate = convenio.fecha_terminacion;
    if (convenio.fecha_terminacion_prorroga) {
      effectiveEndDate = convenio.fecha_terminacion_prorroga;
    } else if (convenio.fecha_terminacion_ampliacion) {
      effectiveEndDate = convenio.fecha_terminacion_ampliacion;
    }

    if (!effectiveEndDate) {
      return { text: 'Sin Fecha Fin', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }

    const today = new Date(todayStr);
    const end = new Date(effectiveEndDate);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Vencido', bg: 'bg-red-100 text-red-800 border-red-200' };
    } else if (diffDays <= 30) {
      return { text: 'Vence Pronto (<30d)', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    } else if (diffDays <= 90) {
      return { text: 'Próximo (<90d)', bg: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    } else {
      return { text: 'Vigente', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  const status = getStatusLabel();

  const renderField = (label: string, value: string | number | null, fallback = 'No registrado') => {
    const displayValue = value === null || value === '' ? fallback : String(value);
    return (
      <div className="border-b border-slate-50 pb-2.5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 whitespace-pre-wrap">{displayValue}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="space-y-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                {convenio.codigo}
              </span>
              <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${status.bg}`}>
                {status.text}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              {convenio.titulo_proyecto}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-1">
          {[
            { id: 'general', label: 'Identificación', icon: Calendar },
            { id: 'investigacion', label: 'Investigación', icon: User },
            { id: 'financiero', label: 'Financiero', icon: DollarSign },
            { id: 'fechas', label: 'Fechas y Plazos', icon: Clock },
            { id: 'suspensiones', label: 'Suspensiones', icon: Activity },
            { id: 'historial', label: 'Historial de Estados', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all -mb-[1px] ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Content Grid */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {renderField('Código Interno', convenio.codigo)}
              {renderField('Número de Convenio', convenio.no_convenio)}
              {renderField('Plan de Servicio (Convocatoria)', convenio.plan_servicio)}
              {renderField('Tipología', convenio.tipologia)}
              {renderField('Facultad Responsable', convenio.facultad)}
              {renderField('Programa Académico', convenio.programa)}
            </div>
          )}

          {activeTab === 'investigacion' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {renderField('Investigador Principal', convenio.investigador_principal)}
              {renderField('Documento de Identidad (Cédula)', convenio.cedula)}
              {renderField('Correo del Investigador Principal', convenio.correo_investigador)}
              {renderField('Responsable del Proceso', convenio.responsable_proceso || convenio.coinvestigador)}
              {renderField('Cédula/Documento Responsable del Proceso', convenio.cedula_responsable_proceso)}
              {renderField('Correo Responsable del Proceso', convenio.correo_responsable_proceso)}
              {renderField('Grupo/Semillero/Jóvenes', convenio.grupo)}
              {renderField('Código del Grupo/Semillero/Jóvenes', convenio.codigo_grupo)}
              {renderField('Categoría del Grupo/Semillero/Jóvenes', convenio.categoria)}
            </div>
          )}

          {activeTab === 'financiero' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="border-b border-slate-50 pb-2.5 col-span-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Valor Financiado</p>
                <p className="text-base font-bold text-emerald-600 mt-0.5">{formatCurrency(convenio.valor)}</p>
              </div>
              {renderField('Duración Declarada', convenio.duracion)}
              {renderField('Valor en Letras', convenio.valor_letras, 'No registrado', )}
              {renderField('Disponibilidad Presupuestal No.', convenio.disponibilidad_presupuestal)}
              {renderField('Registro Presupuestal', convenio.registro_presupuestal)}
            </div>
          )}

          {activeTab === 'fechas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {renderField('Fecha de Inicio', convenio.fecha_inicio)}
              {renderField('Fecha de Terminación (Original)', convenio.fecha_terminacion)}
              {renderField('Primer Informe', convenio.primer_informe)}
              {renderField('Segundo Informe (Estado/Fecha)', convenio.segundo_informe)}
              {renderField('Acta de Aprobación de Póliza', convenio.acta_aprobacion_poliza)}
              
              <div className="col-span-1 md:col-span-2 mt-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Modificaciones y Prórrogas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderField('Fecha Acta Aprobación Ampliación Póliza', convenio.fecha_acta_aprobacion_ampliacion_poliza)}
                  {renderField('Fecha Terminación Después de la Ampliación', convenio.fecha_terminacion_ampliacion)}
                  {renderField('Fecha Terminación Después de la Prórroga (Final)', convenio.fecha_terminacion_prorroga)}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'suspensiones' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {renderField('Fecha de Suspensión', convenio.fecha_suspension, 'Sin suspensiones registradas')}
              {renderField('Fecha de Reinicio', convenio.fecha_reinicio, 'Sin fecha de reinicio registrada')}
              
              <div className="col-span-1 md:col-span-2 p-4 bg-slate-50 border border-slate-100 rounded-xl mt-2 text-xs text-slate-500 leading-relaxed">
                <p className="font-semibold text-slate-700 mb-1">Información de Suspensión:</p>
                Si el convenio se suspende, se detiene el cómputo de plazos hasta la fecha de reinicio. Se recomienda reflejar estas novedades modificando las fechas finales en la pestaña de &quot;Fechas y Plazos&quot; para mantener los vencimientos actualizados en las alertas automáticas.
              </div>
            </div>
          )}

          {activeTab === 'historial' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Ciclo de Vida del Convenio</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Historial cronológico de cambios de estado y novedades del convenio</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  {history.length} Evento{history.length !== 1 ? 's' : ''}
                </span>
              </div>

              {isLoadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-semibold">Cargando historial de estados...</p>
                </div>
              ) : historyError ? (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 text-center">
                  {historyError}
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No se han registrado cambios de estado para este convenio.
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 ml-3 py-2">
                  {history.map((event, idx) => {
                    const eventDate = event.created_at ? event.created_at.substring(0, 10) : 'N/A';
                    return (
                      <div key={event.id || idx} className="relative group">
                        {/* Timeline node icon */}
                        <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center transition-all group-hover:bg-indigo-600 group-hover:border-indigo-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 group-hover:bg-white"></div>
                        </div>

                        {/* Event Card */}
                        <div className="bg-slate-50 hover:bg-slate-100/70 border border-slate-100 hover:border-slate-200 p-4 rounded-xl transition-all shadow-3xs space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-bold text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded shadow-3xs">
                              {eventDate}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${getStatusBadgeStyle(event.old_status)}`}>
                                {event.old_status}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${getStatusBadgeStyle(event.new_status)}`}>
                                {event.new_status}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-slate-700 leading-relaxed">
                            {event.details}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>Modificado por: <strong className="text-slate-500">{event.changed_by_name || event.changed_by_email || 'Sistema'}</strong></span>
                            {event.changed_by_email && (
                              <span className="font-mono">{event.changed_by_email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-all"
          >
            Cerrar
          </button>
          {canEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              Editar Convenio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
