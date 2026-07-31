import React, { useState, useEffect, useRef } from 'react';
import { Clock, Mail, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, Calendar, ShieldCheck, Sparkles, X } from 'lucide-react';

interface TimeStatusData {
  serverTimeISO: string;
  timeZone: string;
  emailSchedule: {
    enabled: boolean;
    scheduledTime: string;
    scheduledDays?: string;
    nextRunISO: string;
    lastCheckISO: string | null;
  };
}

interface ServerClockWidgetProps {
  token?: string;
  onOpenEmailConfig?: () => void;
}

export default function ServerClockWidget({ token, onOpenEmailConfig }: ServerClockWidgetProps) {
  const [data, setData] = useState<TimeStatusData | null>(null);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [currentServerTime, setCurrentServerTime] = useState<Date>(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch server status
  const fetchTimeStatus = async () => {
    try {
      const res = await fetch('/api/system/time-status');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const json: TimeStatusData = await res.json();
          setData(json);
          const serverDate = new Date(json.serverTimeISO);
          const localNow = new Date();
          setTimeOffset(serverDate.getTime() - localNow.getTime());
          setCurrentServerTime(serverDate);
        }
      }
    } catch (err) {
      // Silently handle transient connection/parser errors during server restart
      console.warn('Unable to sync server time status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeStatus();
    // Poll status every 20 seconds
    const statusInterval = setInterval(fetchTimeStatus, 20000);
    return () => clearInterval(statusInterval);
  }, []);

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentServerTime(new Date(Date.now() + timeOffset));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeOffset]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper formatting functions
  const formatTimeHHMMSS = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatScheduledDaysText = (daysStr?: string) => {
    if (!daysStr) return 'Lun-Vie';
    const list = daysStr.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length === 7) return 'Todos los días';
    if (list.length === 5 && ['1','2','3','4','5'].every(d => list.includes(d))) return 'Lun-Vie';
    if (list.length === 2 && list.includes('6') && list.includes('0')) return 'Fines de semana';
    if (list.length === 0) return 'Sin días activados';
    
    const dayMap: Record<string, string> = { '1': 'Lun', '2': 'Mar', '3': 'Mié', '4': 'Jue', '5': 'Vie', '6': 'Sáb', '0': 'Dom' };
    return list.map(d => dayMap[d] || d).join(', ');
  };

  const formatDateTimeFull = (isoStr: string | null) => {
    if (!isoStr) return 'Sin envíos registrados';
    const d = new Date(isoStr);
    return d.toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Compute status details
  let isSentToday = false;
  let timeRemainingStr = '';

  if (data?.emailSchedule) {
    const { lastCheckISO, nextRunISO, scheduledTime } = data.emailSchedule;
    
    if (lastCheckISO) {
      const lastCheckDate = new Date(lastCheckISO);
      const todayServer = currentServerTime.toISOString().split('T')[0];
      const lastCheckDateStr = lastCheckDate.toISOString().split('T')[0];
      
      if (todayServer === lastCheckDateStr) {
        isSentToday = true;
      }
    }

    if (nextRunISO) {
      const nextRunDate = new Date(nextRunISO);
      const diffMs = nextRunDate.getTime() - currentServerTime.getTime();
      if (diffMs > 0) {
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        timeRemainingStr = diffHrs > 0 ? `en ${diffHrs}h ${diffMins}m` : `en ${diffMins}m`;
      } else {
        timeRemainingStr = 'próximamente';
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Widget Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
            : 'bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200'
        }`}
        title="Ver Hora del Servidor y Estado del Envío de Correos"
      >
        {/* Live Server Clock Display */}
        <div className="flex items-center gap-1.5 border-r border-slate-300/60 dark:border-slate-700 pr-2">
          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-mono text-[11px] font-bold tracking-tight">
            {formatTimeHHMMSS(currentServerTime)}
          </span>
        </div>

        {/* Email Schedule Status Badge */}
        <div className="flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          
          {data?.emailSchedule?.enabled ? (
            <div className="flex items-center gap-1">
              <span className="hidden sm:inline text-[11px] font-medium text-slate-600 dark:text-slate-300">
                {data.emailSchedule.scheduledTime}
              </span>
              
              {isSentToday ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded-md border border-emerald-300/80 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="hidden md:inline">Enviado</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-1.5 py-0.2 rounded-md border border-indigo-300/80 dark:border-indigo-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span className="hidden md:inline">{timeRemainingStr || 'Prog.'}</span>
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded-md">
              Desactivado
            </span>
          )}

          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                  Servidor y Programador de Correos
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Sincronización en tiempo real
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Live Server Time Section */}
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Hora del Servidor
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900">
                {data?.timeZone || 'UTC'}
              </span>
            </div>

            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
                {formatTimeHHMMSS(currentServerTime)}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 capitalize">
                {formatDateShort(currentServerTime)}
              </span>
            </div>
          </div>

          {/* Mail Dispatch Status Section */}
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                Programación de Alertas
              </span>

              {data?.emailSchedule?.enabled ? (
                <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Activo ({data.emailSchedule.scheduledTime})
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                  Desactivado
                </span>
              )}
            </div>

            {data?.emailSchedule?.enabled ? (
              <div className="space-y-2 text-xs">
                
                {/* State Banner */}
                {isSentToday ? (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                        Correos de hoy ya fueron enviados
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                        Las alertas diarias de convenios vencidos o próximos a vencer fueron procesadas correctamente.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                        Próximo envío programado
                      </p>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                        Se enviará automáticamente {timeRemainingStr ? `(${timeRemainingStr})` : `a las ${data.emailSchedule.scheduledTime}`}.
                      </p>
                    </div>
                  </div>
                )}

                {/* Details Table */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 text-[11px] border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Hora programada diaria:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                      {data.emailSchedule.scheduledTime}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Días de ejecución:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {formatScheduledDaysText(data.emailSchedule.scheduledDays)}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Próxima ejecución:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-medium capitalize">
                      {new Date(data.emailSchedule.nextRunISO).toLocaleString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Último envío registrado:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-medium">
                      {formatDateTimeFull(data.emailSchedule.lastCheckISO)}
                    </strong>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  Envío automático desactivado
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Para activar los envíos automáticos diarios, configura los parámetros SMTP en el panel de Configuración de Correo.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => {
                setLoading(true);
                fetchTimeStatus();
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Actualizar estado
            </button>

            {onOpenEmailConfig && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenEmailConfig();
                }}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Configurar Correo &rarr;
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
