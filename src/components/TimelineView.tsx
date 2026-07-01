import { useState } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, ArrowRight, ClipboardCheck } from 'lucide-react';
import { Convenio } from '../types';

interface TimelineViewProps {
  convenios: Convenio[];
  onSelectConvenio: (id: number) => void;
}

interface Milestone {
  id: string;
  convenioId: number;
  codigo: string;
  titulo: string;
  tipo: 'vencimiento' | 'primer_informe' | 'suspension' | 'reinicio' | 'ampliacion';
  fecha: string;
  diasRestantes: number;
  label: string;
  descripcion: string;
}

export default function TimelineView({ convenios, onSelectConvenio }: TimelineViewProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Gather all future or recent milestones from convenios
  const milestones: Milestone[] = [];

  convenios.forEach(c => {
    // 1. Original Expiration or Prorroga Expiration
    if (c.fecha_terminacion_prorroga) {
      const date = new Date(c.fecha_terminacion_prorroga);
      const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      milestones.push({
        id: `prorroga-${c.id}`,
        convenioId: c.id,
        codigo: c.codigo,
        titulo: c.titulo_proyecto,
        tipo: 'vencimiento',
        fecha: c.fecha_terminacion_prorroga,
        diasRestantes: diff,
        label: 'Vencimiento (Prórroga)',
        descripcion: `Fecha límite de ejecución final prorrogada.`
      });
    } else if (c.fecha_terminacion_ampliacion) {
      const date = new Date(c.fecha_terminacion_ampliacion);
      const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      milestones.push({
        id: `ampliacion-${c.id}`,
        convenioId: c.id,
        codigo: c.codigo,
        titulo: c.titulo_proyecto,
        tipo: 'ampliacion',
        fecha: c.fecha_terminacion_ampliacion,
        diasRestantes: diff,
        label: 'Vencimiento (Ampliación)',
        descripcion: `Fecha de terminación posterior a ampliación de póliza.`
      });
    } else if (c.fecha_terminacion) {
      const date = new Date(c.fecha_terminacion);
      const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      milestones.push({
        id: `vencimiento-${c.id}`,
        convenioId: c.id,
        codigo: c.codigo,
        titulo: c.titulo_proyecto,
        tipo: 'vencimiento',
        fecha: c.fecha_terminacion,
        diasRestantes: diff,
        label: 'Vencimiento Original',
        descripcion: `Fecha límite estipulada originalmente.`
      });
    }

    // 2. Primer Informe
    if (c.primer_informe) {
      const date = new Date(c.primer_informe);
      const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      milestones.push({
        id: `informe1-${c.id}`,
        convenioId: c.id,
        codigo: c.codigo,
        titulo: c.titulo_proyecto,
        tipo: 'primer_informe',
        fecha: c.primer_informe,
        diasRestantes: diff,
        label: 'Entrega Primer Informe',
        descripcion: `Hito de entrega del reporte técnico/financiero inicial.`
      });
    }

    // 3. Suspensión / Reinicio
    if (c.fecha_suspension) {
      const date = new Date(c.fecha_suspension);
      const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      milestones.push({
        id: `suspension-${c.id}`,
        convenioId: c.id,
        codigo: c.codigo,
        titulo: c.titulo_proyecto,
        tipo: 'suspension',
        fecha: c.fecha_suspension,
        diasRestantes: diff,
        label: 'Fecha de Suspensión',
        descripcion: `Inicio de la suspensión temporal acordada.`
      });
    }

    if (c.fecha_reinicio) {
      const date = new Date(c.fecha_reinicio);
      const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      milestones.push({
        id: `reinicio-${c.id}`,
        convenioId: c.id,
        codigo: c.codigo,
        titulo: c.titulo_proyecto,
        tipo: 'reinicio',
        fecha: c.fecha_reinicio,
        diasRestantes: diff,
        label: 'Reinicio de Actividades',
        descripcion: `Reinicio oficial tras levantamiento de suspensión.`
      });
    }
  });

  // Sort milestones: future ones first, then past ones, sorted chronologically from nearest to farthest
  const sortedMilestones = milestones.sort((a, b) => {
    // If one is in the past and one is in the future, put future first
    if (a.diasRestantes >= 0 && b.diasRestantes < 0) return -1;
    if (a.diasRestantes < 0 && b.diasRestantes >= 0) return 1;
    // Otherwise sort chronologically (closer to today first for future, or recently expired first for past)
    return a.diasRestantes - b.diasRestantes;
  });

  // Filter based on selected filter Type
  const filteredMilestones = sortedMilestones.filter(m => {
    if (filterType === 'all') return true;
    if (filterType === 'upcoming') return m.diasRestantes >= 0 && m.diasRestantes <= 60;
    if (filterType === 'overdue') return m.diasRestantes < 0;
    if (filterType === 'reports') return m.tipo === 'primer_informe';
    if (filterType === 'deadlines') return m.tipo === 'vencimiento' || m.tipo === 'ampliacion';
    return true;
  });

  const getMilestoneBadge = (m: Milestone) => {
    if (m.diasRestantes < 0) {
      return { text: 'Cumplido/Vencido', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    } else if (m.diasRestantes <= 15) {
      return { text: '¡Urgente!', bg: 'bg-red-100 text-red-800 border-red-200' };
    } else if (m.diasRestantes <= 45) {
      return { text: 'Próximo', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    } else {
      return { text: 'Planificado', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'vencimiento':
      case 'ampliacion':
        return { icon: Clock, color: 'bg-rose-100 text-rose-700 border-rose-200' };
      case 'primer_informe':
        return { icon: ClipboardCheck, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      case 'suspension':
        return { icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 border-amber-200' };
      default:
        return { icon: Calendar, color: 'bg-sky-100 text-sky-700 border-sky-200' };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Cronograma y Vencimientos</h3>
            <p className="text-xs text-slate-500">Visualización temporal de plazos e informes</p>
          </div>
        </div>

        {/* Quick Filter Selectors */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'upcoming', label: 'Próximos 60 días' },
            { id: 'overdue', label: 'Históricos/Vencidos' },
            { id: 'reports', label: 'Informes' },
            { id: 'deadlines', label: 'Vencimientos' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                filterType === f.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filteredMilestones.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          No se encontraron hitos o vencimientos para este filtro.
        </div>
      ) : (
        <div className="relative border-l-2 border-indigo-100/80 pl-6 ml-3 py-2 space-y-6">
          {filteredMilestones.map((m) => {
            const badge = getMilestoneBadge(m);
            const style = getMilestoneIcon(m.tipo);
            const Icon = style.icon;

            return (
              <div key={m.id} className="relative group">
                {/* Timeline Dot with Icon */}
                <span className={`absolute -left-[38px] top-0 p-1.5 rounded-full border shadow-2xs ${style.color}`}>
                  <Icon className="w-4 h-4" />
                </span>

                <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        {m.codigo}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {m.label}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${badge.bg}`}>
                        {badge.text}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-1 max-w-[250px] md:max-w-[450px] truncate" title={m.titulo}>
                      {m.titulo}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 italic">
                      {m.descripcion} ({m.fecha})
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <p className="text-right">
                      <span className="block text-xs font-bold text-slate-700">
                        {m.fecha}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        {m.diasRestantes < 0
                          ? `Hace ${Math.abs(m.diasRestantes)} días`
                          : m.diasRestantes === 0
                          ? '¡Hoy!'
                          : `Faltan ${m.diasRestantes} días`}
                      </span>
                    </p>
                    <button
                      onClick={() => onSelectConvenio(m.convenioId)}
                      className="p-1 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-indigo-600 transition-all hover:shadow-2xs"
                      title="Ir al convenio"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
