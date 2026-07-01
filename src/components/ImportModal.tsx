import React, { useState, useRef } from 'react';
import { X, Upload, Clipboard, CheckCircle, AlertCircle, Info, FileSpreadsheet, Download, RefreshCw, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
  token: string;
}

export default function ImportModal({ onClose, onImportSuccess, token }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'excel' | 'json'>('excel');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  // Excel state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleTemplate = [
    {
      "codigo": "CIG-080",
      "titulo_proyecto": "Estudio Climatológico y de Riesgo de Desastres en Cuencas de Alta Montaña",
      "plan_servicio": "Convocatoria Nacional de Ciencias",
      "no_convenio": "CONV-2026-901",
      "investigador_principal": "Dr. Fernando Ruiz",
      "valor": 78000000,
      "fecha_inicio": "2026-02-15",
      "fecha_terminacion": "2026-08-15",
      "correo_responsable": "joan.fuentes@colegiobilingue.edu.co"
    }
  ];

  // Helper: Robust Date formatting (Excel serial or JS Date)
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

    normalized.plan_servicio = findValue(['plan_servicio', 'plan', 'servicio', 'plandeservicio', 'convocatoria']);
    normalized.correo_responsable = findValue(['correo_responsable', 'responsable_correo', 'correoresponsable', 'correo_del_responsable', 'responsable']);
    normalized.codigo = findValue(['codigo', 'code', 'codigo_convenio', 'cod', 'id_convenio']);
    normalized.titulo_proyecto = findValue(['titulo_proyecto', 'titulo', 'proyecto', 'nombre_proyecto', 'nombre_del_proyecto', 'tituloproyecto', 'objeto']);
    normalized.no_convenio = findValue(['no_convenio', 'numero_convenio', 'noconvenio', 'convenio_no', 'numero_de_convenio']);
    normalized.tipologia = findValue(['tipologia', 'tipo', 'clase', 'tipologia_convenio']);
    normalized.facultad = findValue(['facultad', 'facultad_dependencia', 'dependencia']);
    normalized.programa = findValue(['programa', 'programa_academico', 'carrera']);
    normalized.grupo = findValue(['grupo', 'grupo_investigacion', 'grupo_de_investigacion', 'nombre_grupo']);
    normalized.codigo_grupo = findValue(['codigo_grupo', 'cod_grupo', 'codigogrupo']);
    normalized.categoria = findValue(['categoria', 'categoria_grupo', 'cat']);
    normalized.investigador_principal = findValue(['investigador_principal', 'investigador', 'director', 'director_proyecto', 'investigadorprincipal', 'ip']);
    normalized.cedula = findValue(['cedula', 'documento', 'cc', 'cedula_investigador']);
    normalized.coinvestigador = findValue(['coinvestigador', 'co_investigador']);
    
    const rawValor = findValue(['valor', 'monto', 'presupuesto', 'costo', 'valor_total', 'precio']);
    if (rawValor !== undefined) {
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
    
    // Date processing using the helper
    normalized.fecha_inicio = formatDate(findValue(['fecha_inicio', 'inicio', 'fecha_de_inicio', 'fechainicio']));
    normalized.fecha_terminacion = formatDate(findValue(['fecha_terminacion', 'terminacion', 'vencimiento', 'fecha_fin', 'fecha_de_terminacion', 'fechaterminacion']));
    normalized.primer_informe = formatDate(findValue(['primer_informe', 'informe_1', '1er_informe', 'primerinforme']));
    normalized.fecha_suspension = formatDate(findValue(['fecha_suspension', 'suspension', 'fecha_de_suspension', 'fechasuspension']));
    normalized.fecha_reinicio = formatDate(findValue(['fecha_reinicio', 'reinicio', 'fecha_de_reinicio', 'fechareinicio']));
    normalized.fecha_acta_aprobacion_ampliacion_poliza = formatDate(findValue(['fecha_acta_aprobacion_ampliacion_poliza', 'acta_ampliacion', 'ampliacion_poliza']));
    normalized.fecha_terminacion_ampliacion = formatDate(findValue(['fecha_terminacion_ampliacion', 'terminacion_ampliacion', 'fecha_ampliacion']));
    normalized.segundo_informe = formatDate(findValue(['segundo_informe', 'informe_2', '2do_informe', 'segundoinforme']));
    normalized.correo_investigador = findValue(['correo_investigador', 'investigador_correo', 'correoinvestigador']);
    normalized.fecha_terminacion_prorroga = formatDate(findValue(['fecha_terminacion_prorroga', 'terminacion_prorroga', 'prorroga', 'fecha_prorroga']));

    return normalized;
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
        
        // Check if any mapped rows have codigo
        const validRows = mapped.filter(r => r.codigo || r.titulo_proyecto);
        if (validRows.length === 0) {
          throw new Error('No se detectaron convenios con código o título de proyecto válido. Revisa los encabezados del archivo.');
        }

        setParsedRows(mapped);
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
        setError('Formato no soportado. Por favor, carga únicamente archivos Excel (.xlsx o .xls).');
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

  // Download Sample Template XLSX
  const downloadExcelTemplate = () => {
    const headers = [
      'codigo', 'titulo_proyecto', 'plan_servicio', 'no_convenio', 'tipologia', 
      'facultad', 'programa', 'grupo', 'codigo_grupo', 'categoria', 
      'investigador_principal', 'cedula', 'coinvestigador', 'valor', 
      'valor_letras', 'duracion', 'disponibilidad_presupuestal', 'registro_presupuestal', 
      'acta_aprobacion_poliza', 'fecha_inicio', 'fecha_terminacion', 'primer_informe', 
      'fecha_suspension', 'fecha_reinicio', 'fecha_acta_aprobacion_ampliacion_poliza', 
      'fecha_terminacion_ampliacion', 'segundo_informe', 'correo_investigador', 
      'fecha_terminacion_prorroga', 'correo_responsable'
    ];
    
    const sampleRows = [
      {
        codigo: 'CIG-090',
        titulo_proyecto: 'Implementación de IA para Monitoreo de Cultivos Hidropónicos',
        plan_servicio: 'Convocatoria de Tecnología Agro',
        no_convenio: 'CONV-2026-112',
        tipologia: 'Estándar',
        facultad: 'Facultad de Ingeniería',
        programa: 'Ingeniería Mecatrónica',
        grupo: 'BioMeca',
        codigo_grupo: 'GR-BME-02',
        categoria: 'A1',
        investigador_principal: 'Dra. Sofía Restrepo',
        cedula: '101728399',
        coinvestigador: 'Ing. Mateo Jaramillo',
        valor: 92000000,
        valor_letras: 'Noventa y dos millones de pesos m/cte',
        duracion: '12 meses',
        disponibilidad_presupuestal: 'CDP-2026-110',
        registro_presupuestal: 'RP-2026-204',
        acta_aprobacion_poliza: 'Acta Pol-39',
        fecha_inicio: '2026-02-01',
        fecha_terminacion: '2027-02-01',
        primer_informe: '2026-08-01',
        fecha_suspension: '',
        fecha_reinicio: '',
        fecha_acta_aprobacion_ampliacion_poliza: '',
        fecha_terminacion_ampliacion: '',
        segundo_informe: 'Pendiente',
        correo_investigador: 'sofia.restrepo@universidad.edu.co',
        fecha_terminacion_prorroga: '',
        correo_responsable: 'joan.fuentes@colegiobilingue.edu.co'
      },
      {
        codigo: 'CIG-091',
        titulo_proyecto: 'Estudio Geológico de Microcuencas en la Zona Andina',
        plan_servicio: 'Desarrollo Ambiental Sostenible',
        no_convenio: 'CONV-2026-113',
        tipologia: 'Especial',
        facultad: 'Facultad de Ciencias de la Tierra',
        programa: 'Geología',
        grupo: 'GeoAndina',
        codigo_grupo: 'GR-AND-15',
        categoria: 'B',
        investigador_principal: 'Dr. Alejandro Gaviria',
        cedula: '79883900',
        coinvestigador: 'Geól. Andrea Rojas',
        valor: 145000000,
        valor_letras: 'Ciento cuarenta y cinco millones de pesos m/cte',
        duracion: '18 meses',
        disponibilidad_presupuestal: 'CDP-2026-111',
        registro_presupuestal: 'RP-2026-205',
        acta_aprobacion_poliza: 'Acta Pol-40',
        fecha_inicio: '2026-03-15',
        fecha_terminacion: '2027-09-15',
        primer_informe: '2026-09-15',
        fecha_suspension: '',
        fecha_reinicio: '',
        fecha_acta_aprobacion_ampliacion_poliza: '',
        fecha_terminacion_ampliacion: '',
        segundo_informe: 'Pendiente',
        correo_investigador: 'alejandro.gaviria@universidad.edu.co',
        fecha_terminacion_prorroga: '',
        correo_responsable: 'joan.fuentes@colegiobilingue.edu.co'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Convenios_Importar');
    
    XLSX.writeFile(wb, 'Plantilla_Importacion_Convenios.xlsx');
  };

  // Submit parsed data (JSON or Excel parsed rows) to API
  const handleImport = async (dataToImport: any[]) => {
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
        body: JSON.stringify(dataToImport)
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

  const handleJsonSubmit = () => {
    if (!jsonText.trim()) return;
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('El JSON debe ser un arreglo de objetos.');
      }
      handleImport(parsed);
    } catch (err: any) {
      setError(err.message || 'El texto ingresado no es un JSON válido.');
    }
  };

  const loadDemoBatch = () => {
    const today = new Date();
    const formatOffset = (days: number) => {
      const d = new Date();
      d.setDate(today.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const demoBatch = [
      {
        codigo: "CIG-055",
        titulo_proyecto: "Sistemas Agroforestales Sostenibles para Pequeños Productores en Zonas Posconflicto",
        plan_servicio: "Desarrollo Rural de Cundinamarca",
        no_convenio: "CONV-DR-55",
        tipologia: "Estándar",
        facultad: "Ciencias Agropecuarias",
        programa: "Zootecnia",
        investigador_principal: "MSc. Camila Forero",
        valor: 42000000,
        valor_letras: "Cuarenta y dos millones de pesos m/cte",
        duracion: "8 meses",
        fecha_inicio: formatOffset(-120),
        fecha_terminacion: formatOffset(12),
        primer_informe: formatOffset(-30),
        segundo_informe: "Pendiente",
        correo_investigador: "camila.forero@universidad.edu.co",
        correo_responsable: "joan.fuentes@colegiobilingue.edu.co"
      },
      {
        codigo: "CIG-099",
        titulo_proyecto: "Desarrollo de Biopolímeros Biodegradables a partir de Desechos de Piña",
        plan_servicio: "Innovación Tecnológica e Industrial",
        no_convenio: "CONV-BIO-99",
        tipologia: "Especial",
        facultad: "Facultad de Ingeniería",
        programa: "Ingeniería Química",
        investigador_principal: "Dra. Liliana Patricia Rojas",
        valor: 95000000,
        valor_letras: "Noventa y cinco millones de pesos m/cte",
        duracion: "12 meses",
        fecha_inicio: formatOffset(-180),
        fecha_terminacion: formatOffset(75),
        primer_informe: formatOffset(-90),
        segundo_informe: "Entregado",
        correo_investigador: "liliana.rojas@universidad.edu.co",
        correo_responsable: "joan.fuentes@colegiobilingue.edu.co"
      }
    ];

    setJsonText(JSON.stringify(demoBatch, null, 2));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Importar Convenios en Lote
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Carga múltiples convenios a la vez en la base de datos local desde archivos de Excel o texto JSON.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 border-b border-slate-100 flex gap-4 bg-slate-50/50">
          <button
            onClick={() => { setActiveTab('excel'); setError(''); setResult(null); }}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'excel'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Archivo de Excel (.xlsx, .xls)
          </button>
          <button
            onClick={() => { setActiveTab('json'); setError(''); setResult(null); }}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'json'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            Texto JSON (Avanzado)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-800 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">Error de Validación</p>
                <p className="mt-0.5 font-medium">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="p-5 bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs rounded-xl space-y-2">
              <p className="font-bold text-sm flex items-center gap-1.5 text-emerald-800">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                ¡Importación Procesada Exitosamente!
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-sm bg-white/60 p-3 rounded-lg border border-emerald-200/50 mt-1 font-semibold">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">Registros Cargados</span>
                  <span className="text-base text-emerald-700 font-extrabold">{result.importedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">Omisiones / Duplicados</span>
                  <span className="text-base text-slate-600 font-extrabold">{result.errorCount}</span>
                </div>
              </div>
              
              {result.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-200/50">
                  <p className="font-bold text-slate-600 uppercase text-[9px] tracking-wider mb-1">Detalle de omisiones/errores:</p>
                  <div className="max-h-[120px] overflow-y-auto space-y-1 font-mono text-[10px] bg-white/40 p-2 rounded-md">
                    {result.errors.map((e: string, i: number) => (
                      <p key={i} className="text-red-700/90">• {e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: EXCEL */}
          {activeTab === 'excel' && !result && (
            <div className="space-y-4">
              
              {/* Info Box */}
              <div className="p-4 bg-slate-50 text-slate-600 border border-slate-150 rounded-xl text-xs flex items-start gap-3">
                <Info className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-slate-800">Carga Inteligente con Mapeo Automático:</p>
                  <p className="mt-0.5">
                    Puedes cargar cualquier hoja de Excel. El sistema identificará de forma inteligente las columnas como <strong>código</strong>, <strong>título de proyecto</strong>, <strong>fechas</strong> y <strong>valores</strong> sin importar si las tildes o mayúsculas varían. Las fechas se normalizarán automáticamente.
                  </p>
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
                      ? 'border-indigo-500 bg-indigo-50/50' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/20'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx, .xls"
                    className="hidden" 
                  />
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3">
                    <Upload className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Arrastra y suelta tu archivo de Excel aquí</h3>
                  <p className="text-slate-400 text-[11px] mt-1">Soporta formatos .xlsx y .xls de Microsoft Excel</p>
                  
                  <div className="flex gap-3 mt-5">
                    <button
                      type="button"
                      onClick={triggerFileSelect}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      Seleccionar Archivo
                    </button>
                    <button
                      type="button"
                      onClick={downloadExcelTemplate}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Plantilla
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-150 rounded-2xl p-5 bg-white space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">{selectedFile.name}</h4>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          Tamaño: {(selectedFile.size / 1024).toFixed(1)} KB | Filas detectadas: <strong className="text-emerald-600 font-bold">{parsedRows.length}</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearExcelSelection}
                      className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Cambiar Archivo
                    </button>
                  </div>

                  {/* Excel Rows Preview */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Vista Previa de Importación (Primeras 5 Filas)</span>
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-[11px] text-left text-slate-600 border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <th className="p-2.5">Código</th>
                            <th className="p-2.5">Proyecto</th>
                            <th className="p-2.5">IP / Director</th>
                            <th className="p-2.5">Monto (COP)</th>
                            <th className="p-2.5">Fecha Inicio</th>
                            <th className="p-2.5">Fecha Vence</th>
                            <th className="p-2.5">Correo Responsable</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {parsedRows.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-bold text-slate-800 font-mono">{row.codigo || <span className="text-red-400 font-sans italic">Falta</span>}</td>
                              <td className="p-2.5 max-w-[200px] truncate">{row.titulo_proyecto || <span className="text-red-400 italic">Falta</span>}</td>
                              <td className="p-2.5 truncate">{row.investigador_principal || '-'}</td>
                              <td className="p-2.5 font-semibold text-emerald-600">
                                {row.valor ? `$${new Intl.NumberFormat('es-CO').format(row.valor)}` : '-'}
                              </td>
                              <td className="p-2.5 font-mono">{row.fecha_inicio || '-'}</td>
                              <td className="p-2.5 font-mono">{row.fecha_terminacion || '-'}</td>
                              <td className="p-2.5 font-semibold text-indigo-600 truncate">{row.correo_responsable || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedRows.length > 5 && (
                      <span className="text-[10px] text-slate-400 font-medium block text-right italic">
                        + {parsedRows.length - 5} convenios adicionales serán procesados en lote.
                      </span>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: JSON PASTE */}
          {activeTab === 'json' && !result && (
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arreglo JSON de Convenios</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setJsonText(JSON.stringify(sampleTemplate, null, 2))}
                    className="text-xs font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 transition-all flex items-center gap-1"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    Cargar Formato Base
                  </button>
                  <button
                    onClick={loadDemoBatch}
                    className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-lg shadow-2xs transition-all flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Casos de Prueba (Demo)
                  </button>
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={10}
                className="block w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                placeholder={`[\n  {\n    "codigo": "CIG-095", \n    "titulo_proyecto": "Análisis de Datos Agrarios",\n    "correo_responsable": "joan.fuentes@colegiobilingue.edu.co"\n  }\n]`}
              />

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          <div className="text-[11px] text-slate-400 font-semibold">
            {activeTab === 'excel' && selectedFile && (
              <span className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                Listo para enviar {parsedRows.length} convenios
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
            
            {!result && activeTab === 'excel' && (
              <button
                onClick={() => handleImport(parsedRows)}
                disabled={loading || parsedRows.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                {loading ? 'Procesando...' : 'Iniciar Importación'}
              </button>
            )}

            {!result && activeTab === 'json' && (
              <button
                onClick={handleJsonSubmit}
                disabled={loading || !jsonText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                {loading ? 'Procesando...' : 'Importar JSON'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
