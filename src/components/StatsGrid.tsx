import { FileText, ShieldAlert, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { Convenio, Alerta } from '../types';

interface StatsGridProps {
  convenios: Convenio[];
  alerts: Alerta[];
}

export default function StatsGrid({ convenios, alerts }: StatsGridProps) {
  const totalCount = convenios.length;

  const dangerAlerts = alerts.filter(a => a.severidad === 'danger');
  const warningAlerts = alerts.filter(a => a.severidad === 'warning_high' || a.severidad === 'warning_low');
  
  const suspendedCount = convenios.filter(c => c.fecha_suspension && !c.fecha_reinicio).length;

  // Calculate total value (parsed to double)
  const totalValue = convenios.reduce((acc, c) => {
    return acc + (c.valor || 0);
  }, 0);

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Convenios Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Convenios</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Registrados en el sistema</p>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <FileText className="w-6 h-6" />
        </div>
      </div>

      {/* Alertas Críticas (Vencidos/Urgentes) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alertas Críticas</p>
          <h3 className="text-2xl font-bold text-red-600 mt-1">{dangerAlerts.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Vencidos o con plazo cumplido</p>
        </div>
        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
          <ShieldAlert className="w-6 h-6" />
        </div>
      </div>

      {/* Alertas de Renovación (Próximos) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Próximos a Vencer</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{warningAlerts.length}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Vencimiento en &lt; 90 días</p>
        </div>
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

      {/* Financiación Total */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Financiado Total</p>
          <h3 className="text-xl font-bold text-emerald-600 mt-1.5 truncate max-w-[180px]" title={formatCurrency(totalValue)}>
            {formatCurrency(totalValue)}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{suspendedCount} en suspensión temporal</p>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
          <span className="text-lg font-bold font-mono">$</span>
        </div>
      </div>
    </div>
  );
}
