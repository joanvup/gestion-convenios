import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle, AlertCircle, Info, FileSpreadsheet, Download, RefreshCw, FileCheck, Check, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
  token: string;
}

export default function ImportModal({ onClose, onImportSuccess, token }: ImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  // Excel state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Robust Date formatting (Excel serial or JS Date or String)
  const formatDate = (val: any): string | null => {
    if (val === undefined || val === null || val === '') return null;
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'number') {
      // Excel serial date number
      try {
        const date = new Date((val - 25569) * 86400 * 1000);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0];
      } catch {
        return null;
      }
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return null;
      // Already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      // Try to parse Spanish DD/MM/YYYY or DD-MM-YYYY
      const parts = trimmed.split(/[/\-.]/);
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        
        if (p2 > 1000 && p1 >= 1 && p1 <= 12 && p0 >= 1 && p0 <= 31) {
          // DD/MM/YYYY
          const date = new Date(p2, p1 - 1, p0);
          if (!isNaN(date.getTime())) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
          }
        } else if (p0 > 1000 && p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
          // YYYY/MM/DD
          const date = new Date(p0, p1 - 1, p2);
          if (!isNaN(date.getTime())) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
          }
        }
      }

      // Fallback native parse
      const nativeDate = new Date(trimmed);
      if (!isNaN(nativeDate.getTime())) {
        return nativeDate.toISOString().split('T')[0];
      }
    }
    return null;
  };

  // Helper: Normalize Excel Rows to DB structure
  const mapExcelRow = (row: any): any => {
    const normalized: any = {};
    
    const findValue = (possibleKeys: string[]): any => {
      for (const key of Object.keys(row)) {
        const cleanKey = key.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
          .replace(/[^a-z0-9_]/g, "") // remove spaces/special chars
          .trim();
          
        for (const pKey of possibleKeys) {
          const cleanPKey = pKey.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_]/g, "")
            .trim();
            
          if (cleanKey === cleanPKey || cleanKey.includes(cleanPKey) || cleanPKey.includes(cleanKey)) {
            return row[key];
          }
        }
      }
      return undefined;
    };

    normalized.codigo = findValue(['codigo', 'code', 'codigo_convenio', 'cod', 'id_convenio', 'codigo_interno']);
    normalized.titulo_proyecto = findValue(['titulo_proyecto', 'titulo', 'proyecto', 'nombre_proyecto', 'nombre_del_proyecto', 'tituloproyecto', 'objeto']);
    normalized.correo_investigador = findValue(['correo_investigador', 'investigador_correo', 'correoinvestigador', 'email_investigador', 'correo_ip']);
    normalized.correo_responsable_proceso = findValue(['correo_responsable_proceso', 'correo_responsable_proc', 'email_responsable_proceso', 'correoresponsableproceso']);
    normalized.fecha_inicio = formatDate(findValue(['fecha_inicio', 'inicio', 'fecha_de_inicio', 'fechainicio']));
    normalized.fecha_terminacion = formatDate(findValue(['fecha_terminacion', 'terminacion', 'vencimiento', 'fecha_fin', 'fecha_de_terminacion', 'fechaterminacion']));

    // Optional fields
    normalized.no_convenio = findValue(['no_convenio', 'numero_convenio', 'noconvenio', 'convenio_no', 'numero_de_convenio']);
    normalized.plan_servicio = findValue(['plan_servicio', 'plan', 'servicio', 'plandeservicio', 'convocatoria']);
    normalized.tipologia = findValue(['tipologia', 'tipo', 'clase', 'tipologia_convenio']);
    normalized.facultad = findValue(['facultad', 'facultad_dependencia', 'dependencia']);
    normalized.programa = findValue(['programa', 'programa_academico', 'carrera']);
    normalized.investigador_principal = findValue(['investigador_principal', 'investigador', 'director', 'director_proyecto', 'investigadorprincipal', 'ip']);
    normalized.cedula = findValue(['cedula', 'documento', 'cc', 'cedula_investigador']);
    normalized.responsable_proceso = findValue(['responsable_proceso', 'responsable_del_proceso', 'responsableproceso', 'coinvestigador', 'co_investigador']);
    normalized.cedula_responsable_proceso = findValue(['cedula_responsable_proceso', 'cedula_responsable', 'doc_responsable', 'documento_responsable_proceso']);
    normalized.grupo = findValue(['grupo', 'grupo_investigacion', 'grupo_de_investigacion', 'nombre_grupo', 'semillero', 'grupo_semillero']);
    normalized.codigo_grupo = findValue(['codigo_grupo', 'cod_grupo', 'codigogrupo']);
    normalized.categoria = findValue(['categoria', 'categoria_grupo', 'cat']);
    
    const rawValor = findValue(['valor', 'monto', 'presupuesto', 'costo', 'valor_total', 'precio']);
    if (rawValor !== undefined && rawValor !== null && rawValor !== '') {
      if (typeof rawValor === 'number') {
        normalized.valor = rawValor;
      } else if (typeof rawValor === 'string') {
        const cleanNum = rawValor.replace(/[^0-9.]/g, '');
        normalized.valor = parseFloat(cleanNum) || null;
      }
    } else {
      normalized.valor = null;
    }
    
    normalized.valor_letras = findValue(['valor_letras', 'monto_letras', 'valor_en_letras', 'valorletras']);
    normalized.duracion = findValue(['duracion', 'plazo', 'tiempo', 'duracion_meses', 'vigencia']);
    normalized.disponibilidad_presupuestal = findValue(['disponibilidad_presupuestal', 'cdp', 'disponibilidadpresupuestal']);
    normalized.registro_presupuestal = findValue(['registro_presupuestal', 'rp', 'registropresupuestal']);
    normalized.acta_aprobacion_poliza = findValue(['acta_aprobacion_poliza', 'poliza', 'actaaprobacionpoliza', 'acta_poliza']);
    
    normalized.primer_informe = formatDate(findValue(['primer_informe', 'informe_1', '1er_informe', 'primerinforme']));
    normalized.segundo_informe = formatDate(findValue(['segundo_informe', 'informe_2', '2do_informe', 'segundoinforme']));
    normalized.fecha_suspension = formatDate(findValue(['fecha_suspension', 'suspension', 'fecha_de_suspension', 'fechasuspension']));
    normalized.fecha_reinicio = formatDate(findValue(['fecha_reinicio', 'reinicio', 'fecha_de_reinicio', 'fechareinicio']));
    normalized.fecha_acta_aprobacion_ampliacion_poliza = formatDate(findValue(['fecha_acta_aprobacion_ampliacion_poliza', 'acta_ampliacion', 'ampliacion_poliza']));
    normalized.fecha_terminacion_ampliacion = formatDate(findValue(['fecha_terminacion_ampliacion', 'terminacion_ampliacion', 'fecha_ampliacion']));
    normalized.fecha_terminacion_prorroga = formatDate(findValue(['fecha_terminacion_prorroga', 'terminacion_prorroga', 'prorroga', 'fecha_prorroga']));
    normalized.correo_responsable = findValue(['correo_responsable', 'responsable_correo', 'correoresponsable']);

    return normalized;
  };

  // Validation checker for mapped row
  const validateRow = (row: any) => {
    const missing: string[] = [];
    if (!row.codigo) missing.push('código');
    if (!row.titulo_proyecto) missing.push('título');
    if (!row.correo_investigador) missing.push('correo investigador');
    if (!row.correo_responsable_proceso) missing.push('correo resp. proceso');
    if (!row.fecha_inicio) missing.push('fecha inicio');
    if (!row.fecha_terminacion) missing.push('fecha terminación');
    return {
      isValid: missing.length === 0,
      missing
    };
  };

  // Excel File Parsing logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processExcelFile(files[0]);
    }
  };

  const processExcelFile = (file: File) => {
    setError('');
    setResult(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse into json array
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (!Array.isArray(rawJson) || rawJson.length === 0) {
          throw new Error('El archivo Excel está vacío o no contiene filas de datos.');
        }

        // Map and normalize each row
        const mapped = rawJson.map(row => mapExcelRow(row));
        
        // Filter out completely empty rows
        const nonNullRows = mapped.filter(r => r.codigo || r.titulo_proyecto || r.correo_investigador);
        if (nonNullRows.length === 0) {
          throw new Error('No se detectaron filas con datos válidos de convenio. Verifica los encabezados de tu archivo Excel.');
        }

        setParsedRows(nonNullRows);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error al leer el archivo Excel. Asegúrate de que sea un archivo válido (.xlsx o .xls).');
        setSelectedFile(null);
        setParsedRows([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        processExcelFile(file);
      } else {
        setError('Formato no soportado. Por favor, carga únicamente archivos de Excel (.xlsx o .xls).');
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const clearExcelSelection = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setError('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download Official Excel Template
  const downloadExcelTemplate = () => {
    const headers = [
      'codigo',
      'titulo_proyecto',
      'correo_investigador',
      'correo_responsable_proceso',
      'fecha_inicio',
      'fecha_terminacion',
      'no_convenio',
      'plan_servicio',
      'tipologia',
      'facultad',
      'programa',
      'investigador_principal',
      'cedula',
      'responsable_proceso',
      'cedula_responsable_proceso',
      'grupo',
      'codigo_grupo',
      'categoria',
      'valor',
      'valor_letras',
      'duracion',
      'disponibilidad_presupuestal',
      'registro_presupuestal',
      'acta_aprobacion_poliza',
      'primer_informe',
      'segundo_informe',
      'fecha_acta_aprobacion_ampliacion_poliza',
      'fecha_terminacion_ampliacion',
      'fecha_terminacion_prorroga',
      'fecha_suspension',
      'fecha_reinicio',
      'correo_responsable'
    ];
    
    const sampleRows = [
      {
        codigo: 'CIG-101',
        titulo_proyecto: 'Monitoreo Satelital e Inteligencia Artificial en Cultivos Agroindustriales',
        correo_investigador: 'investigador.principal@universidad.edu.co',
        correo_responsable_proceso: 'responsable.proceso@universidad.edu.co',
        fecha_inicio: '2026-03-01',
        fecha_terminacion: '2027-03-01',
        no_convenio: 'CONV-2026-101',
        plan_servicio: 'Convocatoria Nacional de Tecnología',
        tipologia: 'Especial',
        facultad: 'Facultad de Ingeniería',
        programa: 'Ingeniería Mecatrónica',
        investigador_principal: 'Dra. María Paula Gómez',
        cedula: '1018293881',
        responsable_proceso: 'Ing. Carlos Alberto Ruiz',
        cedula_responsable_proceso: '79283912',
        grupo: 'BioMeca e IA',
        codigo_grupo: 'GR-BIA-01',
        categoria: 'A1',
        valor: 120000000,
        valor_letras: 'Ciento veinte millones de pesos m/cte',
        duracion: '12 meses',
        disponibilidad_presupuestal: 'CDP-2026-401',
        registro_presupuestal: 'RP-2026-802',
        acta_aprobacion_poliza: 'Acta Pol-102',
        primer_informe: '2026-09-01',
        segundo_informe: 'Pendiente',
        fecha_acta_aprobacion_ampliacion_poliza: '',
        fecha_terminacion_ampliacion: '',
        fecha_terminacion_prorroga: '',
        fecha_suspension: '',
        fecha_reinicio: '',
        correo_responsable: 'joan.fuentes@colegiobilingue.edu.co'
      },
      {
        codigo: 'CIG-102',
        titulo_proyecto: 'Evaluación de Microcuencas e Impacto Ambiental en la Cordillera Oriental',
        correo_investigador: 'a.gaviria@universidad.edu.co',
        correo_responsable_proceso: 'coordinacion.investigaciones@universidad.edu.co',
        fecha_inicio: '2026-04-15',
        fecha_terminacion: '2027-10-15',
        no_convenio: 'CONV-2026-102',
        plan_servicio: 'Desarrollo Sostenible Agro',
        tipologia: 'Estándar',
        facultad: 'Facultad de Ciencias de la Tierra',
        programa: 'Geología',
        investigador_principal: 'Dr. Alejandro Gaviria',
        cedula: '79883900',
        responsable_proceso: 'Geól. Andrea Rojas',
        cedula_responsable_proceso: '52938102',
        grupo: 'GeoAndina',
        codigo_grupo: 'GR-AND-15',
        categoria: 'B',
        valor: 95000000,
        valor_letras: 'Noventa y cinco millones de pesos m/cte',
        duracion: '18 meses',
        disponibilidad_presupuestal: 'CDP-2026-402',
        registro_presupuestal: 'RP-2026-803',
        acta_aprobacion_poliza: 'Acta Pol-103',
        primer_informe: '2026-10-15',
        segundo_informe: 'Pendiente',
        fecha_acta_aprobacion_ampliacion_poliza: '',
        fecha_terminacion_ampliacion: '',
        fecha_terminacion_prorroga: '',
        fecha_suspension: '',
        fecha_reinicio: '',
        correo_responsable: 'joan.fuentes@colegiobilingue.edu.co'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    
    // Set explicit column widths for readability
    ws['!cols'] = [
      { wch: 14 }, // codigo
      { wch: 50 }, // titulo_proyecto
      { wch: 32 }, // correo_investigador
      { wch: 35 }, // correo_responsable_proceso
      { wch: 14 }, // fecha_inicio
      { wch: 18 }, // fecha_terminacion
      { wch: 16 }, // no_convenio
      { wch: 28 }, // plan_servicio
      { wch: 14 }, // tipologia
      { wch: 25 }, // facultad
      { wch: 22 }, // programa
      { wch: 25 }, // investigador_principal
      { wch: 14 }, // cedula
      { wch: 25 }, // responsable_proceso
      { wch: 22 }, // cedula_responsable_proceso
      { wch: 18 }, // grupo
      { wch: 14 }, // codigo_grupo
      { wch: 10 }, // categoria
      { wch: 16 }, // valor
      { wch: 35 }, // valor_letras
      { wch: 12 }, // duracion
      { wch: 25 }, // disponibilidad_presupuestal
      { wch: 22 }, // registro_presupuestal
      { wch: 22 }, // acta_aprobacion_poliza
      { wch: 14 }, // primer_informe
      { wch: 14 }, // segundo_informe
      { wch: 28 }, // fecha_acta_aprobacion_ampliacion_poliza
      { wch: 25 }, // fecha_terminacion_ampliacion
      { wch: 25 }, // fecha_terminacion_prorroga
      { wch: 16 }, // fecha_suspension
      { wch: 14 }, // fecha_reinicio
      { wch: 30 }, // correo_responsable
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Convenios');
    
    XLSX.writeFile(wb, 'Plantilla_Oficial_Importacion_Convenios.xlsx');
  };

  // Submit parsed data to backend API
  const handleImport = async () => {
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/convenios/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(parsedRows)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la importación en el servidor.');
      }

      setResult(data);
      if (data.importedCount > 0) {
        onImportSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Error en la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const validRowCount = parsedRows.filter(r => validateRow(r).isValid).length;
  const invalidRowCount = parsedRows.length - validRowCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Importar Convenios en Lote (Excel)
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Carga múltiples registros de convenios desde una hoja de cálculo en formato Excel (.xlsx o .xls).
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">Error en la carga</p>
                <p className="mt-0.5 font-medium">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl space-y-3">
              <p className="font-extrabold text-sm flex items-center gap-2 text-emerald-800">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                ¡Resultado del Proceso de Importación!
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/80 p-3.5 rounded-xl border border-emerald-200/80 font-semibold shadow-2xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-extrabold">Convenios Creados</span>
                  <span className="text-lg text-emerald-700 font-black">{result.importedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-extrabold">Omitidos / Existentes</span>
                  <span className="text-lg text-amber-600 font-black">{result.errorCount}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase text-slate-400 block font-extrabold">Estado General</span>
                  <span className="text-xs text-slate-700 font-bold">
                    {result.importedCount > 0 ? 'Exitosa' : 'Sin cambios'}
                  </span>
                </div>
              </div>
              
              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60">
                  <p className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider mb-1.5">
                    Detalle de omisiones o advertencias:
                  </p>
                  <div className="max-h-[140px] overflow-y-auto space-y-1 font-mono text-[10px] bg-white p-2.5 rounded-lg border border-emerald-100">
                    {result.errors.map((e: string, i: number) => (
                      <p key={i} className="text-slate-700 font-medium">• {e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!result && (
            <div className="space-y-4">
              
              {/* Mandatory Fields Guide Box */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold">
                  <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                  <span>Requisitos de la Plantilla de Excel</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  El archivo Excel debe contener los siguientes <strong className="text-indigo-900">campos obligatorios</strong> por cada registro. Los demás campos son opcionales:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100/80 flex items-center gap-1.5 font-semibold text-[11px] text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong className="font-extrabold">codigo</strong> (Código interno)</span>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100/80 flex items-center gap-1.5 font-semibold text-[11px] text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong className="font-extrabold">titulo_proyecto</strong></span>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100/80 flex items-center gap-1.5 font-semibold text-[11px] text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong className="font-extrabold">correo_investigador</strong></span>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100/80 flex items-center gap-1.5 font-semibold text-[11px] text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong className="font-extrabold">correo_responsable_proceso</strong></span>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100/80 flex items-center gap-1.5 font-semibold text-[11px] text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong className="font-extrabold">fecha_inicio</strong> (AAAA-MM-DD)</span>
                  </div>
                  <div className="bg-white px-2.5 py-1.5 rounded-lg border border-indigo-100/80 flex items-center gap-1.5 font-semibold text-[11px] text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong className="font-extrabold">fecha_terminacion</strong> (AAAA-MM-DD)</span>
                  </div>
                </div>
              </div>

              {/* Upload Drop Zone / Selected File View */}
              {!selectedFile ? (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50/50' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx, .xls"
                    className="hidden" 
                  />
                  <div className="p-3.5 bg-emerald-100 text-emerald-700 rounded-2xl mb-3">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Carga tu archivo de Excel aquí</h3>
                  <p className="text-slate-400 text-[11px] mt-1">Arrastra el archivo o selecciones la hoja de cálculo (.xlsx o .xls)</p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                    <button
                      type="button"
                      onClick={triggerFileSelect}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      Seleccionar Archivo Excel
                    </button>
                    <button
                      type="button"
                      onClick={downloadExcelTemplate}
                      className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      Descargar Plantilla Oficial (.xlsx)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800">{selectedFile.name}</h4>
                        <p className="text-slate-500 text-[10px] mt-0.5 flex items-center gap-2">
                          <span>Tamaño: {(selectedFile.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>Filas analizadas: <strong className="text-emerald-700 font-bold">{parsedRows.length}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={downloadExcelTemplate}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-emerald-700 bg-slate-50 border border-slate-200 rounded-lg transition-all flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        Descargar Plantilla
                      </button>
                      <button
                        onClick={clearExcelSelection}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-all flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Cambiar Archivo
                      </button>
                    </div>
                  </div>

                  {/* Excel Rows Preview Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-slate-700 uppercase tracking-wider">
                        Vista Previa y Validación de Registros ({parsedRows.length})
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ {validRowCount} válidos
                        </span>
                        {invalidRowCount > 0 && (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            ⚠ {invalidRowCount} con campos faltantes
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[260px]">
                      <table className="w-full text-[11px] text-left text-slate-700 border-collapse">
                        <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase">
                          <tr>
                            <th className="p-2.5">Código*</th>
                            <th className="p-2.5 min-w-[180px]">Título Proyecto*</th>
                            <th className="p-2.5">Correo Investigador*</th>
                            <th className="p-2.5">Correo Resp. Proceso*</th>
                            <th className="p-2.5">F. Inicio*</th>
                            <th className="p-2.5">F. Vence*</th>
                            <th className="p-2.5 text-right">Monto</th>
                            <th className="p-2.5 text-center">Estado Validación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {parsedRows.map((row, idx) => {
                            const val = validateRow(row);
                            return (
                              <tr key={idx} className={val.isValid ? 'hover:bg-slate-50/60' : 'bg-amber-50/40 hover:bg-amber-50/70'}>
                                <td className="p-2.5 font-bold font-mono text-slate-800">
                                  {row.codigo || <span className="text-rose-500 italic">Falta</span>}
                                </td>
                                <td className="p-2.5 max-w-[220px] truncate" title={row.titulo_proyecto}>
                                  {row.titulo_proyecto || <span className="text-rose-500 italic">Falta</span>}
                                </td>
                                <td className="p-2.5 max-w-[150px] truncate text-indigo-700 font-medium">
                                  {row.correo_investigador || <span className="text-rose-500 italic">Falta</span>}
                                </td>
                                <td className="p-2.5 max-w-[150px] truncate text-indigo-700 font-medium">
                                  {row.correo_responsable_proceso || <span className="text-rose-500 italic">Falta</span>}
                                </td>
                                <td className="p-2.5 font-mono whitespace-nowrap">
                                  {row.fecha_inicio || <span className="text-rose-500 italic">Falta</span>}
                                </td>
                                <td className="p-2.5 font-mono whitespace-nowrap">
                                  {row.fecha_terminacion || <span className="text-rose-500 italic">Falta</span>}
                                </td>
                                <td className="p-2.5 font-semibold text-emerald-700 text-right whitespace-nowrap">
                                  {row.valor ? `$${new Intl.NumberFormat('es-CO').format(row.valor)}` : '-'}
                                </td>
                                <td className="p-2.5 text-center whitespace-nowrap">
                                  {val.isValid ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      <Check className="w-3 h-3 text-emerald-600" /> Completo
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300" title={`Faltan: ${val.missing.join(', ')}`}>
                                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Faltan {val.missing.length} datos
                                    </span>
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
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          <div className="text-[11px] text-slate-500 font-semibold">
            {selectedFile && parsedRows.length > 0 && (
              <span>
                Mostrando <strong className="text-slate-800">{parsedRows.length}</strong> convenios listos para importar.
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              {result ? 'Cerrar' : 'Cancelar'}
            </button>
            
            {!result && (
              <button
                onClick={handleImport}
                disabled={loading || parsedRows.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition-all shadow-2xs flex items-center gap-2 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {loading ? 'Importando...' : `Iniciar Importación (${parsedRows.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
