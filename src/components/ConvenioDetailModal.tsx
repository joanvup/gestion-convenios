import { useState } from 'react';
import { X, Calendar, User, DollarSign, Clock, ShieldCheck, Activity, Mail } from 'lucide-react';
import { Convenio } from '../types';

interface ConvenioDetailModalProps {
  convenio: Convenio;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
}

type TabType = 'general' | 'investigacion' | 'financiero' | 'fechas' | 'suspensiones';

export default function ConvenioDetailModal({ convenio, onClose, onEdit, canEdit }: ConvenioDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');

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
            { id: 'suspensiones', label: 'Suspensiones', icon: Activity }
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
              {renderField('Correo Electrónico del Área Responsable', convenio.correo_responsable)}
            </div>
          )}

          {activeTab === 'investigacion' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {renderField('Investigador Principal', convenio.investigador_principal)}
              {renderField('Documento de Identidad (Cédula)', convenio.cedula)}
              {renderField('Correo del Investigador', convenio.correo_investigador)}
              {renderField('Coinvestigador', convenio.coinvestigador)}
              {renderField('Grupo de Investigación', convenio.grupo)}
              {renderField('Código del Grupo', convenio.codigo_grupo)}
              {renderField('Categoría del Grupo', convenio.categoria)}
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
