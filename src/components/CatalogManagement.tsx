import React, { useState, useEffect, useRef } from 'react';
import { Database, Plus, Trash2, Edit2, Check, X, Shield, RefreshCw, AlertCircle, CheckCircle2, Layers, Building2, Tag, FileSpreadsheet, Upload, Download, FileText, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
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

  // Excel Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importWorkbook, setImportWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [importTargetCatalog, setImportTargetCatalog] = useState<'planes_servicio' | 'facultades' | 'tipologias'>('planes_servicio');
  const [parsedImportItems, setParsedImportItems] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Example Excel Template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const wsPlanes = XLSX.utils.aoa_to_sheet([
      ['Nombre'],
      ['Convocatoria Colciencias 2026'],
      ['Plan de Desarrollo Regional'],
      ['Programa Marco de Innovación']
    ]);
    XLSX.utils.book_append_sheet(wb, wsPlanes, 'Planes de Servicio');

    const wsFacultades = XLSX.utils.aoa_to_sheet([
      ['Nombre'],
      ['Facultad de Medicina y Ciencias de la Salud'],
      ['Facultad de Arquitectura y Diseño'],
      ['Facultad de Educación y Humanidades']
    ]);
    XLSX.utils.book_append_sheet(wb, wsFacultades, 'Facultades Responsables');

    const wsTipologias = XLSX.utils.aoa_to_sheet([
      ['Nombre'],
      ['Convenio Específico de Prácticas'],
      ['Convenio Marco de Cooperación'],
      ['Convenio de Movilidad Académica']
    ]);
    XLSX.utils.book_append_sheet(wb, wsTipologias, 'Tipologias');

    XLSX.writeFile(wb, 'Plantilla_Catalogos_Convenios.xlsx');
  };

  // Extract non-empty text strings from sheet
  const extractItemsFromSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) {
      setParsedImportItems([]);
      return;
    }

    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const extractedSet = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;

      for (let col = 0; col < row.length; col++) {
        const val = String(row[col] ?? '').trim();
        if (!val) continue;

        // Skip header words on the first row
        if (i === 0 && ['nombre', 'name', 'item', 'plan', 'facultad', 'tipologia', 'catálogo', 'catalogo'].includes(val.toLowerCase())) {
          continue;
        }

        if (val.length >= 2) {
          extractedSet.add(val);
        }
      }
    }

    setParsedImportItems(Array.from(extractedSet));
  };

  // Handle Excel file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      setImportWorkbook(workbook);
      setImportFileName(file.name);

      const tabToCatalog: Record<string, 'planes_servicio' | 'facultades' | 'tipologias'> = {
        planes: 'planes_servicio',
        facultades: 'facultades',
        tipologias: 'tipologias'
      };
      const initialCatalog = tabToCatalog[activeTab] || 'planes_servicio';
      setImportTargetCatalog(initialCatalog);

      const firstSheet = workbook.SheetNames[0] || '';
      setSelectedSheet(firstSheet);
      extractItemsFromSheet(workbook, firstSheet);
      setShowImportModal(true);
    } catch (err: any) {
      setError('Error al leer el archivo Excel: ' + (err.message || 'Formato no soportado'));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (importWorkbook) {
      extractItemsFromSheet(importWorkbook, sheetName);
    }
  };

  // Helper to check if item already exists in DB
  const isItemExisting = (item: string) => {
    const clean = item.trim().toLowerCase();
    if (importTargetCatalog === 'planes_servicio') {
      return planes.some(p => p.nombre.trim().toLowerCase() === clean);
    }
    if (importTargetCatalog === 'facultades') {
      return facultades.some(f => f.nombre.trim().toLowerCase() === clean);
    }
    if (importTargetCatalog === 'tipologias') {
      return tipologias.some(t => t.nombre.trim().toLowerCase() === clean);
    }
    return false;
  };

  // Execute Excel Import batch API call
  const executeImport = async () => {
    if (parsedImportItems.length === 0) return;
    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/catalogs/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetTable: importTargetCatalog,
          items: parsedImportItems
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al importar catálogo desde Excel');
      }

      setSuccess(data.message);
      setShowImportModal(false);
      fetchCatalogs();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la importación');
    } finally {
      setImporting(false);
    }
  };

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
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx, .xls, .csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Gestión de Catálogos de Base de Datos
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Administra los ítems fijos para los campos desplegables de <strong>Plan de Servicio</strong>, <strong>Facultad Responsable</strong> y <strong>Tipología</strong> en los convenios.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Descargar plantilla Excel (.xlsx) con pestañas para Planes, Facultades y Tipologías"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Plantilla Excel</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Cargar archivo Excel (.xlsx, .xls, .csv) para importar datos masivos en catálogos"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar desde Excel</span>
          </button>

          <button
            onClick={fetchCatalogs}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200"
            title="Actualizar tablas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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

      {/* EXCEL IMPORT MODAL */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Importar Catálogo desde Excel
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Archivo seleccionado: <span className="text-emerald-700 font-mono font-bold">{importFileName}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5">
                {/* Options grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Sheet */}
                  {importWorkbook && importWorkbook.SheetNames.length > 1 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Hoja de Excel a Leer
                      </label>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-emerald-500"
                      >
                        {importWorkbook.SheetNames.map((sheet) => (
                          <option key={sheet} value={sheet}>
                            Hoja: {sheet}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Select Target Catalog */}
                  <div className={importWorkbook && importWorkbook.SheetNames.length > 1 ? '' : 'sm:col-span-2'}>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Catálogo Destino en Base de Datos
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportTargetCatalog('planes_servicio')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          importTargetCatalog === 'planes_servicio'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Layers className="w-4 h-4" />
                        <span>Planes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportTargetCatalog('facultades')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          importTargetCatalog === 'facultades'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Facultades</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportTargetCatalog('tipologias')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          importTargetCatalog === 'tipologias'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Tag className="w-4 h-4" />
                        <span>Tipologías</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items Preview Box */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Vista Previa de Registros ({parsedImportItems.length} detectados)
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {parsedImportItems.filter(i => !isItemExisting(i)).length} Nuevos
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        {parsedImportItems.filter(i => isItemExisting(i)).length} Ya existen
                      </span>
                    </div>
                  </div>

                  {parsedImportItems.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      No se encontraron textos legibles en esta hoja del Excel.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 p-2 space-y-1.5 divide-y divide-slate-100">
                      {parsedImportItems.map((item, idx) => {
                        const exists = isItemExisting(item);
                        return (
                          <div key={idx} className="flex items-center justify-between pt-1.5 px-2">
                            <span className="text-xs font-medium text-slate-800 truncate pr-2">
                              {item}
                            </span>
                            {exists ? (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md shrink-0">
                                Ya existe en BD
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md shrink-0 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                Nuevo registro
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={executeImport}
                  disabled={importing || parsedImportItems.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-2xs transition-all disabled:bg-emerald-300 cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {importing
                      ? 'Importando...'
                      : `Importar ${parsedImportItems.filter(i => !isItemExisting(i)).length} Registros Nuevos`}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
