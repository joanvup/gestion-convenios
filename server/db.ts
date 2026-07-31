import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import bcrypt from 'bcryptjs';

let dbInstance: Database | null = null;

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.close();
    } catch (e) {
      console.error('Error al cerrar base de datos:', e);
    }
    dbInstance = null;
  }
}

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
      responsable_proceso TEXT,
      cedula_responsable_proceso TEXT,
      correo_responsable_proceso TEXT,
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
      enabled INTEGER NOT NULL DEFAULT 0,
      scheduled_time TEXT DEFAULT '08:00',
      scheduled_days TEXT DEFAULT '1,2,3,4,5'
    )
  `);

  try {
    await dbInstance.exec("ALTER TABLE email_settings ADD COLUMN scheduled_time TEXT DEFAULT '08:00'");
  } catch (e) {
    // Column already exists
  }

  try {
    await dbInstance.exec("ALTER TABLE email_settings ADD COLUMN scheduled_days TEXT DEFAULT '1,2,3,4,5'");
  } catch (e) {
    // Column already exists
  }

  // Create Audit Logs Table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL DEFAULT 'convenio',
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Password Resets Table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Planes de Servicio Table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS planes_servicio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Facultades Table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS facultades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default Planes de Servicio if empty
  const planesCount = await dbInstance.get('SELECT COUNT(*) as count FROM planes_servicio');
  if (planesCount && (planesCount as any).count === 0) {
    const defaultPlanes = [
      'Investigación Básica',
      'Convocatoria Interna',
      'Transferencia Tecnológica',
      'Fortalecimiento Institucional',
      'Convocatoria Nacional de Ciencias',
      'Desarrollo Rural',
      'Innovación Tecnológica e Industrial',
      'Desarrollo Ambiental Sostenible',
      'Convocatoria de Tecnología Agro'
    ];
    for (const plan of defaultPlanes) {
      await dbInstance.run('INSERT OR IGNORE INTO planes_servicio (nombre) VALUES (?)', [plan]);
    }
  }

  // Seed default Facultades if empty
  const facultadesCount = await dbInstance.get('SELECT COUNT(*) as count FROM facultades');
  if (facultadesCount && (facultadesCount as any).count === 0) {
    const defaultFacultades = [
      'Facultad de Ingeniería',
      'Facultad de Ciencias',
      'Facultad de Ciencias Agrarias',
      'Facultad de Ciencias Exactas y Naturales',
      'Facultad de Ciencias de la Salud',
      'Facultad de Ciencias Humanas y Sociales',
      'Facultad de Ciencias Económicas y Administrativas',
      'Facultad de Derecho y Ciencias Políticas',
      'Facultad de Educación',
      'Facultad de Ciencias de la Tierra'
    ];
    for (const fac of defaultFacultades) {
      await dbInstance.run('INSERT OR IGNORE INTO facultades (nombre) VALUES (?)', [fac]);
    }
  }

  // Create Tipologias Table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS tipologias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default Tipologias if empty
  const tipologiasCount = await dbInstance.get('SELECT COUNT(*) as count FROM tipologias');
  if (tipologiasCount && (tipologiasCount as any).count === 0) {
    const defaultTipologias = [
      'Convenio Marco',
      'Convenio Específico',
      'Acuerdo de Confidencialidad (NDA)',
      'Convenio de Cooperación Académica',
      'Convenio de Prácticas y Pasantías',
      'Convenio de Investigación',
      'Memorando de Entendimiento (MOU)',
      'Convenio de Movilidad',
      'Convenio de Cofinanciación'
    ];
    for (const tipo of defaultTipologias) {
      await dbInstance.run('INSERT OR IGNORE INTO tipologias (nombre) VALUES (?)', [tipo]);
    }
  }

  // Sync any distinct plan_servicio, facultad, or tipologia from convenios table into the master tables
  try {
    const existingPlanes = await dbInstance.all('SELECT DISTINCT plan_servicio FROM convenios WHERE plan_servicio IS NOT NULL AND TRIM(plan_servicio) != ""');
    for (const row of existingPlanes) {
      if (row.plan_servicio && row.plan_servicio.trim()) {
        await dbInstance.run('INSERT OR IGNORE INTO planes_servicio (nombre) VALUES (?)', [row.plan_servicio.trim()]);
      }
    }

    const existingFacultades = await dbInstance.all('SELECT DISTINCT facultad FROM convenios WHERE facultad IS NOT NULL AND TRIM(facultad) != ""');
    for (const row of existingFacultades) {
      if (row.facultad && row.facultad.trim()) {
        await dbInstance.run('INSERT OR IGNORE INTO facultades (nombre) VALUES (?)', [row.facultad.trim()]);
      }
    }

    const existingTipologias = await dbInstance.all('SELECT DISTINCT tipologia FROM convenios WHERE tipologia IS NOT NULL AND TRIM(tipologia) != ""');
    for (const row of existingTipologias) {
      if (row.tipologia && row.tipologia.trim()) {
        await dbInstance.run('INSERT OR IGNORE INTO tipologias (nombre) VALUES (?)', [row.tipologia.trim()]);
      }
    }
  } catch (syncErr) {
    console.error('Error syncing initial catalog from convenios:', syncErr);
  }

  // Ensure new columns exist on existing DBs
  try { await dbInstance.exec('ALTER TABLE convenios ADD COLUMN responsable_proceso TEXT;'); } catch (e) {}
  try { await dbInstance.exec('ALTER TABLE convenios ADD COLUMN cedula_responsable_proceso TEXT;'); } catch (e) {}
  try { await dbInstance.exec('ALTER TABLE convenios ADD COLUMN correo_responsable_proceso TEXT;'); } catch (e) {}

  // Sync existing coinvestigador values to responsable_proceso if empty
  try {
    await dbInstance.exec('UPDATE convenios SET responsable_proceso = coinvestigador WHERE (responsable_proceso IS NULL OR responsable_proceso = "") AND coinvestigador IS NOT NULL AND coinvestigador != "";');
  } catch (e) {}

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
    const hashedAdminPass = bcrypt.hashSync('admin123', 10);
    await dbInstance.run(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin@convenios.com', hashedAdminPass, 'Administrador Principal', 'admin']
    );
  }

  const defaultUser = await dbInstance.get('SELECT * FROM users WHERE email = ?', ['joan.fuentes@colegiobilingue.edu.co']);
  if (!defaultUser) {
    const hashedUserPass = bcrypt.hashSync('convenios2026', 10);
    await dbInstance.run(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['joan.fuentes@colegiobilingue.edu.co', hashedUserPass, 'Joan Fuentes', 'usuario']
    );
  }

  // Automatic Migration: Upgrade any existing plain text user passwords to bcrypt hashes
  try {
    const allUsers = await dbInstance.all('SELECT id, email, password FROM users');
    for (const u of allUsers) {
      if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$') && !u.password.startsWith('$2y$')) {
        const hashedPassword = bcrypt.hashSync(u.password, 10);
        await dbInstance.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, u.id]);
        console.log(`[SEGURIDAD BD] Contraseña migrada exitosamente a hash bcrypt para el usuario ${u.email}`);
      }
    }
  } catch (migErr) {
    console.error('[SEGURIDAD BD] Error al migrar contraseñas existentes:', migErr);
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
