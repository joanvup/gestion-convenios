import { useState } from 'react';
import { X, Upload, Clipboard, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
  token: string;
}

export default function ImportModal({ onClose, onImportSuccess, token }: ImportModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const sampleTemplate = [
    {
      "codigo": "CIG-080",
      "titulo_proyecto": "Estudio Climatológico y de Riesgo de Desastres en Cuencas de Alta Montaña",
      "plan_servicio": "Convocatoria Nacional de Ciencias",
      "no_convenio": "CONV-2026-901",
      "investigador_principal": "Dr. Fernando Ruiz",
      "valor": 78000000,
      "fecha_inicio": "2026-02-15",
      "fecha_terminacion": "2026-08-15"
    }
  ];

  const handleImport = async (textToImport: string) => {
    setError('');
    setResult(null);
    setLoading(true);

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(textToImport);
      } catch (jsonErr) {
        throw new Error('El texto ingresado no es un JSON válido. Asegúrate de respetar el formato del ejemplo.');
      }

      if (!Array.isArray(parsedData)) {
        throw new Error('El JSON debe ser un arreglo de convenios (ej. [{"codigo": "...", "titulo_proyecto": "..."}])');
      }

      const res = await fetch('/api/convenios/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(parsedData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la importación.');
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

  const loadDemoBatch = () => {
    const today = new Date();
    
    // Day math
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
        fecha_terminacion: formatOffset(12), // Expiring in 12 days! Urgent.
        primer_informe: formatOffset(-30),
        segundo_informe: "Pendiente",
        correo_investigador: "camila.forero@universidad.edu"
      },
      {
        codigo: "CIG-099",
        titulo_proyecto: "Desarrollo de Biopolímeros Biodegradables a partir de Desechos de la Industria de la Piña",
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
        fecha_terminacion: formatOffset(75), // Expiring in 75 days! Warning_low.
        primer_informe: formatOffset(-90),
        segundo_informe: "Entregado",
        correo_investigador: "liliana.rojas@universidad.edu"
      },
      {
        codigo: "CIG-032",
        titulo_proyecto: "Análisis y Caracterización de Materiales Compuestos de Alta Resistencia para Estructuras Civiles",
        plan_servicio: "Línea Especial de Infraestructura",
        no_convenio: "CONV-CIVIL-32",
        tipologia: "Marco",
        facultad: "Facultad de Ingeniería",
        programa: "Ingeniería Civil",
        investigador_principal: "Dr. Gustavo Petro Ortiz",
        valor: 110000000,
        valor_letras: "Ciento diez millones de pesos m/cte",
        duracion: "24 meses",
        fecha_inicio: formatOffset(-400),
        fecha_terminacion: formatOffset(-15), // Already EXPIRED 15 days ago! Critical.
        correo_investigador: "gustavo.civil@universidad.edu"
      },
      {
        codigo: "CIG-071",
        titulo_proyecto: "Implementación de Tecnologías Blockchain para la Trazabilidad de Cacao Orgánico de Exportación",
        plan_servicio: "Convocatoria Regional Santander",
        no_convenio: "CONV-SANT-71",
        tipologia: "Asociado",
        facultad: "Facultad de Ciencias Económicas",
        programa: "Negocios Internacionales",
        investigador_principal: "Ing. Jorge Villamizar",
        valor: 58000000,
        valor_letras: "Cincuenta y ocho millones de pesos m/cte",
        duracion: "10 meses",
        fecha_inicio: formatOffset(-150),
        fecha_terminacion: formatOffset(150),
        fecha_suspension: formatOffset(-45), // Active SUSPENSION!
        correo_investigador: "jorge.v@universidad.edu"
      }
    ];

    setJsonText(JSON.stringify(demoBatch, null, 2));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-100 flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Importar Convenios en Lote</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Carga múltiples convenios a la vez en la base de datos local SQLite
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          <div className="p-3.5 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-xl text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Instrucciones de Carga:</p>
              <p className="mt-0.5 leading-relaxed">
                Puedes copiar y pegar un archivo JSON en forma de arreglo de objetos que cumplan con la estructura del modelo de base de datos local. Las propiedades mínimas recomendadas son <strong className="font-mono">codigo</strong> y <strong className="font-mono">titulo_proyecto</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Editor JSON de Convenios</span>
            <div className="flex gap-2">
              <button
                onClick={() => setJsonText(JSON.stringify(sampleTemplate, null, 2))}
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 transition-all flex items-center gap-1"
              >
                <Clipboard className="w-3.5 h-3.5" />
                Cargar Plantilla Básica
              </button>
              <button
                onClick={loadDemoBatch}
                className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-lg shadow-2xs transition-all flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                Cargar Lote de Pruebas (4 Casos)
              </button>
            </div>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={10}
            className="block w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
            placeholder={`[\n  {\n    "codigo": "CIG-...", \n    "titulo_proyecto": "..." \n  }\n]`}
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                ¡Importación Procesada Exitosamente!
              </p>
              <ul className="list-disc pl-5 space-y-0.5 mt-1">
                <li>Registros cargados de manera exitosa: <strong>{result.importedCount}</strong></li>
                <li>Registros omitidos o fallidos: <strong>{result.errorCount}</strong></li>
              </ul>
              {result.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60 text-slate-500">
                  <p className="font-semibold text-[10px] text-slate-600 uppercase">Detalle de omisiones/errores:</p>
                  <div className="max-h-[80px] overflow-y-auto mt-1 space-y-0.5 font-mono text-[10px] list-none">
                    {result.errors.map((e: string, i: number) => (
                      <p key={i} className="text-red-600">• {e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-all"
          >
            {result ? 'Listo' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={() => handleImport(jsonText)}
              disabled={loading || !jsonText.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              {loading ? 'Procesando...' : 'Iniciar Importación'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
