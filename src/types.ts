export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'usuario';
}

export interface Alerta {
  key: string;
  convenioId: number;
  convenioCodigo: string;
  convenioTitulo: string;
  tipo: 'vencido' | 'vence_pronto' | 'vence_pronto_90' | 'primer_informe' | 'poliza_pendiente' | 'suspendido';
  severidad: 'danger' | 'warning_high' | 'warning_low' | 'info';
  fechaReferencia: string;
  mensaje: string;
  diasRestantes: number | null;
}

export interface Convenio {
  id: number;
  plan_servicio: string | null;
  correo_responsable: string | null;
  codigo: string;
  titulo_proyecto: string;
  no_convenio: string | null;
  tipologia: string | null;
  facultad: string | null;
  programa: string | null;
  grupo: string | null;
  codigo_grupo: string | null;
  categoria: string | null;
  investigador_principal: string | null;
  cedula: string | null;
  coinvestigador: string | null;
  responsable_proceso: string | null;
  cedula_responsable_proceso: string | null;
  correo_responsable_proceso: string | null;
  valor: number | null;
  valor_letras: string | null;
  duracion: string | null;
  disponibilidad_presupuestal: string | null;
  registro_presupuestal: string | null;
  acta_aprobacion_poliza: string | null;
  fecha_inicio: string | null; // YYYY-MM-DD
  fecha_terminacion: string | null; // YYYY-MM-DD
  primer_informe: string | null; // YYYY-MM-DD
  fecha_suspension: string | null; // YYYY-MM-DD or TEXT
  fecha_reinicio: string | null; // YYYY-MM-DD
  fecha_acta_aprobacion_ampliacion_poliza: string | null; // YYYY-MM-DD
  fecha_terminacion_ampliacion: string | null; // YYYY-MM-DD
  segundo_informe: string | null; // TEXT or YYYY-MM-DD
  correo_investigador: string | null;
  fecha_terminacion_prorroga: string | null; // YYYY-MM-DD
  created_at?: string;
  alerts?: Alerta[];
  alertCount?: number;
}

export interface AuditLog {
  id: number;
  user_email: string;
  user_name: string | null;
  action: 'CREACION' | 'EDICION' | 'ELIMINACION' | 'IMPORTACION' | string;
  entity_type: string;
  entity_id: string | null;
  details: string;
  created_at: string;
}
