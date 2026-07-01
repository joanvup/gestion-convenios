import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.resolve(process.cwd(), 'convenios.db');
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON');

  // Create Users Table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'usuario'
    )
  `);

  // Create Convenios Table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS convenios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_servicio TEXT,
      correo_responsable TEXT,
      codigo TEXT UNIQUE NOT NULL,
      titulo_proyecto TEXT NOT NULL,
      no_convenio TEXT,
      tipologia TEXT,
      facultad TEXT,
      programa TEXT,
      grupo TEXT,
      codigo_grupo TEXT,
      categoria TEXT,
      investigador_principal TEXT,
      cedula TEXT,
      coinvestigador TEXT,
      valor REAL,
      valor_letras TEXT,
      duracion TEXT,
      disponibilidad_presupuestal TEXT,
      registro_presupuestal TEXT,
      acta_aprobacion_poliza TEXT,
      fecha_inicio TEXT, -- YYYY-MM-DD
      fecha_terminacion TEXT, -- YYYY-MM-DD
      primer_informe TEXT, -- YYYY-MM-DD
      fecha_suspension TEXT, -- TEXT or YYYY-MM-DD
      fecha_reinicio TEXT, -- YYYY-MM-DD
      fecha_acta_aprobacion_ampliacion_poliza TEXT, -- YYYY-MM-DD
      fecha_terminacion_ampliacion TEXT, -- YYYY-MM-DD
      segundo_informe TEXT, -- TEXT or YYYY-MM-DD
      correo_investigador TEXT,
      fecha_terminacion_prorroga TEXT, -- YYYY-MM-DD
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Dismissed Alerts Table (to track which alerts have been closed/acknowledged by users)
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS dismissed_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      convenio_id INTEGER,
      alert_key TEXT, -- e.g. 'vencimiento-30', 'vencimiento-15', 'primer_informe-7', etc.
      dismissed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(convenio_id) REFERENCES convenios(id) ON DELETE CASCADE,
      UNIQUE(user_id, convenio_id, alert_key)
    )
  `);

  // Create Email Settings Table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS email_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host TEXT NOT NULL DEFAULT 'smtp.gmail.com',
      port INTEGER NOT NULL DEFAULT 587,
      secure INTEGER NOT NULL DEFAULT 0,
      user TEXT NOT NULL DEFAULT '',
      pass TEXT NOT NULL DEFAULT '',
      sender_name TEXT DEFAULT 'Gestor de Convenios',
      enabled INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Seed default settings if empty
  const settingsCount = await dbInstance.get('SELECT COUNT(*) as count FROM email_settings');
  if (settingsCount && (settingsCount as any).count === 0) {
    await dbInstance.run(`
      INSERT INTO email_settings (host, port, secure, user, pass, sender_name, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['smtp.gmail.com', 587, 0, '', '', 'Gestor de Convenios', 0]);
  }

  // Seed default users if they don't exist
  const adminUser = await dbInstance.get('SELECT * FROM users WHERE email = ?', ['admin@convenios.com']);
  if (!adminUser) {
    await dbInstance.run(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin@convenios.com', 'admin123', 'Administrador Principal', 'admin']
    );
  }

  const defaultUser = await dbInstance.get('SELECT * FROM users WHERE email = ?', ['joan.fuentes@colegiobilingue.edu.co']);
  if (!defaultUser) {
    await dbInstance.run(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['joan.fuentes@colegiobilingue.edu.co', 'convenios2026', 'Joan Fuentes', 'usuario']
    );
  }

  // Seed sample agreements if none exist
  const convenioCount = await dbInstance.get('SELECT COUNT(*) as count FROM convenios');
  if (convenioCount && (convenioCount as any).count === 0) {
    const today = new Date();
    
    // 1. Convenio expiring soon (e.g., in 20 days)
    const expSoon = new Date();
    expSoon.setDate(today.getDate() + 20);
    const expSoonStr = expSoon.toISOString().split('T')[0];

    const start1 = new Date();
    start1.setDate(today.getDate() - 345); // started ~1 year ago
    const start1Str = start1.toISOString().split('T')[0];

    const report1 = new Date();
    report1.setDate(today.getDate() - 180);
    const report1Str = report1.toISOString().split('T')[0];

    await dbInstance.run(`
      INSERT INTO convenios (
        plan_servicio, correo_responsable, codigo, titulo_proyecto, no_convenio,
        tipologia, facultad, programa, grupo, codigo_grupo, categoria,
        investigador_principal, cedula, coinvestigador, valor, valor_letras,
        duracion, disponibilidad_presupuestal, registro_presupuestal,
        acta_aprobacion_poliza, fecha_inicio, fecha_terminacion, primer_informe,
        segundo_informe, correo_investigador
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Investigación Básica', 'investigaciones@universidad.edu', 'CIG-004',
      'Desarrollo de Algoritmos de IA para Detección Temprana en Imágenes Médicas',
      'CONV-2025-089', 'Especial', 'Facultad de Ingeniería', 'Ingeniería de Sistemas',
      'Grupo de Inteligencia Artificial Aplicada (GIAA)', 'COL002345', 'A1',
      'Dra. María Helena Restrepo', '52.345.678', 'Dr. Carlos Mendoza',
      45000000.00, 'Cuarenta y cinco millones de pesos m/cte',
      '12 meses', 'DP-10023', 'RP-8834', 'AP-002',
      start1Str, expSoonStr, report1Str, 'Pendiente de entrega', 'maria.restrepo@universidad.edu'
    ]);

    // 2. Convenio expired (e.g., expired 10 days ago)
    const expiredDate = new Date();
    expiredDate.setDate(today.getDate() - 10);
    const expiredStr = expiredDate.toISOString().split('T')[0];

    const start2 = new Date();
    start2.setDate(today.getDate() - 190);
    const start2Str = start2.toISOString().split('T')[0];

    await dbInstance.run(`
      INSERT INTO convenios (
        plan_servicio, correo_responsable, codigo, titulo_proyecto, no_convenio,
        tipologia, facultad, programa, grupo, codigo_grupo, categoria,
        investigador_principal, cedula, coinvestigador, valor, valor_letras,
        duracion, disponibilidad_presupuestal, registro_presupuestal,
        acta_aprobacion_poliza, fecha_inicio, fecha_terminacion, correo_investigador
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Convocatoria Interna', 'ciencias@universidad.edu', 'CIG-012',
      'Estudio de Impacto Ambiental del Microplástico en Fuentes de Agua Locales',
      'CONV-2025-112', 'Estándar', 'Facultad de Ciencias', 'Biología',
      'Grupo de Ecología y Medio Ambiente (GEMA)', 'COL005521', 'B',
      'Dr. Juan Carlos Ortiz', '79.234.112', 'Dra. Sofía Martínez',
      28000000.00, 'Veintiocho millones de pesos m/cte',
      '6 meses', 'DP-10115', 'RP-8902', 'AP-015',
      start2Str, expiredStr, 'juan.ortiz@universidad.edu'
    ]);

    // 3. Convenio with active suspension and reinicio
    const expFuture = new Date();
    expFuture.setDate(today.getDate() + 150);
    const expFutureStr = expFuture.toISOString().split('T')[0];

    const susp = new Date();
    susp.setDate(today.getDate() - 90);
    const suspStr = susp.toISOString().split('T')[0];

    const rein = new Date();
    rein.setDate(today.getDate() - 60);
    const reinStr = rein.toISOString().split('T')[0];

    await dbInstance.run(`
      INSERT INTO convenios (
        plan_servicio, correo_responsable, codigo, titulo_proyecto, no_convenio,
        tipologia, facultad, programa, grupo, codigo_grupo, categoria,
        investigador_principal, cedula, coinvestigador, valor, valor_letras,
        duracion, disponibilidad_presupuestal, registro_presupuestal,
        acta_aprobacion_poliza, fecha_inicio, fecha_terminacion,
        fecha_suspension, fecha_reinicio, correo_investigador
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Transferencia Tecnológica', 'innovacion@universidad.edu', 'CIG-023',
      'Optimización de Procesos de Compostaje para el Sector Agroindustrial',
      'CONV-2025-204', 'Asociado', 'Facultad de Ciencias Agrarias', 'Agronomía',
      'Grupo de Investigación en Agroecología', 'COL009211', 'A',
      'Ing. Laura Victoria Gómez', '1.023.456.789', 'Ing. Pedro Pablo Ruiz',
      62000000.00, 'Sesenta y dos millones de pesos m/cte',
      '10 meses', 'DP-10441', 'RP-9104', 'AP-044',
      '2025-10-01', expFutureStr, suspStr, reinStr, 'laura.gomez@universidad.edu'
    ]);

    // 4. Convenio with extension / prorrogas
    const expOriginal = new Date();
    expOriginal.setDate(today.getDate() - 15);
    const expOriginalStr = expOriginal.toISOString().split('T')[0];

    const expProrroga = new Date();
    expProrroga.setDate(today.getDate() + 90);
    const expProrrogaStr = expProrroga.toISOString().split('T')[0];

    await dbInstance.run(`
      INSERT INTO convenios (
        plan_servicio, correo_responsable, codigo, titulo_proyecto, no_convenio,
        tipologia, facultad, programa, grupo, codigo_grupo, categoria,
        investigador_principal, cedula, coinvestigador, valor, valor_letras,
        duracion, disponibilidad_presupuestal, registro_presupuestal,
        acta_aprobacion_poliza, fecha_inicio, fecha_terminacion,
        fecha_acta_aprobacion_ampliacion_poliza, fecha_terminacion_ampliacion,
        fecha_terminacion_prorroga, correo_investigador
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Fortalecimiento Institucional', 'infraestructura@universidad.edu', 'CIG-040',
      'Modernización de los Laboratorios de Nanotecnología y Nuevos Materiales',
      'CONV-2025-500', 'Especial', 'Facultad de Ciencias exactas', 'Física',
      'Laboratorio de Alta Tecnología', 'COL001100', 'A1',
      'Dr. Alberto Ainsworth', '19.456.123', 'MSc. Patricia Fernández',
      150000000.00, 'Ciento cincuenta millones de pesos m/cte',
      '18 meses', 'DP-11200', 'RP-9800', 'AP-110',
      '2025-01-15', expOriginalStr,
      '2025-12-10', expOriginalStr, expProrrogaStr, 'alberto.a@universidad.edu'
    ]);
  }

  return dbInstance;
}
