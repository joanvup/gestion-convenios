import { Bell, ShieldAlert, AlertTriangle, Info, Check, Eye } from 'lucide-react';
import { Alerta } from '../types';

interface AlertPanelProps {
  alerts: Alerta[];
  onDismiss: (convenioId: number, alertKey: string) => void;
  onSelectConvenio: (id: number) => void;
}

export default function AlertPanel({ alerts, onDismiss, onSelectConvenio }: AlertPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 text-center text-emerald-800">
        <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <Check className="w-5 h-5 text-emerald-600" />
        </div>
        <h4 className="font-semibold text-sm">¡Al día!</h4>
        <p className="text-xs text-emerald-600/90 mt-1">
          No hay alertas pendientes de vencimiento, entrega de informes ni de pólizas.
        </p>
      </div>
    );
  }

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'danger':
        return {
          card: 'bg-red-50/75 border-red-200/60 hover:bg-red-50',
          iconContainer: 'bg-red-100 text-red-700',
          badge: 'bg-red-100 text-red-800 border-red-200',
          icon: ShieldAlert,
          label: 'Vencido / Crítico'
        };
      case 'warning_high':
        return {
          card: 'bg-amber-50/75 border-amber-200/60 hover:bg-amber-50',
          iconContainer: 'bg-amber-100 text-amber-700',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: AlertTriangle,
          label: 'Crítico (< 30 días)'
        };
      case 'warning_low':
        return {
          card: 'bg-yellow-50/50 border-yellow-200/50 hover:bg-yellow-50',
          iconContainer: 'bg-yellow-100 text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: AlertTriangle,
          label: 'Próximo (< 90 días)'
        };
      default:
        return {
          card: 'bg-slate-50/75 border-slate-200/60 hover:bg-slate-50',
          iconContainer: 'bg-slate-100 text-slate-700',
          badge: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: Info,
          label: 'Información / Estado'
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Panel de Alertas Activas</h3>
            <p className="text-xs text-slate-500">Notificaciones automáticas para renovación y control de plazos</p>
          </div>
        </div>
        <span className="bg-indigo-100 text-indigo-800 font-semibold text-xs px-2.5 py-1 rounded-full border border-indigo-200">
          {alerts.length} {alerts.length === 1 ? 'Alerta' : 'Alertas'}
        </span>
      </div>

      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {alerts.map((alert) => {
          const style = getSeverityStyle(alert.severidad);
          const Icon = style.icon;

          return (
            <div
              key={alert.key}
              className={`p-4 rounded-xl border transition-all duration-150 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${style.card}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${style.iconContainer}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-xs">
                      {alert.convenioCodigo}
                    </span>
                    <span className="text-xs text-slate-500 font-medium truncate max-w-[200px] md:max-w-[280px]" title={alert.convenioTitulo}>
                      {alert.convenioTitulo}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-1.5 leading-snug">
                    {alert.mensaje}
                  </p>
                  {alert.diasRestantes !== null && (
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {alert.diasRestantes < 0 
                        ? `Vencido hace ${Math.abs(alert.diasRestantes)} días` 
                        : alert.diasRestantes === 0
                        ? 'Vence hoy'
                        : `Vence en ${alert.diasRestantes} días`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  onClick={() => onSelectConvenio(alert.convenioId)}
                  className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-slate-800 text-xs font-medium flex items-center gap-1 shadow-2xs transition-all active:scale-[0.97]"
                  title="Ver detalles del convenio"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver</span>
                </button>
                <button
                  onClick={() => onDismiss(alert.convenioId, alert.key)}
                  className="p-1.5 bg-white border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all active:scale-[0.97]"
                  title="Silenciar esta alerta temporalmente"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Silenciar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
