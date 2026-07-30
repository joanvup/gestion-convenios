import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, Info, CheckCircle2, AlertTriangle, Check } from 'lucide-react';
import { Convenio } from '../types';

interface ConvenioModalProps {
  convenio?: Convenio; // If set, we are in edit mode
  onClose: () => void;
  onSave: () => void;
  token: string;
}

export default function ConvenioModal({ convenio, onClose, onSave, token }: ConvenioModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'info' | 'equipo' | 'finanzas' | 'plazos'>('info');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Catalogs options
  const [planesList, setPlanesList] = useState<{ id: number; nombre: string }[]>([]);
  const [facultadesList, setFacultadesList] = useState<{ id: number; nombre: string }[]>([]);
  const [tipologiasList, setTipologiasList] = useState<{ id: number; nombre: string }[]>([]);

  // Fetch catalogs on mount
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [resP, resF, resT] = await Promise.all([
          fetch('/api/planes_servicio', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/facultades', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/tipologias', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (resP.ok) {
          const dataP = await resP.json();
          setPlanesList(dataP.planes || []);
        }
        if (resF.ok) {
          const dataF = await resF.json();
          setFacultadesList(dataF.facultades || []);
        }
        if (resT.ok) {
          const dataT = await resT.json();
          setTipologiasList(dataT.tipologias || []);
        }
      } catch (err) {
        console.error('Error fetching catalog options for modal:', err);
      }
    };
    fetchCatalogs();
  }, [token]);

  // Fields state
  const [formData, setFormData] = useState({
    codigo: '',
    titulo_proyecto: '',
    no_convenio: '',
    plan_servicio: '',
    tipologia: '',
    facultad: '',
    programa: '',
    correo_responsable: '',
    investigador_principal: '',
    cedula: '',
    correo_investigador: '',
    responsable_proceso: '',
    cedula_responsable_proceso: '',
    correo_responsable_proceso: '',
    grupo: '',
    codigo_grupo: '',
    categoria: '',
    valor: '',
    valor_letras: '',
    duracion: '',
    disponibilidad_presupuestal: '',
    registro_presupuestal: '',
    fecha_inicio: '',
    fecha_terminacion: '',
    primer_informe: '',
    segundo_informe: '',
    acta_aprobacion_poliza: '',
    fecha_acta_aprobacion_ampliacion_poliza: '',
    fecha_terminacion_ampliacion: '',
    fecha_terminacion_prorroga: '',
    fecha_suspension: '',
    fecha_reinicio: '',
  });

  // Populate data in edit mode
  useEffect(() => {
    if (convenio) {
      setFormData({
        codigo: convenio.codigo || '',
        titulo_proyecto: convenio.titulo_proyecto || '',
        no_convenio: convenio.no_convenio || '',
        plan_servicio: convenio.plan_servicio || '',
        tipologia: convenio.tipologia || '',
        facultad: convenio.facultad || '',
        programa: convenio.programa || '',
        correo_responsable: convenio.correo_responsable || '',
        investigador_principal: convenio.investigador_principal || '',
        cedula: convenio.cedula || '',
        correo_investigador: convenio.correo_investigador || '',
        responsable_proceso: convenio.responsable_proceso || convenio.coinvestigador || '',
        cedula_responsable_proceso: convenio.cedula_responsable_proceso || '',
        correo_responsable_proceso: convenio.correo_responsable_proceso || '',
        grupo: convenio.grupo || '',
        codigo_grupo: convenio.codigo_grupo || '',
        categoria: convenio.categoria || '',
        valor: convenio.valor !== null && convenio.valor !== undefined ? String(convenio.valor) : '',
        valor_letras: convenio.valor_letras || '',
        duracion: convenio.duracion || '',
        disponibilidad_presupuestal: convenio.disponibilidad_presupuestal || '',
        registro_presupuestal: convenio.registro_presupuestal || '',
        fecha_inicio: convenio.fecha_inicio || '',
        fecha_terminacion: convenio.fecha_terminacion || '',
        primer_informe: convenio.primer_informe || '',
        segundo_informe: convenio.segundo_informe || '',
        acta_aprobacion_poliza: convenio.acta_aprobacion_poliza || '',
        fecha_acta_aprobacion_ampliacion_poliza: convenio.fecha_acta_aprobacion_ampliacion_poliza || '',
        fecha_terminacion_ampliacion: convenio.fecha_terminacion_ampliacion || '',
        fecha_terminacion_prorroga: convenio.fecha_terminacion_prorroga || '',
        fecha_suspension: convenio.fecha_suspension || '',
        fecha_reinicio: convenio.fecha_reinicio || '',
      });
    }
  }, [convenio]);

  // Validation function
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Código Interno (Required)
    if (!formData.codigo.trim()) {
      errs.codigo = 'El código interno es obligatorio (ej. CIG-004).';
    }

    // 2. Título del Proyecto (Required)
    if (!formData.titulo_proyecto.trim()) {
      errs.titulo_proyecto = 'El título del proyecto es obligatorio.';
    }

    // 3. Correo Investigador Principal (Required + Email format)
    if (!formData.correo_investigador.trim()) {
      errs.correo_investigador = 'El correo del investigador principal es obligatorio.';
    } else if (!emailRegex.test(formData.correo_investigador.trim())) {
      errs.correo_investigador = 'Formato de correo inválido (ej. usuario@dominio.com).';
    }

    // 4. Correo Responsable del Proceso (Required + Email format)
    if (!formData.correo_responsable_proceso.trim()) {
      errs.correo_responsable_proceso = 'El correo del responsable del proceso es obligatorio.';
    } else if (!emailRegex.test(formData.correo_responsable_proceso.trim())) {
      errs.correo_responsable_proceso = 'Formato de correo inválido (ej. usuario@dominio.com).';
    }

    // Optional email format validation if provided
    if (formData.correo_responsable.trim() && !emailRegex.test(formData.correo_responsable.trim())) {
      errs.correo_responsable = 'Formato de correo inválido (ej. usuario@dominio.com).';
    }

    // 5. Fecha de Inicio (Required)
    if (!formData.fecha_inicio) {
      errs.fecha_inicio = 'La fecha de inicio es obligatoria.';
    }

    // 6. Fecha de Terminación (Required + Range check)
    if (!formData.fecha_terminacion) {
      errs.fecha_terminacion = 'La fecha de terminación original es obligatoria.';
    } else if (formData.fecha_inicio && new Date(formData.fecha_terminacion) < new Date(formData.fecha_inicio)) {
      errs.fecha_terminacion = 'La fecha de terminación no puede ser anterior a la fecha de inicio.';
    }

    return errs;
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const isFieldInvalid = (fieldName: string) => {
    return (touched[fieldName] || hasAttemptedSubmit) && !!errors[fieldName];
  };

  const isFieldValid = (fieldName: string) => {
    const val = formData[fieldName as keyof typeof formData];
    return (touched[fieldName] || hasAttemptedSubmit) && !errors[fieldName] && val && String(val).trim() !== '';
  };

  const getInputClassName = (fieldName: string) => {
    const base = "block w-full px-3 py-2 border rounded-lg text-slate-800 text-sm transition-all focus:outline-none";
    if (isFieldInvalid(fieldName)) {
      return `${base} border-red-300 bg-red-50/20 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-200`;
    }
    if (isFieldValid(fieldName)) {
      return `${base} border-emerald-300 bg-emerald-50/10 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200`;
    }
    return `${base} border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white`;
  };

  const renderFieldStatus = (fieldName: string) => {
    if (isFieldInvalid(fieldName)) {
      return (
        <span className="text-[11px] text-red-600 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-red-500" /> Requerido
        </span>
      );
    }
    if (isFieldValid(fieldName)) {
      return (
        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Válido
        </span>
      );
    }
    return null;
  };

  const renderFieldError = (fieldName: string, defaultHelp?: string) => {
    if (isFieldInvalid(fieldName)) {
      return (
        <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
          <span>{errors[fieldName]}</span>
        </p>
      );
    }
    if (defaultHelp) {
      return <p className="text-[10px] text-slate-400 mt-0.5">{defaultHelp}</p>;
    }
    return null;
  };

  // Helper to check if a tab contains invalid fields
  const tabHasError = (tabKey: 'info' | 'equipo' | 'finanzas' | 'plazos') => {
    if (!hasAttemptedSubmit && Object.keys(touched).length === 0) return false;

    if (tabKey === 'info') return !!(errors.codigo || errors.titulo_proyecto);
    if (tabKey === 'equipo') return !!(errors.correo_investigador || errors.correo_responsable_proceso || errors.correo_responsable);
    if (tabKey === 'plazos') return !!(errors.fecha_inicio || errors.fecha_terminacion);
    return false;
  };

  // Helper to check if tab is fully completed
  const isTabComplete = (tabKey: 'info' | 'equipo' | 'finanzas' | 'plazos') => {
    if (tabKey === 'info') {
      return !!(formData.codigo.trim() && formData.titulo_proyecto.trim() && !errors.codigo && !errors.titulo_proyecto);
    }
    if (tabKey === 'equipo') {
      return !!(formData.correo_investigador.trim() && formData.correo_responsable_proceso.trim() && !errors.correo_investigador && !errors.correo_responsable_proceso);
    }
    if (tabKey === 'plazos') {
      return !!(formData.fecha_inicio && formData.fecha_terminacion && !errors.fecha_inicio && !errors.fecha_terminacion);
    }
    return true; // finanzas tab has no strict required fields
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setHasAttemptedSubmit(true);

    // Touch all required fields to activate visual indicators
    setTouched({
      codigo: true,
      titulo_proyecto: true,
      correo_investigador: true,
      correo_responsable_proceso: true,
      fecha_inicio: true,
      fecha_terminacion: true,
      correo_responsable: true,
    });

    // Check if there are validation errors
    if (Object.keys(errors).length > 0) {
      // Auto switch to the first tab containing an error
      if (errors.codigo || errors.titulo_proyecto) {
        setActiveFormTab('info');
      } else if (errors.correo_investigador || errors.correo_responsable_proceso || errors.correo_responsable) {
        setActiveFormTab('equipo');
      } else if (errors.fecha_inicio || errors.fecha_terminacion) {
        setActiveFormTab('plazos');
      }

      setError('Por favor complete todos los campos obligatorios y corrija los formatos marcados en rojo.');
      return;
    }

    setLoading(true);
    const endpoint = convenio ? `/api/convenios/${convenio.id}` : '/api/convenios';
    const method = convenio ? 'PUT' : 'POST';

    // Ensure correo_responsable is synced with correo_responsable_proceso
    const payload = {
      ...formData,
      correo_responsable: formData.correo_responsable_proceso.trim() || formData.correo_responsable.trim(),
    };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el convenio');
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const totalRequiredCount = 6;
  const completedRequiredCount = [
    formData.codigo.trim() && !errors.codigo,
    formData.titulo_proyecto.trim() && !errors.titulo_proyecto,
    formData.correo_investigador.trim() && !errors.correo_investigador,
    formData.correo_responsable_proceso.trim() && !errors.correo_responsable_proceso,
    formData.fecha_inicio && !errors.fecha_inicio,
    formData.fecha_terminacion && !errors.fecha_terminacion,
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                {convenio ? 'Editar Convenio' : 'Registrar Nuevo Convenio'}
              </h2>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                completedRequiredCount === totalRequiredCount
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {completedRequiredCount}/{totalRequiredCount} campos obligatorios
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Completa los datos normalizados para habilitar alertas de vencimiento automáticas
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Tabs for Form Organizing */}
        <div className="px-6 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto">
          {[
            { id: 'info', label: '1. Identificación y Convenio' },
            { id: 'equipo', label: '2. Investigadores' },
            { id: 'finanzas', label: '3. Información Financiera' },
            { id: 'plazos', label: '4. Fechas y Alertas' }
          ].map((tab) => {
            const hasErr = tabHasError(tab.id as any);
            const isComp = isTabComplete(tab.id as any);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFormTab(tab.id as any)}
                className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                  activeFormTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {hasErr && (
                  <span className="bg-red-100 text-red-600 rounded-full p-0.5" title="Contiene errores de validación">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </span>
                )}
                {!hasErr && isComp && (
                  <span className="bg-emerald-100 text-emerald-600 rounded-full p-0.5" title="Pestaña completa">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Real-time Summary Banner if there are errors and submit attempted */}
          {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Se encontraron campos pendientes por completar o corregir:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-amber-800">
                  {Object.entries(errors).map(([f, msg]) => (
                    <li key={f}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 1: IDENTIFICACIÓN */}
          {activeFormTab === 'info' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Datos de Identificación del Convenio</span>
                <span className="text-xs text-slate-400 font-normal normal-case">* Campos obligatorios marcados</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Código Interno <span className="text-red-500">*</span></span>
                    {renderFieldStatus('codigo')}
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('codigo')}
                    placeholder="Ej. CIG-004"
                  />
                  {renderFieldError('codigo', 'Debe ser único en el sistema.')}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    No. de Convenio / Contrato
                  </label>
                  <input
                    type="text"
                    name="no_convenio"
                    value={formData.no_convenio}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('no_convenio')}
                    placeholder="Ej. CONV-2025-089"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Título del Proyecto <span className="text-red-500">*</span></span>
                    {renderFieldStatus('titulo_proyecto')}
                  </label>
                  <textarea
                    name="titulo_proyecto"
                    rows={2}
                    value={formData.titulo_proyecto}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('titulo_proyecto')}
                    placeholder="Nombre completo del proyecto o convenio..."
                  />
                  {renderFieldError('titulo_proyecto')}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Plan de Servicio (Convocatoria)
                  </label>
                  <select
                    name="plan_servicio"
                    value={formData.plan_servicio}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('plan_servicio')}
                  >
                    <option value="">Seleccione Plan de Servicio...</option>
                    {planesList.map((p) => (
                      <option key={p.id} value={p.nombre}>
                        {p.nombre}
                      </option>
                    ))}
                    {formData.plan_servicio && !planesList.some(p => p.nombre === formData.plan_servicio) && (
                      <option value={formData.plan_servicio}>
                        {formData.plan_servicio} (Otro / Anterior)
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tipología
                  </label>
                  <select
                    name="tipologia"
                    value={formData.tipologia}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('tipologia')}
                  >
                    <option value="">Seleccione Tipología...</option>
                    {tipologiasList.map((t) => (
                      <option key={t.id} value={t.nombre}>
                        {t.nombre}
                      </option>
                    ))}
                    {formData.tipologia && !tipologiasList.some(t => t.nombre === formData.tipologia) && (
                      <option value={formData.tipologia}>
                        {formData.tipologia} (Otra / Anterior)
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Facultad Responsable
                  </label>
                  <select
                    name="facultad"
                    value={formData.facultad}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('facultad')}
                  >
                    <option value="">Seleccione Facultad...</option>
                    {facultadesList.map((f) => (
                      <option key={f.id} value={f.nombre}>
                        {f.nombre}
                      </option>
                    ))}
                    {formData.facultad && !facultadesList.some(f => f.nombre === formData.facultad) && (
                      <option value={formData.facultad}>
                        {formData.facultad} (Otra / Anterior)
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Programa Académico
                  </label>
                  <input
                    type="text"
                    name="programa"
                    value={formData.programa}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('programa')}
                    placeholder="Ej. Ingeniería de Sistemas"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVESTIGADORES Y GRUPOS */}
          {activeFormTab === 'equipo' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Personal Científico e Investigadores</span>
                <span className="text-xs text-slate-400 font-normal normal-case">* Correos obligatorios y verificados</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Investigador Principal
                  </label>
                  <input
                    type="text"
                    name="investigador_principal"
                    value={formData.investigador_principal}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('investigador_principal')}
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cédula / Documento Investigador
                  </label>
                  <input
                    type="text"
                    name="cedula"
                    value={formData.cedula}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('cedula')}
                    placeholder="Ej. 1.023.456.789"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Correo Investigador Principal <span className="text-red-500">*</span></span>
                    {renderFieldStatus('correo_investigador')}
                  </label>
                  <input
                    type="email"
                    name="correo_investigador"
                    value={formData.correo_investigador}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('correo_investigador')}
                    placeholder="Ej. maria.restrepo@universidad.edu"
                  />
                  {renderFieldError('correo_investigador')}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Responsable del Proceso
                  </label>
                  <input
                    type="text"
                    name="responsable_proceso"
                    value={formData.responsable_proceso}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('responsable_proceso')}
                    placeholder="Nombre completo del responsable del proceso"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cédula / Documento Responsable del Proceso
                  </label>
                  <input
                    type="text"
                    name="cedula_responsable_proceso"
                    value={formData.cedula_responsable_proceso}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('cedula_responsable_proceso')}
                    placeholder="Ej. 1.023.456.789"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Correo Responsable del Proceso <span className="text-red-500">*</span></span>
                    {renderFieldStatus('correo_responsable_proceso')}
                  </label>
                  <input
                    type="email"
                    name="correo_responsable_proceso"
                    value={formData.correo_responsable_proceso}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('correo_responsable_proceso')}
                    placeholder="Ej. responsable@universidad.edu"
                  />
                  {renderFieldError('correo_responsable_proceso', '* A este correo se le enviarán las alertas automáticas del convenio.')}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Grupo/Semillero/Jóvenes
                  </label>
                  <input
                    type="text"
                    name="grupo"
                    value={formData.grupo}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('grupo')}
                    placeholder="Nombre del grupo, semillero o jóvenes"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Código Grupo/Semillero/Jóvenes
                  </label>
                  <input
                    type="text"
                    name="codigo_grupo"
                    value={formData.codigo_grupo}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('codigo_grupo')}
                    placeholder="Ej. COL002345"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Categoría del Grupo/Semillero/Jóvenes
                  </label>
                  <input
                    type="text"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('categoria')}
                    placeholder="Ej. A1, A, B, C, Reconocido"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCIERO */}
          {activeFormTab === 'finanzas' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Información Financiera del Convenio
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Valor Financiado ($ COP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="valor"
                    value={formData.valor}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('valor')}
                    placeholder="Ej. 45000000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Duración Estimada (Texto)
                  </label>
                  <input
                    type="text"
                    name="duracion"
                    value={formData.duracion}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('duracion')}
                    placeholder="Ej. 12 meses"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Valor en Letras
                  </label>
                  <input
                    type="text"
                    name="valor_letras"
                    value={formData.valor_letras}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('valor_letras')}
                    placeholder="Ej. Cuarenta y cinco millones de pesos m/cte"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Disponibilidad Presupuestal No. (CDP)
                  </label>
                  <input
                    type="text"
                    name="disponibilidad_presupuestal"
                    value={formData.disponibilidad_presupuestal}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('disponibilidad_presupuestal')}
                    placeholder="Ej. DP-10023"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Registro Presupuestal (RP)
                  </label>
                  <input
                    type="text"
                    name="registro_presupuestal"
                    value={formData.registro_presupuestal}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('registro_presupuestal')}
                    placeholder="Ej. RP-8834"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FECHAS Y ALERTAS */}
          {activeFormTab === 'plazos' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Fechas Críticas, Informes y Pólizas</span>
                <span className="text-xs text-slate-400 font-normal normal-case">* Fechas de inicio y terminación obligatorias</span>
              </h3>
              
              <div className="p-3.5 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-xl text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                <div>
                  <p className="font-semibold">Control de Alertas Automáticas:</p>
                  <p className="mt-0.5 text-[11px] text-indigo-900">
                    El sistema vigila el vencimiento de acuerdo a la <strong>Fecha de Terminación Después de la Prórroga</strong> (si existe), en su defecto la <strong>Fecha Después de la Ampliación</strong>, o la <strong>Fecha de Terminación Original</strong>. El Primer Informe generará alarmas si está por vencerse y no se reporta entregado.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Fecha de Inicio <span className="text-red-500">*</span></span>
                    {renderFieldStatus('fecha_inicio')}
                  </label>
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={formData.fecha_inicio}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('fecha_inicio')}
                  />
                  {renderFieldError('fecha_inicio')}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Fecha de Terminación (Original) <span className="text-red-500">*</span></span>
                    {renderFieldStatus('fecha_terminacion')}
                  </label>
                  <input
                    type="date"
                    name="fecha_terminacion"
                    value={formData.fecha_terminacion}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('fecha_terminacion')}
                  />
                  {renderFieldError('fecha_terminacion')}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Fecha de Entrega - Primer Informe
                  </label>
                  <input
                    type="date"
                    name="primer_informe"
                    value={formData.primer_informe}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('primer_informe')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Segundo Informe (Estado o Fecha)
                  </label>
                  <input
                    type="text"
                    name="segundo_informe"
                    value={formData.segundo_informe}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('segundo_informe')}
                    placeholder="Ej. Entregado, Pendiente, o YYYY-MM-DD"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Acta de Aprobación de Póliza
                  </label>
                  <input
                    type="text"
                    name="acta_aprobacion_poliza"
                    value={formData.acta_aprobacion_poliza}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('acta_aprobacion_poliza')}
                    placeholder="Referencia del acta"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Fecha Acta Aprobación Ampliación Póliza
                  </label>
                  <input
                    type="date"
                    name="fecha_acta_aprobacion_ampliacion_poliza"
                    value={formData.fecha_acta_aprobacion_ampliacion_poliza}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('fecha_acta_aprobacion_ampliacion_poliza')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Fecha Terminación Después de la Ampliación
                  </label>
                  <input
                    type="date"
                    name="fecha_terminacion_ampliacion"
                    value={formData.fecha_terminacion_ampliacion}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('fecha_terminacion_ampliacion')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Fecha Terminación Después de la Prórroga (Final)
                  </label>
                  <input
                    type="date"
                    name="fecha_terminacion_prorroga"
                    value={formData.fecha_terminacion_prorroga}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClassName('fecha_terminacion_prorroga')}
                  />
                </div>

                <div className="col-span-1 md:col-span-2 mt-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Historial de Suspensión</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Fecha de Suspensión
                      </label>
                      <input
                        type="date"
                        name="fecha_suspension"
                        value={formData.fecha_suspension}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={getInputClassName('fecha_suspension')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Fecha de Reinicio
                      </label>
                      <input
                        type="date"
                        name="fecha_reinicio"
                        value={formData.fecha_reinicio}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={getInputClassName('fecha_reinicio')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="text-red-500 font-bold">*</span>
            <span>Campos obligatorios ({completedRequiredCount}/{totalRequiredCount} listos)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-sm active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar Convenio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
