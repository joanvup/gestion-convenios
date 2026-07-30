import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Edit2, Check, X, Shield, RefreshCw, AlertCircle, CheckCircle2, Layers, Building2, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';

interface CatalogItem {
  id: number;
  nombre: string;
}

interface CatalogManagementProps {
  token: string;
  currentUser: User | null;
}

export default function CatalogManagement({ token, currentUser }: CatalogManagementProps) {
  const [activeTab, setActiveTab] = useState<'planes' | 'facultades' | 'tipologias'>('planes');

  // Planes state
  const [planes, setPlanes] = useState<CatalogItem[]>([]);
  const [newPlan, setNewPlan] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editingPlanName, setEditingPlanName] = useState('');

  // Facultades state
  const [facultades, setFacultades] = useState<CatalogItem[]>([]);
  const [newFacultad, setNewFacultad] = useState('');
  const [editingFacultadId, setEditingFacultadId] = useState<number | null>(null);
  const [editingFacultadName, setEditingFacultadName] = useState('');

  // Tipologias state
  const [tipologias, setTipologias] = useState<CatalogItem[]>([]);
  const [newTipologia, setNewTipologia] = useState('');
  const [editingTipologiaId, setEditingTipologiaId] = useState<number | null>(null);
  const [editingTipologiaName, setEditingTipologiaName] = useState('');

  // Global loading & status
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCatalogs = async () => {
    setLoading(true);
    setError('');
    try {
      const [resPlanes, resFacultades, resTipologias] = await Promise.all([
        fetch('/api/planes_servicio', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/facultades', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/tipologias', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resPlanes.ok) {
        const dataPlanes = await resPlanes.json();
        setPlanes(dataPlanes.planes || []);
      }
      if (resFacultades.ok) {
        const dataFacultades = await resFacultades.json();
        setFacultades(dataFacultades.facultades || []);
      }
      if (resTipologias.ok) {
        const dataTipologias = await resTipologias.json();
        setTipologias(dataTipologias.tipologias || []);
      }
    } catch (err: any) {
      setError('Error de conexión al cargar catálogos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, [token]);

  // Handle Add Plan
  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.trim()) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/planes_servicio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: newPlan.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear el plan de servicio');
      }

      setSuccess(`Plan de servicio "${data.nombre}" creado exitosamente.`);
      setNewPlan('');
      fetchCatalogs();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Update Plan
  const handleUpdatePlan = async (id: number) => {
    if (!editingPlanName.trim()) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/planes_servicio/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: editingPlanName.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar');
      }

      setSuccess('Plan de servicio actualizado correctamente.');
      setEditingPlanId(null);
      fetchCatalogs();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Plan
  const handleDeletePlan = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar el plan de servicio "${nombre}"? Los convenios que ya lo usen conservarán el texto previamente asignado.`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/planes_servicio/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo eliminar');
      }

      setSuccess(`Plan de servicio "${nombre}" eliminado de la tabla.`);
      fetchCatalogs();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  // Handle Add Facultad
  const handleAddFacultad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacultad.trim()) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/facultades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: newFacultad.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear la facultad');
      }

      setSuccess(`Facultad "${data.nombre}" creada exitosamente.`);
      setNewFacultad('');
      fetchCatalogs();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Update Facultad
  const handleUpdateFacultad = async (id: number) => {
    if (!editingFacultadName.trim()) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/facultades/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: editingFacultadName.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar');
      }

      setSuccess('Facultad actualizada correctamente.');
      setEditingFacultadId(null);
      fetchCatalogs();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Facultad
  const handleDeleteFacultad = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar la facultad "${nombre}"? Los convenios que ya la usen conservarán el texto previamente asignado.`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/facultades/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo eliminar');
      }

      setSuccess(`Facultad "${nombre}" eliminada de la tabla.`);
      fetchCatalogs();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  // Handle Add Tipologia
  const handleAddTipologia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTipologia.trim()) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/tipologias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: newTipologia.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear la tipología');
      }

      setSuccess(`Tipología "${data.nombre}" creada exitosamente.`);
      setNewTipologia('');
      fetchCatalogs();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Update Tipologia
  const handleUpdateTipologia = async (id: number) => {
    if (!editingTipologiaName.trim()) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/tipologias/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: editingTipologiaName.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar');
      }

      setSuccess('Tipología actualizada correctamente.');
      setEditingTipologiaId(null);
      fetchCatalogs();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Tipologia
  const handleDeleteTipologia = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar la tipología "${nombre}"? Los convenios que ya la usen conservarán el texto previamente asignado.`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/tipologias/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo eliminar');
      }

      setSuccess(`Tipología "${nombre}" eliminada de la tabla.`);
      fetchCatalogs();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar');
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center max-w-xl mx-auto my-8 shadow-xs">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Acceso Restringido a Administradores</h3>
        <p className="text-xs text-slate-500 mt-2">
          Solo los usuarios con rol de <strong>Administrador</strong> tienen privilegios para crear, modificar o eliminar ítems de las tablas maestras de Plan de Servicio, Facultad Responsable y Tipología de Convenio.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden" id="catalogs-management-module">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Gestión de Catálogos de Base de Datos
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Administra los ítems fijos para los campos desplegables de <strong>Plan de Servicio</strong>, <strong>Facultad Responsable</strong> y <strong>Tipología</strong> en los convenios.
          </p>
        </div>
        <button
          onClick={fetchCatalogs}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
          title="Actualizar tablas"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Internal Tabs */}
      <div className="px-6 bg-slate-50 border-b border-slate-100 flex gap-4">
        <button
          type="button"
          onClick={() => { setActiveTab('planes'); setError(''); setSuccess(''); }}
          className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'planes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Planes de Servicio ({planes.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('facultades'); setError(''); setSuccess(''); }}
          className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'facultades'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Facultades Responsables ({facultades.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('tipologias'); setError(''); setSuccess(''); }}
          className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'tipologias'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          Tipologías de Convenio ({tipologias.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}

        {/* TAB 1: PLANES DE SERVICIO */}
        {activeTab === 'planes' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Add New Plan */}
            <div className="lg:col-span-4 bg-slate-50 p-5 rounded-xl border border-slate-200/70">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                Agregar Plan de Servicio
              </h4>

              <form onSubmit={handleAddPlan} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nombre del Plan / Convocatoria
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    placeholder="Ej. Convocatoria Colciencias 2026"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-indigo-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Este nombre aparecerá en la lista desplegable al registrar nuevos convenios.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !newPlan.trim()}
                  className="w-full py-2 px-4 border border-transparent rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-2xs disabled:bg-indigo-300"
                >
                  {submitting ? 'Guardando...' : 'Agregar a la Base de Datos'}
                </button>
              </form>
            </div>

            {/* List Planes */}
            <div className="lg:col-span-8">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Tabla `planes_servicio` en la Base de Datos ({planes.length} ítems)
              </h4>

              <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase w-16">
                        ID
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase">
                        Plan de Servicio / Convocatoria
                      </th>
                      <th scope="col" className="relative px-4 py-2.5 text-right">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {planes.map((p) => {
                      const isEditing = editingPlanId === p.id;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">
                            #{p.id}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingPlanName}
                                  onChange={(e) => setEditingPlanName(e.target.value)}
                                  className="px-2.5 py-1 text-xs border border-indigo-500 rounded-lg w-full focus:outline-none"
                                />
                                <button
                                  onClick={() => handleUpdatePlan(p.id)}
                                  disabled={submitting}
                                  className="p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                  title="Guardar cambio"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingPlanId(null)}
                                  className="p-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-800">
                                {p.nombre}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-semibold">
                            {!isEditing && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingPlanId(p.id);
                                    setEditingPlanName(p.nombre);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                                  title="Editar nombre"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePlan(p.id, p.nombre)}
                                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                  title="Eliminar de la tabla"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FACULTADES RESPONSABLES */}
        {activeTab === 'facultades' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Add New Facultad */}
            <div className="lg:col-span-4 bg-slate-50 p-5 rounded-xl border border-slate-200/70">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                Agregar Facultad Responsable
              </h4>

              <form onSubmit={handleAddFacultad} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nombre de la Facultad
                  </label>
                  <input
                    type="text"
                    required
                    value={newFacultad}
                    onChange={(e) => setNewFacultad(e.target.value)}
                    placeholder="Ej. Facultad de Ciencias Exactas"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-indigo-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Este nombre aparecerá en la lista desplegable al registrar nuevos convenios.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !newFacultad.trim()}
                  className="w-full py-2 px-4 border border-transparent rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-2xs disabled:bg-indigo-300"
                >
                  {submitting ? 'Guardando...' : 'Agregar a la Base de Datos'}
                </button>
              </form>
            </div>

            {/* List Facultades */}
            <div className="lg:col-span-8">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Tabla `facultades` en la Base de Datos ({facultades.length} ítems)
              </h4>

              <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase w-16">
                        ID
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase">
                        Facultad Responsable
                      </th>
                      <th scope="col" className="relative px-4 py-2.5 text-right">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facultades.map((f) => {
                      const isEditing = editingFacultadId === f.id;
                      return (
                        <tr key={f.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">
                            #{f.id}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingFacultadName}
                                  onChange={(e) => setEditingFacultadName(e.target.value)}
                                  className="px-2.5 py-1 text-xs border border-indigo-500 rounded-lg w-full focus:outline-none"
                                />
                                <button
                                  onClick={() => handleUpdateFacultad(f.id)}
                                  disabled={submitting}
                                  className="p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                  title="Guardar cambio"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingFacultadId(null)}
                                  className="p-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-800">
                                {f.nombre}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-semibold">
                            {!isEditing && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingFacultadId(f.id);
                                    setEditingFacultadName(f.nombre);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                                  title="Editar nombre"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteFacultad(f.id, f.nombre)}
                                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                  title="Eliminar de la tabla"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TIPOLOGÍAS DE CONVENIO */}
        {activeTab === 'tipologias' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Add New Tipología */}
            <div className="lg:col-span-4 bg-slate-50 p-5 rounded-xl border border-slate-200/70">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                Agregar Tipología de Convenio
              </h4>

              <form onSubmit={handleAddTipologia} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nombre de la Tipología
                  </label>
                  <input
                    type="text"
                    required
                    value={newTipologia}
                    onChange={(e) => setNewTipologia(e.target.value)}
                    placeholder="Ej. Convenio Marco"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-indigo-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Este nombre aparecerá en la lista desplegable al registrar nuevos convenios.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !newTipologia.trim()}
                  className="w-full py-2 px-4 border border-transparent rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-2xs disabled:bg-indigo-300"
                >
                  {submitting ? 'Guardando...' : 'Agregar a la Base de Datos'}
                </button>
              </form>
            </div>

            {/* List Tipologías */}
            <div className="lg:col-span-8">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Tabla `tipologias` en la Base de Datos ({tipologias.length} ítems)
              </h4>

              <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase w-16">
                        ID
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase">
                        Tipología de Convenio
                      </th>
                      <th scope="col" className="relative px-4 py-2.5 text-right">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tipologias.map((t) => {
                      const isEditing = editingTipologiaId === t.id;
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">
                            #{t.id}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingTipologiaName}
                                  onChange={(e) => setEditingTipologiaName(e.target.value)}
                                  className="px-2.5 py-1 text-xs border border-indigo-500 rounded-lg w-full focus:outline-none"
                                />
                                <button
                                  onClick={() => handleUpdateTipologia(t.id)}
                                  disabled={submitting}
                                  className="p-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                  title="Guardar cambio"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingTipologiaId(null)}
                                  className="p-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-800">
                                {t.nombre}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-semibold">
                            {!isEditing && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingTipologiaId(t.id);
                                    setEditingTipologiaName(t.nombre);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                                  title="Editar nombre"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTipologia(t.id, t.nombre)}
                                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                  title="Eliminar de la tabla"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
