import React, { useState, useEffect } from 'react';
import { Mail, Send, Check, AlertCircle, Loader2, Info, Eye, EyeOff, ShieldAlert, Clock, Calendar } from 'lucide-react';

interface EmailConfigProps {
  token: string;
}

interface EmailSettings {
  host: string;
  port: number;
  secure: number;
  user: string;
  sender_name: string;
  enabled: number;
  scheduled_time: string;
  scheduled_days: string;
}

const DAYS_OF_WEEK = [
  { id: '1', short: 'L', name: 'Lunes' },
  { id: '2', short: 'M', name: 'Martes' },
  { id: '3', short: 'X', name: 'Miércoles' },
  { id: '4', short: 'J', name: 'Jueves' },
  { id: '5', short: 'V', name: 'Viernes' },
  { id: '6', short: 'S', name: 'Sábado' },
  { id: '0', short: 'D', name: 'Domingo' }
];

export default function EmailConfig({ token }: EmailConfigProps) {
  const [settings, setSettings] = useState<EmailSettings>({
    host: 'smtp.gmail.com',
    port: 587,
    secure: 0,
    user: '',
    sender_name: 'Gestor de Convenios',
    enabled: 0,
    scheduled_time: '08:00',
    scheduled_days: '1,2,3,4,5'
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/email-settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data) {
        setSettings({
          host: data.host || 'smtp.gmail.com',
          port: Number(data.port) || 587,
          secure: Number(data.secure) || 0,
          user: data.user || '',
          sender_name: data.sender_name || 'Gestor de Convenios',
          enabled: Number(data.enabled) || 0,
          scheduled_time: data.scheduled_time || '08:00',
          scheduled_days: data.scheduled_days || '1,2,3,4,5'
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'No se pudo cargar la configuración de correo.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleScheduledDay = (dayId: string) => {
    const currentList = (settings.scheduled_days || '1,2,3,4,5')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    let updatedList: string[];
    if (currentList.includes(dayId)) {
      updatedList = currentList.filter(d => d !== dayId);
    } else {
      updatedList = [...currentList, dayId];
    }
    
    const orderMap: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '0': 7 };
    updatedList.sort((a, b) => (orderMap[a] || 99) - (orderMap[b] || 99));

    setSettings({ ...settings, scheduled_days: updatedList.join(',') });
  };

  const setDaysPreset = (preset: 'weekdays' | 'all' | 'weekend') => {
    if (preset === 'weekdays') {
      setSettings({ ...settings, scheduled_days: '1,2,3,4,5' });
    } else if (preset === 'all') {
      setSettings({ ...settings, scheduled_days: '1,2,3,4,5,6,0' });
    } else if (preset === 'weekend') {
      setSettings({ ...settings, scheduled_days: '6,0' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/email-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...settings,
          pass: password // empty string means password won't be updated on server
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Configuración guardada correctamente.' });
        setPassword(''); // clear input
        if (data.settings) {
          setSettings(data.settings);
        }
      } else {
        setFeedback({ type: 'error', message: data.error || 'Error al guardar la configuración.' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Error de red al intentar guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!settings.user || !testRecipient) {
      setTestFeedback({ type: 'error', message: 'Por favor, introduce el correo emisor y el destinatario de prueba.' });
      return;
    }
    setTesting(true);
    setTestFeedback(null);

    try {
      const res = await fetch('/api/email-settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...settings,
          pass: password || undefined, // use input password, otherwise server fallback
          to: testRecipient
        })
      });

      const data = await res.json();
      if (res.ok) {
        setTestFeedback({ type: 'success', message: `¡Éxito! Correo de prueba enviado a ${testRecipient}. Revisa la bandeja de entrada.` });
      } else {
        setTestFeedback({ type: 'error', message: data.error || 'Error en el envío de prueba.' });
      }
    } catch (err: any) {
      console.error(err);
      setTestFeedback({ type: 'error', message: 'Error al enviar: ' + err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleBulkNotify = async () => {
    if (!confirm('¿Deseas enviar las notificaciones de alertas de plazos activas por correo a todos los responsables de convenios registrados?')) {
      return;
    }

    setBulkSending(true);
    setBulkFeedback(null);

    try {
      const res = await fetch('/api/alerts/notify-bulk', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setBulkFeedback({ 
          type: 'success', 
          message: `Proceso completado. ${data.message || `Correos enviados: ${data.notifiedCount}, Fallidos: ${data.failedCount}`}` 
        });
      } else {
        setBulkFeedback({ type: 'error', message: data.error || 'Error al ejecutar notificaciones en lote.' });
      }
    } catch (err: any) {
      console.error(err);
      setBulkFeedback({ type: 'error', message: 'Error de red: ' + err.message });
    } finally {
      setBulkSending(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-slate-500 font-medium text-xs mt-3">Cargando configuración de notificaciones...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      
      {/* Col 1 & 2: Main Setup Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Configuración de Envío de Notificaciones por Correo</h2>
              <p className="text-slate-400 text-xs mt-0.5">Configura tu cuenta de Gmail con contraseña de aplicación para automatizar alertas.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            
            {/* Enabled Switch */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">¿Habilitar Envío de Correos Automáticos?</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Activa el envío automático al crear, actualizar o notificar alertas de convenios.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={settings.enabled === 1}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked ? 1 : 0 })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-5 after:width-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Scheduled Time Selector */}
            <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-150 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Horario de Ejecución Diaria de Alertas</span>
                    <span className="text-[11px] text-slate-500 block">Hora exacta del día en que el servidor revisará vencimientos y enviará correos.</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200/80">
                  {settings.scheduled_time || '08:00'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Hora Exacta:</label>
                  <input 
                    type="time" 
                    value={settings.scheduled_time || '08:00'}
                    onChange={(e) => setSettings({ ...settings, scheduled_time: e.target.value })}
                    className="px-3 py-1.5 bg-white border border-indigo-200 hover:border-indigo-300 focus:border-indigo-600 rounded-xl text-xs font-bold text-slate-900 focus:outline-none shadow-2xs"
                    required
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">Atajos:</span>
                  {[
                    { time: '07:00', label: '07:00 AM' },
                    { time: '08:00', label: '08:00 AM' },
                    { time: '09:00', label: '09:00 AM' },
                    { time: '13:00', label: '01:00 PM' },
                    { time: '18:00', label: '06:00 PM' }
                  ].map((preset) => (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => setSettings({ ...settings, scheduled_time: preset.time })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        (settings.scheduled_time || '08:00') === preset.time
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white hover:bg-indigo-100/80 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scheduled Days Selector */}
            <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-150 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Días de Ejecución Semanal</span>
                    <span className="text-[11px] text-slate-500 block">Selecciona qué días de la semana se enviarán las alertas automáticas.</span>
                  </div>
                </div>
                
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200/80">
                  {(() => {
                    const selected = (settings.scheduled_days || '1,2,3,4,5').split(',').map(s => s.trim()).filter(Boolean);
                    if (selected.length === 7) return 'Todos los días (7/7)';
                    if (selected.length === 5 && ['1','2','3','4','5'].every(d => selected.includes(d))) return 'Lunes a Viernes (Días laborables)';
                    if (selected.length === 2 && selected.includes('6') && selected.includes('0')) return 'Fines de semana (Sáb - Dom)';
                    if (selected.length === 0) return 'Sin días seleccionados';
                    return `${selected.length} día${selected.length > 1 ? 's' : ''} activo${selected.length > 1 ? 's' : ''}`;
                  })()}
                </span>
              </div>

              {/* Day Buttons */}
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = (settings.scheduled_days || '1,2,3,4,5').split(',').map(s => s.trim()).includes(day.id);
                    const isWeekend = day.id === '6' || day.id === '0';
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleScheduledDay(day.id)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
                        }`}
                        title={`Hacer clic para ${isSelected ? 'desactivar' : 'activar'} ${day.name}`}
                      >
                        <span className={`text-[9px] uppercase font-mono tracking-tight ${isSelected ? 'text-indigo-200' : isWeekend ? 'text-amber-600 font-extrabold' : 'text-slate-400'}`}>
                          {day.name.substring(0, 3)}
                        </span>
                        <span className="text-sm font-extrabold">{day.short}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Shortcuts & Note */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-indigo-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">Preajustes:</span>
                    <button
                      type="button"
                      onClick={() => setDaysPreset('weekdays')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        (settings.scheduled_days || '1,2,3,4,5') === '1,2,3,4,5'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white hover:bg-indigo-100/80 text-slate-600 border border-slate-200'
                      }`}
                    >
                      Lunes a Viernes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDaysPreset('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        (settings.scheduled_days || '1,2,3,4,5') === '1,2,3,4,5,6,0'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white hover:bg-indigo-100/80 text-slate-600 border border-slate-200'
                      }`}
                    >
                      Todos los Días
                    </button>
                    <button
                      type="button"
                      onClick={() => setDaysPreset('weekend')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        (settings.scheduled_days || '1,2,3,4,5') === '6,0'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white hover:bg-indigo-100/80 text-slate-600 border border-slate-200'
                      }`}
                    >
                      Solo Fines de Semana
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium italic">
                    *(Evita notificaciones automáticas los días no marcados)*
                  </p>
                </div>
              </div>
            </div>

            {/* Grid for SMTP details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Servidor SMTP</label>
                <input 
                  type="text" 
                  value={settings.host}
                  onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Puerto</label>
                <input 
                  type="number" 
                  value={settings.port}
                  onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value, 10) || 587 })}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Connection Type */}
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="secure-conn"
                checked={settings.secure === 1}
                onChange={(e) => setSettings({ ...settings, secure: e.target.checked ? 1 : 0, port: e.target.checked ? 465 : 587 })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="secure-conn" className="text-xs font-bold text-slate-600 select-none">
                Usar Conexión Segura SSL/TLS (Puerto 465) <span className="text-slate-400 font-medium">(Por defecto se usa STARTTLS en puerto 587)</span>
              </label>
            </div>

            {/* Sender Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre del Remitente</label>
              <input 
                type="text" 
                value={settings.sender_name}
                onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                placeholder="Gestor de Convenios de la Universidad"
                className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
                required
              />
            </div>

            {/* Grid for User & Pass */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Correo Emisor (Gmail)</label>
                <input 
                  type="email" 
                  value={settings.user}
                  onChange={(e) => setSettings({ ...settings, user: e.target.value })}
                  placeholder="usuario@gmail.com"
                  className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Contraseña de Aplicación
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••• •••• •••• ••••"
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs font-mono focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-1 leading-normal">
                  Déjalo en blanco si ya está configurado y no deseas cambiar la contraseña.
                </span>
              </div>
            </div>

            {feedback && (
              <div className={`p-4.5 rounded-xl border flex items-start gap-3 ${
                feedback.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-red-50 border-red-100 text-red-800'
              }`}>
                {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                <p className="text-xs font-semibold">{feedback.message}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 active:scale-[0.98] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar Configuración
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Test Email Component */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Probar Conexión SMTP</h3>
              <p className="text-slate-400 text-xs">Verifica de inmediato si los datos de Gmail son correctos enviando un correo de prueba.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Correo Destinatario de Prueba</label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="destinatario@universidad.edu.co"
                  className="flex-1 px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || !testRecipient}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar Prueba
                </button>
              </div>
            </div>

            {testFeedback && (
              <div className={`p-4.5 rounded-xl border flex items-start gap-3 ${
                testFeedback.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-red-50 border-red-100 text-red-800'
              }`}>
                {testFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                <p className="text-xs font-semibold">{testFeedback.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Col 3: Sidebar Tutorial & Actions */}
      <div className="space-y-6">
        
        {/* Bulk Action Panel */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h3 className="font-bold text-sm text-indigo-200">Acción de Envío Manual</h3>
          </div>
          <p className="text-xs text-indigo-100/80 leading-relaxed mb-4">
            Al hacer clic en el botón de abajo, el sistema escaneará todos los convenios vigentes, calculará las alertas activas (no silenciadas) y enviará correos detallados a los respectivos correos responsables e investigadores.
          </p>

          <button
            type="button"
            onClick={handleBulkNotify}
            disabled={bulkSending || settings.enabled === 0}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 active:scale-[0.98] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Notificar Alertas por Correo
          </button>

          {settings.enabled === 0 && (
            <span className="text-[10px] text-red-400 font-medium block mt-2 text-center">
              * Debes activar y guardar la configuración para usar el envío en lote.
            </span>
          )}

          {bulkFeedback && (
            <div className={`mt-4 p-3 rounded-lg border text-xs font-medium ${
              bulkFeedback.type === 'success' 
                ? 'bg-indigo-950/80 border-indigo-800/80 text-indigo-200' 
                : 'bg-red-950/80 border-red-900/80 text-red-200'
            }`}>
              {bulkFeedback.message}
            </div>
          )}
        </div>

        {/* Gmail Setup Tutorial */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Tutorial de Configuración</h4>
          </div>

          <div className="space-y-3.5 text-xs text-slate-600 leading-normal">
            <p>
              Para usar Gmail como servidor de correo saliente, <strong>no uses tu contraseña regular</strong>. Google requiere una <strong>Contraseña de Aplicación</strong> de 16 dígitos por motivos de seguridad.
            </p>

            <h5 className="font-bold text-slate-800">Pasos para obtenerla:</h5>
            <ol className="list-decimal pl-4.5 space-y-2">
              <li>
                Inicia sesión en tu cuenta de Google y ve a <a href="https://myaccount.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">Mi Cuenta</a>.
              </li>
              <li>
                Ve a la pestaña <strong>Seguridad</strong> en el menú lateral.
              </li>
              <li>
                Asegúrate de tener activada la <strong>Verificación en dos pasos</strong>. Si no la tienes, actívala.
              </li>
              <li>
                En el buscador de la cuenta (parte superior) escribe <strong>"Contraseñas de aplicación"</strong> y selecciónala.
              </li>
              <li>
                Escribe un nombre para identificar la aplicación (ej. <em>"Gestor de Convenios"</em>) y haz clic en <strong>Crear</strong>.
              </li>
              <li>
                Copia la contraseña generada de 16 caracteres (sin los espacios) y pégala en el campo <strong>Contraseña de Aplicación</strong> de este formulario.
              </li>
            </ol>

            <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-[11px] text-indigo-900">
              <strong>Nota:</strong> Este método mantiene tu cuenta principal de Google 100% segura, ya que puedes revocar la contraseña en cualquier momento desde tu panel de Google.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
