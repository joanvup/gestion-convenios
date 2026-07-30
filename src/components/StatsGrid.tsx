import { useState, useMemo } from 'react';
import { FileText, ShieldAlert, AlertTriangle, Building2, Layers, PieChart as PieChartIcon, ChevronDown, ChevronUp, DollarSign, Hash } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Convenio, Alerta } from '../types';

interface StatsGridProps {
  convenios: Convenio[];
  alerts: Alerta[];
}

const COLORS = [
  '#4f46e5', // Indigo 600
  '#0284c7', // Sky 600
  '#059669', // Emerald 600
  '#d97706', // Amber 600
  '#7c3aed', // Violet 600
  '#db2777', // Pink 600
  '#0d9488', // Teal 600
  '#e11d48', // Rose 600
  '#2563eb', // Blue 600
  '#64748b', // Slate 500
];

export default function StatsGrid({ convenios, alerts }: StatsGridProps) {
  const [showCharts, setShowCharts] = useState(true);
  const [metricMode, setMetricMode] = useState<'count' | 'value'>('count');

  const totalCount = convenios.length;

  const dangerAlerts = alerts.filter(a => a.severidad === 'danger');
  const warningAlerts = alerts.filter(a => a.severidad === 'warning_high' || a.severidad === 'warning_low');
  
  const suspendedCount = convenios.filter(c => c.fecha_suspension && !c.fecha_reinicio).length;

  // Calculate total value
  const totalValue = convenios.reduce((acc, c) => acc + (c.valor || 0), 0);

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Group data by Facultad
  const facultadData = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    convenios.forEach(c => {
      const fac = c.facultad && c.facultad.trim() ? c.facultad.trim() : 'Sin Facultad';
      const prev = map.get(fac) || { count: 0, value: 0 };
      map.set(fac, {
        count: prev.count + 1,
        value: prev.value + (c.valor || 0)
      });
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        value: data.value,
      }))
      .sort((a, b) => (metricMode === 'count' ? b.count - a.count : b.value - a.value));
  }, [convenios, metricMode]);

  // Group data by Tipología
  const tipologiaData = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    convenios.forEach(c => {
      const tip = c.tipologia && c.tipologia.trim() ? c.tipologia.trim() : 'Sin Tipología';
      const prev = map.get(tip) || { count: 0, value: 0 };
      map.set(tip, {
        count: prev.count + 1,
        value: prev.value + (c.valor || 0)
      });
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        value: data.value,
      }))
      .sort((a, b) => (metricMode === 'count' ? b.count - a.count : b.value - a.value));
  }, [convenios, metricMode]);

  // Custom Tooltip component for Pie Charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = metricMode === 'count' ? totalCount : totalValue;
      const currentVal = metricMode === 'count' ? data.count : data.value;
      const percent = total > 0 ? ((currentVal / total) * 100).toFixed(1) : '0';

      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700">
          <p className="font-bold text-slate-100 mb-1.5 border-b border-slate-800 pb-1">{data.name}</p>
          <div className="space-y-1.5 text-slate-300">
            <p className="flex justify-between gap-4">
              <span>Nº Convenios:</span>
              <span className="font-bold text-white">{data.count}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span>Monto Total:</span>
              <span className="font-bold text-emerald-400">{formatCurrency(data.value)}</span>
            </p>
            <p className="flex justify-between gap-4 pt-1 border-t border-slate-800">
              <span>Proporción:</span>
              <span className="font-bold text-indigo-300">{percent}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Convenios Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
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
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
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
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
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
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
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

      {/* Visual Analytics / Charts Section Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Análisis Gráfico de Distribución</h4>
              <p className="text-xs text-slate-500">Distribución porcentual por Facultad y Tipología</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Metric Switcher Button */}
            <div className="bg-slate-200/70 p-0.5 rounded-lg flex text-xs">
              <button
                onClick={() => setMetricMode('count')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                  metricMode === 'count'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualizar por número de convenios"
              >
                <Hash className="w-3 h-3" />
                Cantidad
              </button>
              <button
                onClick={() => setMetricMode('value')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                  metricMode === 'value'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualizar por valor financiado"
              >
                <DollarSign className="w-3 h-3" />
                Valor ($)
              </button>
            </div>

            {/* Toggle Visibility */}
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              {showCharts ? (
                <>
                  <span>Ocultar</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Mostrar Gráficos</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Charts Container */}
        {showCharts && (
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white">
            {/* Chart 1: Por Facultad */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Convenios por Facultad</h5>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                  {facultadData.length} facultades
                </span>
              </div>

              {convenios.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                  No hay datos registrados
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={facultadData}
                          dataKey={metricMode === 'count' ? 'count' : 'value'}
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={40}
                          paddingAngle={3}
                        >
                          {facultadData.map((_, index) => (
                            <Cell key={`cell-fac-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Custom Legend */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs scrollbar-thin">
                    {facultadData.map((item, idx) => {
                      const total = metricMode === 'count' ? totalCount : totalValue;
                      const val = metricMode === 'count' ? item.count : item.value;
                      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';

                      return (
                        <div key={item.name} className="flex items-center justify-between p-1.5 hover:bg-slate-100/80 rounded-lg text-slate-700">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="truncate font-medium text-[11px]" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-[11px] text-slate-800">
                              {metricMode === 'count' ? item.count : formatCurrency(item.value)}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Por Tipología */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Convenios por Tipología</h5>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                  {tipologiaData.length} tipologías
                </span>
              </div>

              {convenios.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                  No hay datos registrados
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tipologiaData}
                          dataKey={metricMode === 'count' ? 'count' : 'value'}
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={40}
                          paddingAngle={3}
                        >
                          {tipologiaData.map((_, index) => (
                            <Cell key={`cell-tip-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Custom Legend */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs scrollbar-thin">
                    {tipologiaData.map((item, idx) => {
                      const total = metricMode === 'count' ? totalCount : totalValue;
                      const val = metricMode === 'count' ? item.count : item.value;
                      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';

                      return (
                        <div key={item.name} className="flex items-center justify-between p-1.5 hover:bg-slate-100/80 rounded-lg text-slate-700">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: COLORS[(idx + 3) % COLORS.length] }}
                            />
                            <span className="truncate font-medium text-[11px]" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-[11px] text-slate-800">
                              {metricMode === 'count' ? item.count : formatCurrency(item.value)}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

