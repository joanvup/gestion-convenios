import React, { useEffect, useState } from 'react';
import { ShieldAlert, X, ChevronRight, AlertOctagon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alerta } from '../types';

interface ExpiredToastProps {
  expiredAlerts: Alerta[];
  onClose: () => void;
  onViewAlerts: () => void;
  onSelectConvenio: (id: number) => void;
}

export default function ExpiredToast({
  expiredAlerts,
  onClose,
  onViewAlerts,
  onSelectConvenio
}: ExpiredToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (expiredAlerts.length === 0 || !isVisible) {
    return null;
  }

  const count = expiredAlerts.length;
  const topAlerts = expiredAlerts.slice(0, 3);

  const handleDismiss = () => {
    setIsVisible(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-5 right-5 z-50 max-w-md w-full px-4 sm:px-0"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-rose-200/90 overflow-hidden ring-1 ring-rose-500/10 backdrop-blur-md">
            {/* Top accent bar */}
            <div className="h-1 bg-gradient-to-r from-rose-500 via-red-600 to-amber-500" />

            <div className="p-4 sm:p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">
                        ¡Convenios Vencidos!
                      </h4>
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-mono font-bold rounded-full border border-rose-200">
                        {count} {count === 1 ? 'vencido' : 'vencidos'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Atención requerida para regularizar o renovar plazos
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                  title="Cerrar notificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List preview of up to 3 convenios */}
              <div className="mt-3.5 space-y-2 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/80">
                {topAlerts.map((alert) => (
                  <div
                    key={alert.key}
                    onClick={() => {
                      onSelectConvenio(alert.convenioId);
                      handleDismiss();
                    }}
                    className="group flex items-center justify-between p-2 rounded-lg bg-white border border-rose-200/60 hover:border-rose-300 hover:shadow-2xs transition-all cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 shrink-0">
                          {alert.convenioCodigo}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate" title={alert.convenioTitulo}>
                          {alert.convenioTitulo}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-rose-600 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{alert.mensaje}</span>
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))}

                {count > 3 && (
                  <p className="text-[11px] text-center font-semibold text-rose-700 pt-1">
                    + {count - 3} convenios vencidos adicionales
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-3.5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={handleDismiss}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Entendido
                </button>
                <button
                  onClick={() => {
                    onViewAlerts();
                    handleDismiss();
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <span>Revisar en Panel</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
