import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Info } from 'lucide-react';
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
  const [activeFormTab, setActiveFormTab] = useState<'info' | 'equipo' | 'finanzas' | 'plazos'>('info');

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
    coinvestigador: '',
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
        coinvestigador: convenio.coinvestigador || '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (!formData.codigo.trim()) {
      setError('El código interno es obligatorio (ej. CIG-004)');
      setActiveFormTab('info');
      return;
    }
    if (!formData.titulo_proyecto.trim()) {
      setError('El título del proyecto es obligatorio');
      setActiveFormTab('info');
      return;
    }

    setLoading(true);
    const endpoint = convenio ? `/api/convenios/${convenio.id}` : '/api/convenios';
    const method = convenio ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {convenio ? 'Editar Convenio' : 'Registrar Nuevo Convenio'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Completa los datos normalizados para habilitar alertas de vencimiento automáticas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Tabs for Form Organizing */}
        <div className="px-6 bg-slate-50 border-b border-slate-100 flex gap-2">
          {[
            { id: 'info', label: '1. Identificación y Convenio' },
            { id: 'equipo', label: '2. Investigadores y Grupo' },
            { id: 'finanzas', label: '3. Financiero y Presupuesto' },
            { id: 'plazos', label: '4. Fechas y Alertas' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFormTab(tab.id as any)}
              className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-all ${
                activeFormTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: IDENTIFICACIÓN */}
          {activeFormTab === 'info' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Datos de Identificación del Convenio
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Código Interno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    required
                    value={formData.codigo}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Ej. CIG-004"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Debe ser único en el sistema.</p>
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. CONV-2025-089"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Título del Proyecto <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="titulo_proyecto"
                    required
                    rows={2}
                    value={formData.titulo_proyecto}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Nombre completo del proyecto o convenio..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Plan de Servicio (Convocatoria)
                  </label>
                  <input
                    type="text"
                    name="plan_servicio"
                    value={formData.plan_servicio}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. Convocatoria Colciencias 2025"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tipología
                  </label>
                  <select
                    name="tipologia"
                    value={formData.tipologia}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Estándar">Estándar</option>
                    <option value="Especial">Especial</option>
                    <option value="Asociado">Asociado</option>
                    <option value="Pasantía">Pasantía</option>
                    <option value="Marco">Marco</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Facultad Responsable
                  </label>
                  <input
                    type="text"
                    name="facultad"
                    value={formData.facultad}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. Facultad de Ingeniería"
                  />
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. Ingeniería de Sistemas"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Correo Electrónico del Área Responsable
                  </label>
                  <input
                    type="email"
                    name="correo_responsable"
                    value={formData.correo_responsable}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. facultad.ingenieria@universidad.edu"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVESTIGADORES Y GRUPOS */}
          {activeFormTab === 'equipo' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Personal Científico e Investigadores
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. 1.023.456.789"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Correo Investigador Principal
                  </label>
                  <input
                    type="email"
                    name="correo_investigador"
                    value={formData.correo_investigador}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. maria.restrepo@universidad.edu"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Coinvestigador
                  </label>
                  <input
                    type="text"
                    name="coinvestigador"
                    value={formData.coinvestigador}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Nombre coinvestigador"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Grupo de Investigación
                  </label>
                  <input
                    type="text"
                    name="grupo"
                    value={formData.grupo}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Nombre del grupo oficial"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Código Grupo de Investigación
                  </label>
                  <input
                    type="text"
                    name="codigo_grupo"
                    value={formData.codigo_grupo}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. COL002345"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Categoría del Grupo
                  </label>
                  <input
                    type="text"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                Presupuesto y Disponibilidades Presupuestales
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Ej. RP-8834"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FECHAS Y ALERTAS */}
          {activeFormTab === 'plazos' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Fechas Críticas, Informes y Pólizas
              </h3>
              
              <div className="p-3.5 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-xl text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Control de Alertas Automáticas:</p>
                  <p className="mt-0.5">
                    El sistema vigila el vencimiento de acuerdo a la <strong>Fecha de Terminación Después de la Prórroga</strong> (si existe), en su defecto la <strong>Fecha Después de la Ampliación</strong>, o la <strong>Fecha de Terminación Original</strong>. El Primer Informe generará alarmas si está por vencerse y no se reporta entregado.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={formData.fecha_inicio}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Fecha de Terminación (Original)
                  </label>
                  <input
                    type="date"
                    name="fecha_terminacion"
                    value={formData.fecha_terminacion}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                  />
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
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
          <div className="text-xs text-slate-500">
            <span className="text-red-500 font-bold">*</span> Campos obligatorios
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
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
