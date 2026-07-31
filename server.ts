import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { getDb, closeDb } from "./server/db.js";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Simple Session Authorization Helper
  const getUserFromRequest = async (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.substring(7); // "Bearer <userId_or_email>"
    const db = await getDb();
    
    // We can use the simple token as the user ID for lightweight iframe auth
    const user = await db.get("SELECT id, email, name, role FROM users WHERE id = ? OR email = ?", [token, token]);
    return user || null;
  };

  // Helper to log audit events
  const logAudit = async (db: any, user: any, action: string, entityType: string, entityId: string | number, details: string) => {
    try {
      await db.run(
        `INSERT INTO audit_logs (user_email, user_name, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user?.email || 'sistema@local',
          user?.name || user?.email || 'Usuario',
          action,
          entityType,
          String(entityId || ''),
          details,
          new Date().toISOString()
        ]
      );
    } catch (err) {
      console.error('Error logging audit event:', err);
    }
  };

  // Helper to compute alerts for a single convenio
  const computeAlertsForConvenio = (c: any, todayStr: string, dismissedKeys: string[] = []) => {
    const alerts: any[] = [];
    const today = new Date(todayStr);

    // 1. Determine effective end date
    let effectiveEndDateStr = c.fecha_terminacion;
    let endType = "original";

    if (c.fecha_terminacion_prorroga) {
      effectiveEndDateStr = c.fecha_terminacion_prorroga;
      endType = "prórroga";
    } else if (c.fecha_terminacion_ampliacion) {
      effectiveEndDateStr = c.fecha_terminacion_ampliacion;
      endType = "ampliación";
    }

    if (effectiveEndDateStr) {
      const endDate = new Date(effectiveEndDateStr);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        const key = `vencido-${c.id}`;
        if (!dismissedKeys.includes(key)) {
          alerts.push({
            key,
            convenioId: c.id,
            convenioCodigo: c.codigo,
            convenioTitulo: c.titulo_proyecto,
            tipo: "vencido",
            severidad: "danger", // Red alert
            fechaReferencia: effectiveEndDateStr,
            mensaje: `El convenio ha vencido hace ${Math.abs(diffDays)} días (vence de acuerdo a: ${endType} el ${effectiveEndDateStr}).`,
            diasRestantes: diffDays
          });
        }
      } else if (diffDays <= 30) {
        const key = `vencer-30-${c.id}`;
        if (!dismissedKeys.includes(key)) {
          alerts.push({
            key,
            convenioId: c.id,
            convenioCodigo: c.codigo,
            convenioTitulo: c.titulo_proyecto,
            tipo: "vence_pronto",
            severidad: "warning_high", // Amber/Orange alert
            fechaReferencia: effectiveEndDateStr,
            mensaje: diffDays === 0
              ? `El convenio vence hoy (fecha límite: ${effectiveEndDateStr}).`
              : `El convenio vencerá pronto, quedan ${diffDays} días (fecha límite: ${effectiveEndDateStr}).`,
            diasRestantes: diffDays
          });
        }
      } else if (diffDays <= 90) {
        const key = `vencer-90-${c.id}`;
        if (!dismissedKeys.includes(key)) {
          alerts.push({
            key,
            convenioId: c.id,
            convenioCodigo: c.codigo,
            convenioTitulo: c.titulo_proyecto,
            tipo: "vence_pronto_90",
            severidad: "warning_low", // Yellow alert
            fechaReferencia: effectiveEndDateStr,
            mensaje: `El convenio vencerá en los próximos 3 meses, quedan ${diffDays} días (fecha límite: ${effectiveEndDateStr}).`,
            diasRestantes: diffDays
          });
        }
      }
    }

    // 2. Check Primer Informe date alert (if set)
    if (c.primer_informe) {
      const reportDate = new Date(c.primer_informe);
      const diffTime = reportDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Warn if report is due in <= 15 days or is overdue
      if (diffDays <= 15 && (!c.segundo_informe || c.segundo_informe === "Pendiente de entrega" || c.segundo_informe === "Pendiente")) {
        const key = `primer_informe-${c.id}`;
        if (!dismissedKeys.includes(key)) {
          alerts.push({
            key,
            convenioId: c.id,
            convenioCodigo: c.codigo,
            convenioTitulo: c.titulo_proyecto,
            tipo: "primer_informe",
            severidad: diffDays < 0 ? "danger" : "info",
            fechaReferencia: c.primer_informe,
            mensaje: diffDays < 0 
              ? `El plazo para el Primer Informe venció hace ${Math.abs(diffDays)} días (fecha límite: ${c.primer_informe}).`
              : diffDays === 0
              ? `Hoy es la fecha límite para la entrega del Primer Informe (fecha límite: ${c.primer_informe}).`
              : `Faltan ${diffDays} días para la entrega del Primer Informe (fecha límite: ${c.primer_informe}).`,
            diasRestantes: diffDays
          });
        }
      }
    }

    // 3. Check Policy / Ampliación Póliza Warning
    // If we have an extension/ampliacion but the policy date or reference is blank
    if (c.fecha_terminacion_ampliacion && !c.fecha_acta_aprobacion_ampliacion_poliza) {
      const key = `poliza-ampliacion-${c.id}`;
      if (!dismissedKeys.includes(key)) {
        alerts.push({
          key,
          convenioId: c.id,
          convenioCodigo: c.codigo,
          convenioTitulo: c.titulo_proyecto,
          tipo: "poliza_pendiente",
          severidad: "warning_low",
          fechaReferencia: c.fecha_terminacion_ampliacion,
          mensaje: "Convenio con ampliación de plazo pero sin registrar fecha de aprobación de ampliación de póliza.",
          diasRestantes: null
        });
      }
    }

    // 4. Check Suspended Status
    if (c.fecha_suspension && !c.fecha_reinicio) {
      const key = `suspension-activa-${c.id}`;
      if (!dismissedKeys.includes(key)) {
        alerts.push({
          key,
          convenioId: c.id,
          convenioCodigo: c.codigo,
          convenioTitulo: c.titulo_proyecto,
          tipo: "suspendido",
          severidad: "info",
          fechaReferencia: c.fecha_suspension,
          mensaje: `Convenio suspendido temporalmente desde el ${c.fecha_suspension}. Pendiente reinicio.`,
          diasRestantes: null
        });
      }
    }

    return alerts;
  };

  // Helper to resolve application version from public/version.json or package.json
  const getAppVersion = (): string => {
    try {
      const versionJsonPath = path.join(process.cwd(), "public", "version.json");
      if (fs.existsSync(versionJsonPath)) {
        const data = JSON.parse(fs.readFileSync(versionJsonPath, "utf-8"));
        if (data && data.version) return data.version;
      }
      const pkgPath = path.join(process.cwd(), "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg && pkg.version) return pkg.version;
      }
    } catch (e) {
      console.error("Error al leer versión de app:", e);
    }
    return "1.0.6";
  };

  let appVersion = getAppVersion();

  // Helper to send email notifications using settings from SQLite database
  const sendEmail = async ({
    to,
    subject,
    html,
    ignoreEnabled = false,
  }: {
    to: string;
    subject: string;
    html: string;
    ignoreEnabled?: boolean;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const db = await getDb();
      const settings = await db.get("SELECT * FROM email_settings LIMIT 1");

      if (!settings) {
        console.log("No hay configuración de correo en la base de datos.");
        return {
          success: false,
          error: "No hay configuración de correo SMTP en la base de datos. Un administrador debe configurar el correo saliente en los Ajustes de Correo.",
        };
      }

      // If ignoreEnabled is false (e.g. for automatic scheduled notifications), check settings.enabled
      if (!ignoreEnabled && !settings.enabled) {
        console.log("Notificaciones por correo desactivadas en la configuración.");
        return {
          success: false,
          error: "Las notificaciones por correo están desactivadas en los Ajustes de Correo del sistema.",
        };
      }

      if (!settings.user || !settings.pass) {
        console.log("Usuario o contraseña de correo no configurados en los ajustes.");
        return {
          success: false,
          error: "El usuario o la contraseña del servidor SMTP no están configurados. Un administrador debe configurarlos en los Ajustes de Correo.",
        };
      }

      const transporter = nodemailer.createTransport({
        host: settings.host || "smtp.gmail.com",
        port: Number(settings.port) || 587,
        secure: Number(settings.secure) === 1,
        auth: {
          user: settings.user,
          pass: settings.pass,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false,
        },
      });

      const mailOptions = {
        from: `"${settings.sender_name || 'Gestor de Convenios'}" <${settings.user}>`,
        to,
        subject,
        html,
      };

      const sendPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Tiempo de espera (8s) agotado al conectar al servidor SMTP")), 8000)
      );

      const info: any = await Promise.race([sendPromise, timeoutPromise]);
      console.log(`Correo enviado correctamente a ${to}: ${info.messageId}`);
      return { success: true };
    } catch (error: any) {
      let errorMsg = error?.message || "Error desconocido al enviar correo";
      if (
        errorMsg.includes("534") ||
        errorMsg.includes("Invalid login") ||
        errorMsg.includes("Username and Password not accepted")
      ) {
        errorMsg =
          "Autenticación rechazada por el servidor de correo (Google/Gmail Error 534). Si usas Gmail o Google Workspace, debes usar una 'Contraseña de Aplicación' (App Password) de 16 caracteres generada en tu cuenta de Google (myaccount.google.com/apppasswords), en lugar de tu contraseña normal.";
        console.error("[SMTP ERROR 534]", errorMsg);
      } else if (
        errorMsg.includes("ETIMEDOUT") ||
        errorMsg.includes("ECONNREFUSED") ||
        errorMsg.includes("Tiempo de espera")
      ) {
        errorMsg = `No se pudo conectar al servidor SMTP (${errorMsg}). Verifica que el host (ej: smtp.gmail.com) y puerto (587 o 465) sean correctos.`;
        console.error("[SMTP CONNECTION ERROR]", errorMsg);
      } else {
        console.error("Error al enviar correo electrónico:", error);
      }
      return { success: false, error: errorMsg };
    }
  };

  // --- API ROUTES ---

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Correo electrónico y contraseña son requeridos" });
      }

      const db = await getDb();
      const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

      if (!user) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      let isMatch = false;
      const storedPass = user.password || "";

      // Check if stored password is a bcrypt hash
      if (storedPass.startsWith("$2a$") || storedPass.startsWith("$2b$") || storedPass.startsWith("$2y$")) {
        isMatch = bcrypt.compareSync(password, storedPass);
      } else {
        // Fallback for legacy plain text passwords with automatic upgrade
        isMatch = storedPass === password;
        if (isMatch) {
          const hashedPass = bcrypt.hashSync(password, 10);
          await db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPass, user.id]);
          console.log(`[SEGURIDAD BD] Contraseña del usuario ${user.email} migrada a hash bcrypt durante el login.`);
        }
      }

      if (!isMatch) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      // Successful login
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token: String(user.id) // Simple ID token
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error interno del servidor en login" });
    }
  });

  // Auth: Forgot Password (Request Code)
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Ingresa tu correo electrónico registrado" });
      }

      const db = await getDb();
      const user = await db.get("SELECT id, email, name FROM users WHERE email = ?", [email.trim()]);

      if (!user) {
        return res.status(404).json({ error: "No se encontró ninguna cuenta asociada a este correo electrónico" });
      }

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

      // Store in DB
      await db.run(
        "INSERT INTO password_resets (email, code, expires_at, used) VALUES (?, ?, ?, 0)",
        [user.email, code, expiresAt]
      );

      // Send verification code strictly via email
      const emailResult = await sendEmail({
        to: user.email,
        subject: "Código de recuperación de contraseña - Gestor de Convenios",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4f46e5; margin-top: 0;">Restablecer contraseña</h2>
            <p>Hola <strong>${user.name}</strong>,</p>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Gestión de Convenios.</p>
            <p>Tu código de verificación de 6 dígitos es:</p>
            <div style="background: #f1f5f9; padding: 16px; font-size: 28px; font-weight: 800; letter-spacing: 6px; text-align: center; color: #0f172a; border-radius: 8px; margin: 20px 0; border: 1px solid #cbd5e1;">
              ${code}
            </div>
            <p style="font-size: 13px; color: #64748b;">Este código expirará en 15 minutos.</p>
            <p style="font-size: 13px; color: #64748b;">Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
          </div>
        `,
        ignoreEnabled: true,
      });

      await logAudit(db, user, "SOLICITUD_RECUPERACION", "user", user.id, `Código de recuperación solicitado para ${user.email}`);

      if (!emailResult.success) {
        return res.status(400).json({
          error: emailResult.error || "No se pudo enviar el correo con el código de verificación."
        });
      }

      return res.json({
        success: true,
        message: `Se ha enviado un código de verificación de 6 dígitos a ${user.email}. Por favor revisa tu correo electrónico.`
      });
    } catch (err: any) {
      console.error("Error en forgot-password:", err);
      return res.status(500).json({ error: "Error interno al procesar la solicitud de recuperación" });
    }
  });

  // Auth: Reset Password (Verify Code & Change Password)
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Todos los campos (correo, código y nueva contraseña) son requeridos" });
      }

      if (newPassword.trim().length < 6) {
        return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
      }

      const db = await getDb();

      // Check for valid reset token
      const resetRecord = await db.get(
        "SELECT * FROM password_resets WHERE email = ? AND code = ? AND used = 0 ORDER BY id DESC LIMIT 1",
        [email.trim(), code.trim()]
      );

      if (!resetRecord) {
        return res.status(400).json({ error: "El código de verificación es incorrecto o ya fue utilizado" });
      }

      // Check expiration
      if (new Date(resetRecord.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ error: "El código de verificación ha expirado (validez de 15 min). Solicita uno nuevo." });
      }

      // Update password with secure bcrypt hash
      const hashedPassword = bcrypt.hashSync(newPassword.trim(), 10);
      await db.run("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email.trim()]);

      // Mark token as used
      await db.run("UPDATE password_resets SET used = 1 WHERE id = ?", [resetRecord.id]);

      await logAudit(
        db,
        { email: email.trim(), name: email.trim() },
        "RESTABLECER_CONTRASEÑA",
        "user",
        email.trim(),
        "Contraseña restablecida exitosamente mediante código de recuperación"
      );

      return res.json({
        success: true,
        message: "¡Contraseña actualizada con éxito! Ya puedes iniciar sesión con tu nueva clave."
      });
    } catch (err: any) {
      console.error("Error en reset-password:", err);
      return res.status(500).json({ error: "Error interno al restablecer la contraseña" });
    }
  });

  // Auth: Register (Restricted to Admins)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const currentUser = await getUserFromRequest(req);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ error: "No autorizado. Solo los administradores pueden registrar nuevos usuarios." });
      }

      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Todos los campos (email, contraseña, nombre) son requeridos" });
      }

      // Default to 'usuario' if not specified or invalid
      const targetRole = role === "admin" ? "admin" : "usuario";

      const db = await getDb();
      
      // Check if user exists
      const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
      if (existing) {
        return res.status(400).json({ error: "El correo electrónico ya está registrado" });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = await db.run(
        "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
        [email, hashedPassword, name, targetRole]
      );

      const newUser = await db.get("SELECT id, email, name, role FROM users WHERE id = ?", [result.lastID]);

      return res.status(201).json({
        user: newUser,
        message: "Usuario registrado con éxito por el administrador"
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error en el registro de usuario" });
    }
  });

  // Users: Get all (Restricted to Admins)
  app.get("/api/users", async (req, res) => {
    try {
      const currentUser = await getUserFromRequest(req);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ error: "No autorizado. Solo los administradores pueden ver la lista de usuarios." });
      }

      const db = await getDb();
      const usersList = await db.all("SELECT id, email, name, role FROM users ORDER BY name ASC");
      return res.json({ users: usersList });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener lista de usuarios" });
    }
  });

  // Users: Delete user (Restricted to Admins, no self-deletion)
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const currentUser = await getUserFromRequest(req);
      if (!currentUser || currentUser.role !== "admin") {
        return res.status(403).json({ error: "No autorizado. Solo los administradores pueden eliminar usuarios." });
      }

      const targetId = parseInt(req.params.id, 10);
      if (isNaN(targetId)) {
        return res.status(400).json({ error: "ID de usuario inválido" });
      }

      if (currentUser.id === targetId) {
        return res.status(400).json({ error: "No puedes eliminar tu propia cuenta de administrador" });
      }

      const db = await getDb();
      
      // Check if user exists
      const userToDelete = await db.get("SELECT id, name FROM users WHERE id = ?", [targetId]);
      if (!userToDelete) {
        return res.status(404).json({ error: "El usuario no existe" });
      }

      await db.run("DELETE FROM users WHERE id = ?", [targetId]);
      return res.json({ message: `Usuario ${userToDelete.name} eliminado correctamente` });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al eliminar usuario" });
    }
  });

  // Email Settings: Get current config (Restricted to Admins)
  app.get("/api/email-settings", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      if (user.role !== "admin") {
        return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
      }

      const db = await getDb();
      const settings = await db.get("SELECT host, port, secure, user, sender_name, enabled, scheduled_time, scheduled_days FROM email_settings LIMIT 1");
      
      return res.json(settings || {
        host: "smtp.gmail.com",
        port: 587,
        secure: 0,
        user: "",
        sender_name: "Gestor de Convenios",
        enabled: 0,
        scheduled_time: "08:00",
        scheduled_days: "1,2,3,4,5"
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener configuración de correo" });
    }
  });

  // Email Settings: Update config (Restricted to Admins)
  app.post("/api/email-settings", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      if (user.role !== "admin") {
        return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
      }

      const { host, port, secure, user: emailUser, pass, sender_name, enabled, scheduled_time, scheduled_days } = req.body;
      const formattedTime = scheduled_time && /^\d{2}:\d{2}$/.test(scheduled_time) ? scheduled_time : "08:00";
      const formattedDays = typeof scheduled_days === 'string' && scheduled_days.trim() ? scheduled_days.trim() : "1,2,3,4,5";
      const db = await getDb();

      // Check if we need to update pass (only if a non-empty string is provided)
      if (pass && pass.trim()) {
        await db.run(
          `UPDATE email_settings SET host = ?, port = ?, secure = ?, user = ?, pass = ?, sender_name = ?, enabled = ?, scheduled_time = ?, scheduled_days = ? WHERE id = (SELECT id FROM email_settings LIMIT 1)`,
          [host, Number(port), Number(secure), emailUser, pass, sender_name, Number(enabled), formattedTime, formattedDays]
        );
      } else {
        await db.run(
          `UPDATE email_settings SET host = ?, port = ?, secure = ?, user = ?, sender_name = ?, enabled = ?, scheduled_time = ?, scheduled_days = ? WHERE id = (SELECT id FROM email_settings LIMIT 1)`,
          [host, Number(port), Number(secure), emailUser, sender_name, Number(enabled), formattedTime, formattedDays]
        );
      }

      const updated = await db.get("SELECT host, port, secure, user, sender_name, enabled, scheduled_time, scheduled_days FROM email_settings LIMIT 1");
      return res.json({ success: true, message: "Configuración de correo guardada correctamente", settings: updated });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al guardar configuración de correo" });
    }
  });

  // Email Settings: Send a test email on-the-fly (Restricted to Admins)
  app.post("/api/email-settings/test", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      if (user.role !== "admin") {
        return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
      }

      const { host, port, secure, user: emailUser, pass, sender_name, to } = req.body;
      if (!emailUser || !pass || !to) {
        return res.status(400).json({ error: "El correo emisor, la contraseña y el correo destino son obligatorios para la prueba." });
      }

      const transporter = nodemailer.createTransport({
        host: host || "smtp.gmail.com",
        port: Number(port) || 587,
        secure: Number(secure) === 1,
        auth: {
          user: emailUser,
          pass: pass,
        },
      });

      const mailOptions = {
        from: `"${sender_name || 'Gestor de Convenios (Prueba)'}" <${emailUser}>`,
        to,
        subject: "Prueba de Configuración de Correo - Gestor de Convenios",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: inline-block; padding: 12px; background-color: #e0e7ff; border-radius: 50%; color: #4f46e5; font-size: 24px; font-weight: bold; width: 40px; height: 40px; line-height: 40px;">✓</div>
            </div>
            <h2 style="color: #4f46e5; margin-top: 0; text-align: center; font-family: system-ui, sans-serif;">¡Conexión de Correo Exitosa!</h2>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Estimado usuario,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Este es un correo de prueba enviado desde la plataforma <strong>Gestor de Convenios</strong>.</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Tu configuración de servidor SMTP (Gmail con Contraseña de Aplicación) ha sido validada y está lista para enviar notificaciones automáticas a los responsables de convenios.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Detalles de la conexión:</h4>
              <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; font-weight: bold;">Servidor SMTP:</td>
                  <td style="padding: 4px 0;">${host}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold;">Puerto:</td>
                  <td style="padding: 4px 0;">${port}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold;">Usuario:</td>
                  <td style="padding: 4px 0;">${emailUser}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold;">SSL/TLS:</td>
                  <td style="padding: 4px 0;">${Number(secure) === 1 ? "Sí" : "No (STARTTLS)"}</td>
                </tr>
              </table>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Este mensaje fue solicitado por ${user.name} (${user.email}) el ${new Date().toLocaleString()}</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      return res.json({ success: true, message: `Correo de prueba enviado con éxito a ${to}` });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al enviar correo de prueba: " + err.message });
    }
  });

  // Alerts: Notify bulk
  app.post("/api/alerts/notify-bulk", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const db = await getDb();
      const settings = await db.get("SELECT enabled, user FROM email_settings LIMIT 1");
      if (!settings || !settings.enabled) {
        return res.status(400).json({ error: "Las notificaciones por correo están desactivadas. Por favor, configúrelas primero." });
      }

      const list = await db.all("SELECT * FROM convenios");
      const dismissed = await db.all("SELECT convenio_id, alert_key FROM dismissed_alerts WHERE user_id = ?", [user.id]);
      const dismissedKeys = dismissed.map(d => `${d.convenio_id}:${d.alert_key}`);

      const todayStr = new Date().toISOString().split('T')[0];
      let notifiedCount = 0;
      let failedCount = 0;
      const details: string[] = [];

      for (const c of list) {
        const alerts = computeAlertsForConvenio(c, todayStr, dismissedKeys);
        if (alerts.length > 0) {
          const recipient = c.correo_responsable || c.correo_investigador;
          if (recipient && recipient.trim()) {
            const alertsHtml = alerts.map(a => `
              <li style="margin-bottom: 12px; padding: 12px; border-left: 4px solid ${
                a.severidad === 'danger' ? '#ef4444' : a.severidad === 'warning_high' ? '#f97316' : a.severidad === 'warning_low' ? '#eab308' : '#3b82f6'
              }; background-color: #f8fafc; border-radius: 0 8px 8px 0; list-style-type: none;">
                <div style="font-weight: bold; color: #1e293b; font-size: 14px;">
                  [ALERTA: ${a.tipo.toUpperCase()}]
                </div>
                <div style="color: #475569; font-size: 13px; margin-top: 4px;">
                  ${a.mensaje}
                </div>
                <div style="color: #94a3b8; font-size: 11px; margin-top: 4px;">
                  Fecha de referencia: ${a.fechaReferencia || 'N/A'}
                </div>
              </li>
            `).join("");

            const subject = `[ALERTA DE CONVENIO] Alertas vigentes para: ${c.codigo}`;
            const html = `
              <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #4f46e5; margin: 0; font-family: system-ui, sans-serif;">Sistema de Alertas de Convenios</h2>
                  <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">Notificaciones automáticas de control de plazos</p>
                </div>
                
                <p style="color: #334155; font-size: 15px; line-height: 1.6;">Estimado/a Responsable,</p>
                <p style="color: #334155; font-size: 15px; line-height: 1.6;">Le informamos que el siguiente convenio bajo su supervisión cuenta con <strong>alertas de vencimiento o plazos activos</strong> que requieren de su revisión e intervención inmediata:</p>
                
                <div style="background-color: #f1f5f9; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #e2e8f0;">
                  <strong style="font-size: 16px; color: #0f172a;">${c.codigo} - ${c.titulo_proyecto}</strong><br/>
                  <div style="color: #64748b; font-size: 13px; margin-top: 6px;">
                    <strong>Director/Investigador:</strong> ${c.investigador_principal || 'No especificado'}<br/>
                    <strong>No. Convenio:</strong> ${c.no_convenio || 'N/A'}
                  </div>
                </div>

                <h3 style="color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 25px;">Alertas Detectadas:</h3>
                <ul style="padding-left: 0; margin-top: 15px;">
                  ${alertsHtml}
                </ul>

                <p style="color: #4f46e5; font-size: 14px; font-weight: bold; margin-top: 25px;">
                  👉 Por favor, ingrese al Gestor de Convenios para tramitar la adición, prórroga, póliza o registro correspondiente.
                </p>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Este mensaje fue enviado de manera automática por la plataforma de Gestión de Convenios de la Universidad.</p>
              </div>
            `;

            const emailRes = await sendEmail({ to: recipient, subject, html });
            if (emailRes.success) {
              notifiedCount++;
              details.push(`Notificado con éxito ${c.codigo} a ${recipient}`);
            } else {
              failedCount++;
              details.push(`Error al enviar ${c.codigo} a ${recipient}: ${emailRes.error || 'Error desconocido'}`);
            }
          } else {
            details.push(`Convenio ${c.codigo} tiene alertas pero no tiene correo responsable asignado`);
          }
        }
      }

      return res.json({ 
        success: true, 
        notifiedCount, 
        failedCount,
        details,
        message: `Se han procesado las alertas. Enviados: ${notifiedCount}, Fallidos: ${failedCount}`
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al enviar notificaciones en lote: " + err.message });
    }
  });

  // Auth: Me
  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      return res.json({ user });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener perfil" });
    }
  });

  // Convenios: Get all
  app.get("/api/convenios", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const db = await getDb();
      const list = await db.all("SELECT * FROM convenios ORDER BY id DESC");
      
      // Enriquecer convenios con sus alertas dinámicas
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Obtener alertas silenciadas por el usuario actual
      const dismissed = await db.all("SELECT convenio_id, alert_key FROM dismissed_alerts WHERE user_id = ?", [user.id]);
      const dismissedKeys = dismissed.map(d => `${d.convenio_id}:${d.alert_key}`);

      const enriched = list.map(c => {
        const keysForThis = dismissed
          .filter(d => d.convenio_id === c.id)
          .map(d => d.alert_key);
        const alerts = computeAlertsForConvenio(c, todayStr, keysForThis);
        return {
          ...c,
          alerts,
          alertCount: alerts.length
        };
      });

      return res.json(enriched);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener convenios" });
    }
  });

  // Convenios: Get single
  app.get("/api/convenios/:id", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const { id } = req.params;
      const db = await getDb();
      const convenio = await db.get("SELECT * FROM convenios WHERE id = ?", [id]);

      if (!convenio) {
        return res.status(404).json({ error: "Convenio no encontrado" });
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const dismissed = await db.all(
        "SELECT alert_key FROM dismissed_alerts WHERE user_id = ? AND convenio_id = ?",
        [user.id, id]
      );
      const dismissedKeys = dismissed.map(d => d.alert_key);

      const alerts = computeAlertsForConvenio(convenio, todayStr, dismissedKeys);

      return res.json({
        ...convenio,
        alerts,
        dismissedAlerts: dismissedKeys
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener convenio" });
    }
  });

  // Convenios: Create
  app.post("/api/convenios", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const db = await getDb();
      const fields = req.body;

      if (!fields.codigo || !fields.titulo_proyecto) {
        return res.status(400).json({ error: "Código y Título del Proyecto son obligatorios" });
      }

      // Check if code already exists
      const existing = await db.get("SELECT id FROM convenios WHERE codigo = ?", [fields.codigo]);
      if (existing) {
        return res.status(400).json({ error: `El código de convenio '${fields.codigo}' ya existe.` });
      }

      const query = `
        INSERT INTO convenios (
          plan_servicio, correo_responsable, codigo, titulo_proyecto, no_convenio,
          tipologia, facultad, programa, grupo, codigo_grupo, categoria,
          investigador_principal, cedula, coinvestigador, responsable_proceso,
          cedula_responsable_proceso, correo_responsable_proceso, valor, valor_letras,
          duracion, disponibilidad_presupuestal, registro_presupuestal,
          acta_aprobacion_poliza, fecha_inicio, fecha_terminacion, primer_informe,
          fecha_suspension, fecha_reinicio, fecha_acta_aprobacion_ampliacion_poliza,
          fecha_terminacion_ampliacion, segundo_informe, correo_investigador,
          fecha_terminacion_prorroga
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        fields.plan_servicio || null,
        fields.correo_responsable || null,
        fields.codigo,
        fields.titulo_proyecto,
        fields.no_convenio || null,
        fields.tipologia || null,
        fields.facultad || null,
        fields.programa || null,
        fields.grupo || null,
        fields.codigo_grupo || null,
        fields.categoria || null,
        fields.investigador_principal || null,
        fields.cedula || null,
        fields.responsable_proceso || fields.coinvestigador || null,
        fields.responsable_proceso || fields.coinvestigador || null,
        fields.cedula_responsable_proceso || null,
        fields.correo_responsable_proceso || null,
        fields.valor ? parseFloat(fields.valor) : null,
        fields.valor_letras || null,
        fields.duracion || null,
        fields.disponibilidad_presupuestal || null,
        fields.registro_presupuestal || null,
        fields.acta_aprobacion_poliza || null,
        fields.fecha_inicio || null,
        fields.fecha_terminacion || null,
        fields.primer_informe || null,
        fields.fecha_suspension || null,
        fields.fecha_reinicio || null,
        fields.fecha_acta_aprobacion_ampliacion_poliza || null,
        fields.fecha_terminacion_ampliacion || null,
        fields.segundo_informe || null,
        fields.correo_investigador || null,
        fields.fecha_terminacion_prorroga || null
      ];

      const result = await db.run(query, params);
      const newConvenio = await db.get("SELECT * FROM convenios WHERE id = ?", [result.lastID]);

      // Notify responsibles by email
      const rawRecipients = [fields.correo_investigador, fields.correo_responsable_proceso];
      const recipients = Array.from(new Set(rawRecipients.filter((r): r is string => Boolean(r && r.trim())).map(r => r.trim())));

      if (recipients.length > 0) {
        const subject = `[NUEVO CONVENIO] Registro de convenio ${fields.codigo}`;
        const html = `
          <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #10b981; margin: 0; font-family: system-ui, sans-serif;">Gestor de Convenios</h2>
              <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">Notificaciones automáticas de registro</p>
            </div>
            
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Estimado/a Responsable,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Le informamos que se ha registrado un nuevo convenio en la plataforma:</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 10px; border-left: 4px solid #10b981; margin: 20px 0; border: 1px solid #f1f5f9;">
              <strong style="font-size: 16px; color: #0f172a;">${fields.codigo} - ${fields.titulo_proyecto}</strong><br/>
              <span style="color: #64748b; font-size: 13px; display: block; margin-top: 4px;">No. Convenio: ${fields.no_convenio || 'N/A'} | Facultad: ${fields.facultad || 'N/A'}</span>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 20px 0; color: #334155;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 40%; border-bottom: 1px solid #f1f5f9;">Investigador Principal:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${fields.investigador_principal || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Responsable del Proceso:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${fields.responsable_proceso || fields.coinvestigador || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Fecha de Inicio:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${fields.fecha_inicio || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Fecha de Terminación:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${fields.fecha_terminacion || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Valor Total:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #10b981; border-bottom: 1px solid #f1f5f9;">$${new Intl.NumberFormat('es-CO').format(fields.valor || 0)} COP</td>
              </tr>
            </table>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Este mensaje fue enviado de manera automática por la plataforma de Gestión de Convenios.</p>
          </div>
        `;
        for (const recipient of recipients) {
          sendEmail({ to: recipient, subject, html }).catch(err => console.error("Error sending creation email to " + recipient, err));
        }
      }

      await logAudit(db, user, 'CREACION', 'convenio', newConvenio.id, `Creación de convenio ${newConvenio.codigo} - ${newConvenio.titulo_proyecto}`);

      return res.status(201).json(newConvenio);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al crear convenio: " + err.message });
    }
  });

  // Convenios: Update
  app.put("/api/convenios/:id", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const { id } = req.params;
      const db = await getDb();
      const fields = req.body;

      const current = await db.get("SELECT id FROM convenios WHERE id = ?", [id]);
      if (!current) {
        return res.status(404).json({ error: "Convenio no encontrado" });
      }

      // Check code uniqueness if changing
      if (fields.codigo) {
        const existing = await db.get("SELECT id FROM convenios WHERE codigo = ? AND id != ?", [fields.codigo, id]);
        if (existing) {
          return res.status(400).json({ error: `El código '${fields.codigo}' ya está asignado a otro convenio.` });
        }
      }

      const query = `
        UPDATE convenios SET
          plan_servicio = ?, correo_responsable = ?, codigo = ?, titulo_proyecto = ?,
          no_convenio = ?, tipologia = ?, facultad = ?, programa = ?, grupo = ?,
          codigo_grupo = ?, categoria = ?, investigador_principal = ?, cedula = ?,
          coinvestigador = ?, responsable_proceso = ?, cedula_responsable_proceso = ?,
          correo_responsable_proceso = ?, valor = ?, valor_letras = ?, duracion = ?,
          disponibilidad_presupuestal = ?, registro_presupuestal = ?,
          acta_aprobacion_poliza = ?, fecha_inicio = ?, fecha_terminacion = ?,
          primer_informe = ?, fecha_suspension = ?, fecha_reinicio = ?,
          fecha_acta_aprobacion_ampliacion_poliza = ?, fecha_terminacion_ampliacion = ?,
          segundo_informe = ?, correo_investigador = ?, fecha_terminacion_prorroga = ?
        WHERE id = ?
      `;

      const params = [
        fields.plan_servicio === undefined ? null : fields.plan_servicio,
        fields.correo_responsable === undefined ? null : fields.correo_responsable,
        fields.codigo,
        fields.titulo_proyecto,
        fields.no_convenio === undefined ? null : fields.no_convenio,
        fields.tipologia === undefined ? null : fields.tipologia,
        fields.facultad === undefined ? null : fields.facultad,
        fields.programa === undefined ? null : fields.programa,
        fields.grupo === undefined ? null : fields.grupo,
        fields.codigo_grupo === undefined ? null : fields.codigo_grupo,
        fields.categoria === undefined ? null : fields.categoria,
        fields.investigador_principal === undefined ? null : fields.investigador_principal,
        fields.cedula === undefined ? null : fields.cedula,
        fields.responsable_proceso || fields.coinvestigador || null,
        fields.responsable_proceso || fields.coinvestigador || null,
        fields.cedula_responsable_proceso === undefined ? null : fields.cedula_responsable_proceso,
        fields.correo_responsable_proceso === undefined ? null : fields.correo_responsable_proceso,
        fields.valor === undefined || fields.valor === "" ? null : parseFloat(fields.valor),
        fields.valor_letras === undefined ? null : fields.valor_letras,
        fields.duracion === undefined ? null : fields.duracion,
        fields.disponibilidad_presupuestal === undefined ? null : fields.disponibilidad_presupuestal,
        fields.registro_presupuestal === undefined ? null : fields.registro_presupuestal,
        fields.acta_aprobacion_poliza === undefined ? null : fields.acta_aprobacion_poliza,
        fields.fecha_inicio === undefined ? null : fields.fecha_inicio,
        fields.fecha_terminacion === undefined ? null : fields.fecha_terminacion,
        fields.primer_informe === undefined ? null : fields.primer_informe,
        fields.fecha_suspension === undefined ? null : fields.fecha_suspension,
        fields.fecha_reinicio === undefined ? null : fields.fecha_reinicio,
        fields.fecha_acta_aprobacion_ampliacion_poliza === undefined ? null : fields.fecha_acta_aprobacion_ampliacion_poliza,
        fields.fecha_terminacion_ampliacion === undefined ? null : fields.fecha_terminacion_ampliacion,
        fields.segundo_informe === undefined ? null : fields.segundo_informe,
        fields.correo_investigador === undefined ? null : fields.correo_investigador,
        fields.fecha_terminacion_prorroga === undefined ? null : fields.fecha_terminacion_prorroga,
        id
      ];

      await db.run(query, params);
      const updated = await db.get("SELECT * FROM convenios WHERE id = ?", [id]);

      // Notify of update
      const rawRecipients = [updated.correo_investigador, updated.correo_responsable_proceso];
      const recipients = Array.from(new Set(rawRecipients.filter((r): r is string => Boolean(r && r.trim())).map(r => r.trim())));

      if (recipients.length > 0) {
        const subject = `[ACTUALIZACIÓN] Convenio ${updated.codigo} actualizado`;
        const html = `
          <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #3b82f6; margin: 0; font-family: system-ui, sans-serif;">Gestor de Convenios</h2>
              <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">Notificaciones automáticas de actualización</p>
            </div>
            
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Estimado/a Responsable,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Le informamos que se han realizado modificaciones al convenio registrado en la plataforma:</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 10px; border-left: 4px solid #3b82f6; margin: 20px 0; border: 1px solid #f1f5f9;">
              <strong style="font-size: 16px; color: #0f172a;">${updated.codigo} - ${updated.titulo_proyecto}</strong><br/>
              <span style="color: #64748b; font-size: 13px; display: block; margin-top: 4px;">No. Convenio: ${updated.no_convenio || 'N/A'} | Facultad: ${updated.facultad || 'N/A'}</span>
            </div>

            <h3 style="color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 25px;">Plazos y Estados Actualizados:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 20px 0; color: #334155;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 45%; border-bottom: 1px solid #f1f5f9;">Término Original:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${updated.fecha_terminacion || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Término con Ampliación:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${updated.fecha_terminacion_ampliacion || 'Ninguna'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Término con Prórroga:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${updated.fecha_terminacion_prorroga || 'Ninguna'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Primer Informe de Avance:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${updated.primer_informe || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Segundo Informe:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${updated.segundo_informe || 'N/A'}</td>
              </tr>
            </table>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Este mensaje fue enviado de manera automática por la plataforma de Gestión de Convenios.</p>
          </div>
        `;
        for (const recipient of recipients) {
          sendEmail({ to: recipient, subject, html }).catch(err => console.error("Error sending update email to " + recipient, err));
        }
      }

      await logAudit(db, user, 'EDICION', 'convenio', updated.id, `Edición de convenio ${updated.codigo} - ${updated.titulo_proyecto}`);

      return res.json(updated);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al actualizar convenio: " + err.message });
    }
  });

  // Convenios: Delete
  app.delete("/api/convenios/:id", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const { id } = req.params;
      const db = await getDb();

      const current = await db.get("SELECT id, codigo, titulo_proyecto FROM convenios WHERE id = ?", [id]);
      if (!current) {
        return res.status(404).json({ error: "Convenio no encontrado" });
      }

      await db.run("DELETE FROM convenios WHERE id = ?", [id]);
      await logAudit(db, user, 'ELIMINACION', 'convenio', id, `Eliminación de convenio ${current.codigo} - ${current.titulo_proyecto}`);

      return res.json({ success: true, message: `Convenio con ID ${id} eliminado correctamente.` });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al eliminar convenio" });
    }
  });

  // Alerts: Get all active alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const db = await getDb();
      const list = await db.all("SELECT * FROM convenios");
      const dismissed = await db.all("SELECT convenio_id, alert_key FROM dismissed_alerts WHERE user_id = ?", [user.id]);
      const dismissedMap = new Map<number, string[]>();
      
      dismissed.forEach(d => {
        if (!dismissedMap.has(d.convenio_id)) {
          dismissedMap.set(d.convenio_id, []);
        }
        dismissedMap.get(d.convenio_id)!.push(d.alert_key);
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const allAlerts: any[] = [];

      list.forEach(c => {
        const keys = dismissedMap.get(c.id) || [];
        const alertsForC = computeAlertsForConvenio(c, todayStr, keys);
        allAlerts.push(...alertsForC);
      });

      // Sort by severity (danger first, then warning_high, warning_low, info)
      const severityOrder: Record<string, number> = {
        danger: 1,
        warning_high: 2,
        warning_low: 3,
        info: 4
      };

      allAlerts.sort((a, b) => {
        const orderA = severityOrder[a.severidad] || 5;
        const orderB = severityOrder[b.severidad] || 5;
        if (orderA !== orderB) return orderA - orderB;
        if (a.diasRestantes === null && b.diasRestantes !== null) return 1;
        if (a.diasRestantes !== null && b.diasRestantes === null) return -1;
        if (a.diasRestantes !== null && b.diasRestantes !== null) return a.diasRestantes - b.diasRestantes;
        return 0;
      });

      return res.json(allAlerts);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener alertas" });
    }
  });

  // Alerts: Dismiss an alert
  app.post("/api/alerts/dismiss", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const { convenioId, alertKey } = req.body;
      if (!convenioId || !alertKey) {
        return res.status(400).json({ error: "convenioId y alertKey son obligatorios" });
      }

      const db = await getDb();
      await db.run(
        "INSERT OR IGNORE INTO dismissed_alerts (user_id, convenio_id, alert_key) VALUES (?, ?, ?)",
        [user.id, convenioId, alertKey]
      );

      return res.json({ success: true, message: "Alerta silenciada correctamente" });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al silenciar alerta" });
    }
  });

  // Convenios: Import/Seeding custom list
  app.post("/api/convenios/import", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const db = await getDb();
      const list = req.body;

      if (!Array.isArray(list)) {
        return res.status(400).json({ error: "Los datos a importar deben ser una lista (array)." });
      }

      let importedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const item of list) {
        try {
          if (!item.codigo || !item.titulo_proyecto) {
            errorCount++;
            errors.push(`Convenio sin código o título omitido.`);
            continue;
          }

          // Check unique
          const existing = await db.get("SELECT id FROM convenios WHERE codigo = ?", [item.codigo]);
          if (existing) {
            errorCount++;
            errors.push(`El código '${item.codigo}' ya existe.`);
            continue;
          }

          const query = `
            INSERT INTO convenios (
              plan_servicio, correo_responsable, codigo, titulo_proyecto, no_convenio,
              tipologia, facultad, programa, grupo, codigo_grupo, categoria,
              investigador_principal, cedula, coinvestigador, responsable_proceso,
              cedula_responsable_proceso, correo_responsable_proceso, valor, valor_letras,
              duracion, disponibilidad_presupuestal, registro_presupuestal,
              acta_aprobacion_poliza, fecha_inicio, fecha_terminacion, primer_informe,
              fecha_suspension, fecha_reinicio, fecha_acta_aprobacion_ampliacion_poliza,
              fecha_terminacion_ampliacion, segundo_informe, correo_investigador,
              fecha_terminacion_prorroga
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          const params = [
            item.plan_servicio || null,
            item.correo_responsable || null,
            item.codigo,
            item.titulo_proyecto,
            item.no_convenio || null,
            item.tipologia || null,
            item.facultad || null,
            item.programa || null,
            item.grupo || null,
            item.codigo_grupo || null,
            item.categoria || null,
            item.investigador_principal || null,
            item.cedula || null,
            item.coinvestigador || null,
            item.responsable_proceso || item.coinvestigador || null,
            item.cedula_responsable_proceso || null,
            item.correo_responsable_proceso || null,
            item.valor ? parseFloat(item.valor) : null,
            item.valor_letras || null,
            item.duracion || null,
            item.disponibilidad_presupuestal || null,
            item.registro_presupuestal || null,
            item.acta_aprobacion_poliza || null,
            item.fecha_inicio || null,
            item.fecha_terminacion || null,
            item.primer_informe || null,
            item.fecha_suspension || null,
            item.fecha_reinicio || null,
            item.fecha_acta_aprobacion_ampliacion_poliza || null,
            item.fecha_terminacion_ampliacion || null,
            item.segundo_informe || null,
            item.correo_investigador || null,
            item.fecha_terminacion_prorroga || null
          ];

          await db.run(query, params);
          importedCount++;
        } catch (singleErr: any) {
          errorCount++;
          errors.push(`Error al importar '${item.codigo || "Desconocido"}': ${singleErr.message}`);
        }
      }

      if (importedCount > 0) {
        await logAudit(db, user, 'IMPORTACION', 'convenio', 'batch', `Importación masiva: ${importedCount} convenios creados exitosamente`);
      }

      return res.json({
        success: true,
        importedCount,
        errorCount,
        errors
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error en proceso de importación: " + err.message });
    }
  });

  // GET /api/audit-logs (Admin only) - Last 20 DB changes
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const db = await getDb();
      const logs = await db.all("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20");
      return res.json({ logs });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al consultar logs de auditoría: " + err.message });
    }
  });

  // POST /api/admin/reset-database (Admin only) - Reset database to blank state
  app.post("/api/admin/reset-database", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador para inicializar la base de datos" });
      }

      const db = await getDb();

      // Clear all convenios, catalog tables (planes, facultades, tipologías) and dismissed alerts
      await db.run("DELETE FROM convenios");
      await db.run("DELETE FROM dismissed_alerts");
      await db.run("DELETE FROM audit_logs");
      await db.run("DELETE FROM planes_servicio");
      await db.run("DELETE FROM facultades");
      await db.run("DELETE FROM tipologias");

      // Log audit action as the first entry in fresh audit log
      await logAudit(
        db,
        user,
        'RESET_BD',
        'sistema',
        'database',
        `Inicialización de base de datos en blanco por el administrador ${user.name || user.email}`
      );

      return res.json({
        success: true,
        message: "La base de datos se ha inicializado en blanco exitosamente."
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al inicializar la base de datos: " + err.message });
    }
  });

  // GET /api/admin/backup-database (Admin only) - Download SQLite .db backup file
  app.get("/api/admin/backup-database", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador para descargar el respaldo de la base de datos" });
      }

      const db = await getDb();
      try {
        await db.run("PRAGMA wal_checkpoint(FULL)");
      } catch (e) {
        // WAL mode checkpoint attempt
      }

      const dbPath = path.resolve(process.cwd(), "convenios.db");
      if (!fs.existsSync(dbPath)) {
        return res.status(404).json({ error: "Archivo de base de datos convenios.db no encontrado." });
      }

      await logAudit(
        db,
        user,
        'BACKUP_BD',
        'sistema',
        'database',
        `Descarga de respaldo de base de datos SQLite (.db) por el administrador ${user.name || user.email}`
      );

      const dateStr = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "application/x-sqlite3");
      res.setHeader("Content-Disposition", `attachment; filename="backup_convenios_${dateStr}.db"`);
      return res.sendFile(dbPath);
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al generar copia de respaldo: " + err.message });
    }
  });

  // POST /api/admin/restore-database (Admin only) - Restore SQLite .db backup file
  app.post("/api/admin/restore-database", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador para restaurar la base de datos" });
      }

      const { fileData } = req.body;
      if (!fileData || typeof fileData !== 'string') {
        return res.status(400).json({ error: "No se proporcionaron datos de archivo válidos para restaurar." });
      }

      // Convert base64 string to buffer
      const buffer = Buffer.from(fileData, 'base64');

      // Check minimum file size and SQLite magic header "SQLite format 3\0"
      if (buffer.length < 100) {
        return res.status(400).json({ error: "El archivo subido es demasiado pequeño o no es un archivo .db válido." });
      }

      const headerStr = buffer.toString('utf8', 0, 15);
      if (!headerStr.startsWith('SQLite format 3')) {
        return res.status(400).json({ error: "El archivo proporcionado no tiene la firma de cabecera de una base de datos SQLite (.db) válida." });
      }

      // Safely close existing DB connection
      await closeDb();

      // Overwrite convenios.db with restored file
      const dbPath = path.resolve(process.cwd(), "convenios.db");
      fs.writeFileSync(dbPath, buffer);

      // Re-initialize database instance and run migrations if needed
      const db = await getDb();

      // Log restore event in audit logs
      await logAudit(
        db,
        user,
        'RESTORE_BD',
        'sistema',
        'database',
        `Restauración completa de base de datos SQLite (.db) por el administrador ${user.name || user.email}`
      );

      return res.json({
        success: true,
        message: "Base de datos restaurada con éxito a partir del archivo de respaldo subido."
      });
    } catch (err: any) {
      console.error("Error restoring database:", err);
      return res.status(500).json({ error: "Error al restaurar la base de datos: " + err.message });
    }
  });


  // --- CATALOG API ENDPOINTS: PLANES DE SERVICIO ---

  // GET /api/planes_servicio
  app.get("/api/planes_servicio", async (req, res) => {
    try {
      const db = await getDb();
      const planes = await db.all("SELECT id, nombre FROM planes_servicio ORDER BY nombre ASC");
      return res.json({ planes });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener planes de servicio" });
    }
  });

  // POST /api/planes_servicio (Admin only)
  app.post("/api/planes_servicio", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const { nombre } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: "El nombre del plan de servicio es obligatorio" });
      }

      const db = await getDb();
      const trimmed = nombre.trim();
      const existing = await db.get("SELECT id FROM planes_servicio WHERE LOWER(nombre) = LOWER(?)", [trimmed]);
      if (existing) {
        return res.status(400).json({ error: "Ya existe un plan de servicio con este nombre" });
      }

      const result = await db.run("INSERT INTO planes_servicio (nombre) VALUES (?)", [trimmed]);
      return res.json({ id: result.lastID, nombre: trimmed });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al crear plan de servicio: " + err.message });
    }
  });

  // PUT /api/planes_servicio/:id (Admin only)
  app.put("/api/planes_servicio/:id", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const { id } = req.params;
      const { nombre } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: "El nombre del plan de servicio es obligatorio" });
      }

      const db = await getDb();
      const current = await db.get("SELECT id, nombre FROM planes_servicio WHERE id = ?", [id]);
      if (!current) {
        return res.status(404).json({ error: "Plan de servicio no encontrado" });
      }

      const trimmed = nombre.trim();
      const duplicate = await db.get("SELECT id FROM planes_servicio WHERE LOWER(nombre) = LOWER(?) AND id != ?", [trimmed, id]);
      if (duplicate) {
        return res.status(400).json({ error: "Ya existe otro plan de servicio con este nombre" });
      }

      const oldName = current.nombre;
      await db.run("UPDATE planes_servicio SET nombre = ? WHERE id = ?", [trimmed, id]);
      // Update existing convenios that reference the old name
      await db.run("UPDATE convenios SET plan_servicio = ? WHERE plan_servicio = ?", [trimmed, oldName]);

      return res.json({ success: true, id: Number(id), nombre: trimmed });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al actualizar plan de servicio: " + err.message });
    }
  });

  // DELETE /api/planes_servicio/:id (Admin only)
  app.delete("/api/planes_servicio/:id", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const { id } = req.params;
      const db = await getDb();
      await db.run("DELETE FROM planes_servicio WHERE id = ?", [id]);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al eliminar plan de servicio: " + err.message });
    }
  });


  // --- CATALOG API ENDPOINTS: FACULTADES RESPONSABLES ---

  // GET /api/facultades
  app.get("/api/facultades", async (req, res) => {
    try {
      const db = await getDb();
      const facultades = await db.all("SELECT id, nombre FROM facultades ORDER BY nombre ASC");
      return res.json({ facultades });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener facultades" });
    }
  });

  // POST /api/facultades (Admin only)
  app.post("/api/facultades", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const { nombre } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: "El nombre de la facultad es obligatorio" });
      }

      const db = await getDb();
      const trimmed = nombre.trim();
      const existing = await db.get("SELECT id FROM facultades WHERE LOWER(nombre) = LOWER(?)", [trimmed]);
      if (existing) {
        return res.status(400).json({ error: "Ya existe una facultad con este nombre" });
      }

      const result = await db.run("INSERT INTO facultades (nombre) VALUES (?)", [trimmed]);
      return res.json({ id: result.lastID, nombre: trimmed });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al crear facultad: " + err.message });
    }
  });

  // PUT /api/facultades/:id (Admin only)
  app.put("/api/facultades/:id", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const { id } = req.params;
      const { nombre } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: "El nombre de la facultad es obligatorio" });
      }

      const db = await getDb();
      const current = await db.get("SELECT id, nombre FROM facultades WHERE id = ?", [id]);
      if (!current) {
        return res.status(404).json({ error: "Facultad no encontrada" });
      }

      const trimmed = nombre.trim();
      const duplicate = await db.get("SELECT id FROM facultades WHERE LOWER(nombre) = LOWER(?) AND id != ?", [trimmed, id]);
      if (duplicate) {
        return res.status(400).json({ error: "Ya existe otra facultad con este nombre" });
      }

      const oldName = current.nombre;
      await db.run("UPDATE facultades SET nombre = ? WHERE id = ?", [trimmed, id]);
      // Update existing convenios that reference the old name
      await db.run("UPDATE convenios SET facultad = ? WHERE facultad = ?", [trimmed, oldName]);

      return res.json({ success: true, id: Number(id), nombre: trimmed });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al actualizar facultad: " + err.message });
    }
  });

  // DELETE /api/facultades/:id (Admin only)
  app.delete("/api/facultades/:id", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const { id } = req.params;
      const db = await getDb();
      await db.run("DELETE FROM facultades WHERE id = ?", [id]);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al eliminar facultad: " + err.message });
    }
  });


  // --- CATALOG API ENDPOINTS: TIPOLOGÍAS DE CONVENIO ---

  // GET /api/tipologias
  app.get("/api/tipologias", async (req, res) => {
    try {
      const db = await getDb();
      const tipologias = await db.all("SELECT id, nombre FROM tipologias ORDER BY nombre ASC");
      return res.json({ tipologias });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener tipologías" });
    }
  });

  // POST /api/tipologias (Admin only)
  app.post("/api/tipologias", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const { nombre } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: "El nombre de la tipología es obligatorio" });
      }

      const db = await getDb();
      const trimmed = nombre.trim();
      const existing = await db.get("SELECT id FROM tipologias WHERE LOWER(nombre) = LOWER(?)", [trimmed]);
      if (existing) {
        return res.status(400).json({ error: "Ya existe una tipología con este nombre" });
      }

      const result = await db.run("INSERT INTO tipologias (nombre) VALUES (?)", [trimmed]);
      return res.json({ id: result.lastID, nombre: trimmed });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al crear tipología: " + err.message });
    }
  });

  // PUT /api/tipologias/:id (Admin only)
  app.put("/api/tipologias/:id", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const { id } = req.params;
      const { nombre } = req.body;
      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: "El nombre de la tipología es obligatorio" });
      }

      const db = await getDb();
      const current = await db.get("SELECT id, nombre FROM tipologias WHERE id = ?", [id]);
      if (!current) {
        return res.status(404).json({ error: "Tipología no encontrada" });
      }

      const trimmed = nombre.trim();
      const duplicate = await db.get("SELECT id FROM tipologias WHERE LOWER(nombre) = LOWER(?) AND id != ?", [trimmed, id]);
      if (duplicate) {
        return res.status(400).json({ error: "Ya existe otra tipología con este nombre" });
      }

      const oldName = current.nombre;
      await db.run("UPDATE tipologias SET nombre = ? WHERE id = ?", [trimmed, id]);
      // Update existing convenios that reference the old name
      await db.run("UPDATE convenios SET tipologia = ? WHERE tipologia = ?", [trimmed, oldName]);

      return res.json({ success: true, id: Number(id), nombre: trimmed });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al actualizar tipología: " + err.message });
    }
  });

  // DELETE /api/tipologias/:id (Admin only)
  app.delete("/api/tipologias/:id", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const { id } = req.params;
      const db = await getDb();
      await db.run("DELETE FROM tipologias WHERE id = ?", [id]);
      return res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al eliminar tipología: " + err.message });
    }
  });

  // POST /api/catalogs/import (Bulk import items into planes_servicio, facultades, or tipologias)
  app.post("/api/catalogs/import", async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Requiere rol de administrador" });
      }

      const { targetTable, items } = req.body;
      if (!targetTable || !['planes_servicio', 'facultades', 'tipologias'].includes(targetTable)) {
        return res.status(400).json({ error: "Tabla de catálogo inválida" });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Debe proporcionar una lista no vacía de elementos" });
      }

      const db = await getDb();
      let importedCount = 0;
      let skippedCount = 0;

      for (const rawName of items) {
        if (typeof rawName !== 'string') continue;
        const trimmed = rawName.trim();
        if (!trimmed) continue;

        const existing = await db.get(
          `SELECT id FROM ${targetTable} WHERE LOWER(nombre) = LOWER(?)`,
          [trimmed]
        );

        if (existing) {
          skippedCount++;
        } else {
          await db.run(`INSERT INTO ${targetTable} (nombre) VALUES (?)`, [trimmed]);
          importedCount++;
        }
      }

      const catalogNameMap: Record<string, string> = {
        planes_servicio: "Planes de Servicio",
        facultades: "Facultades Responsables",
        tipologias: "Tipologías de Convenio"
      };

      await logAudit(
        db,
        user,
        "IMPORTAR_CATALOGO_EXCEL",
        "catalogs",
        targetTable,
        `Se importaron ${importedCount} registros en ${catalogNameMap[targetTable] || targetTable} desde Excel (${skippedCount} duplicados omitidos)`
      );

      return res.json({
        success: true,
        importedCount,
        skippedCount,
        total: items.length,
        message: `Se importaron ${importedCount} elementos exitosamente en ${catalogNameMap[targetTable] || targetTable}.${skippedCount > 0 ? ` (${skippedCount} ya existían y fueron omitidos)` : ''}`
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Error al importar catálogo desde Excel: " + err.message });
    }
  });


  // Helper function to calculate next scheduled execution date based on scheduled time and active days
  const computeNextScheduledDate = (now: Date, timeStr: string, daysStr: string): Date => {
    const parts = (timeStr || "08:00").split(":");
    const targetHour = parseInt(parts[0] || "8", 10);
    const targetMinute = parseInt(parts[1] || "0", 10);

    const rawDays = (daysStr || "1,2,3,4,5")
      .split(",")
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 0 && n <= 6);
    const allowedDays = rawDays.length > 0 ? rawDays : [1, 2, 3, 4, 5];

    const candidate = new Date(now);
    candidate.setHours(targetHour, targetMinute, 0, 0);

    for (let i = 0; i < 14; i++) {
      const candidateDay = candidate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
      if (candidate.getTime() > now.getTime() && allowedDays.includes(candidateDay)) {
        return candidate;
      }
      candidate.setDate(candidate.getDate() + 1);
    }

    return candidate;
  };

  // Variable tracking last automated daily alerts run
  let lastDailyCheckAt: string | null = null;

  // GET /api/system/time-status - Serves live server time and email notification scheduling status
  app.get("/api/system/time-status", async (req, res) => {
    try {
      const db = await getDb();
      const settings = await db.get("SELECT enabled, scheduled_time, scheduled_days, user FROM email_settings LIMIT 1");
      
      const now = new Date();
      let scheduledTime = "08:00";
      let scheduledDays = "1,2,3,4,5";
      let enabled = false;
      
      if (settings) {
        if (settings.scheduled_time) scheduledTime = settings.scheduled_time;
        if (settings.scheduled_days) scheduledDays = settings.scheduled_days;
        enabled = Boolean(settings.enabled);
      }
      
      const nextRun = computeNextScheduledDate(now, scheduledTime, scheduledDays);

      let lastCheckISO = lastDailyCheckAt;
      if (!lastCheckISO) {
        const lastCheckLog = await db.get(
          "SELECT created_at FROM audit_logs WHERE action = 'ALERTA_DIARIA_AUTO' ORDER BY id DESC LIMIT 1"
        );
        if (lastCheckLog) {
          lastCheckISO = lastCheckLog.created_at;
        }
      }

      let liveVersion = getAppVersion();

      return res.json({
        appVersion: liveVersion,
        serverTimeISO: now.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        emailSchedule: {
          enabled,
          scheduledTime,
          scheduledDays,
          nextRunISO: nextRun.toISOString(),
          lastCheckISO: lastCheckISO || null
        }
      });
    } catch (err: any) {
      console.error("Error in /api/system/time-status:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/system/version - Serves current application version
  app.get("/api/system/version", (req, res) => {
    return res.json({ version: getAppVersion() });
  });

  // --- AUTOMATIC ALERTS SCHEDULER (BACKGROUND THREAD) ---

  const runDailyAlertsCheck = async () => {
    try {
      console.log("[SCHEDULER] Iniciando chequeo diario automático de alertas de convenios...");
      lastDailyCheckAt = new Date().toISOString();
      const db = await getDb();
      const settings = await db.get("SELECT enabled, user, scheduled_time, scheduled_days FROM email_settings LIMIT 1");
      if (!settings || !settings.enabled) {
        console.log("[SCHEDULER] El envío automático está desactivado en la configuración de correo.");
        return;
      }

      // Check if current day of week is allowed
      const currentDay = new Date().getDay(); // 0 = Domingo, 1 = Lunes, etc.
      const scheduledDaysStr = settings.scheduled_days || '1,2,3,4,5';
      const allowedDays = scheduledDaysStr.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n));

      if (allowedDays.length > 0 && !allowedDays.includes(currentDay)) {
        console.log(`[SCHEDULER] Omitiendo envío diario: el día de hoy (${currentDay}) no está dentro de los días de envío programados (${scheduledDaysStr}).`);
        return;
      }

      const list = await db.all("SELECT * FROM convenios");
      const dismissed = await db.all("SELECT convenio_id, alert_key FROM dismissed_alerts");
      const dismissedKeys = dismissed.map(d => `${d.convenio_id}:${d.alert_key}`);

      const todayStr = new Date().toISOString().split('T')[0];
      let sentCount = 0;

      for (const c of list) {
        const alerts = computeAlertsForConvenio(c, todayStr, dismissedKeys);
        if (alerts.length > 0) {
          const rawRecipients = [c.correo_investigador, c.correo_responsable_proceso];
          const recipients = Array.from(new Set(rawRecipients.filter((r): r is string => Boolean(r && r.trim())).map(r => r.trim())));

          for (const recipient of recipients) {
            const alertsHtml = alerts.map(a => `
              <li style="margin-bottom: 12px; padding: 12px; border-left: 4px solid ${
                a.severidad === 'danger' ? '#ef4444' : a.severidad === 'warning_high' ? '#f97316' : a.severidad === 'warning_low' ? '#eab308' : '#3b82f6'
              }; background-color: #f8fafc; border-radius: 0 8px 8px 0; list-style-type: none;">
                <div style="font-weight: bold; color: #1e293b; font-size: 14px;">
                  [ALERTA: ${a.tipo.toUpperCase()}]
                </div>
                <div style="color: #475569; font-size: 13px; margin-top: 4px;">
                  ${a.mensaje}
                </div>
                <div style="color: #94a3b8; font-size: 11px; margin-top: 4px;">
                  Fecha de referencia: ${a.fechaReferencia || 'N/A'}
                </div>
              </li>
            `).join("");

            const subject = `[ALERTA DIARIA AUTOMÁTICA] Alertas de convenio: ${c.codigo}`;
            const html = `
              <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #4f46e5; margin: 0; font-family: system-ui, sans-serif;">Sistema de Alertas de Convenios</h2>
                  <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">Control automático diario de plazos</p>
                </div>
                
                <p style="color: #334155; font-size: 15px; line-height: 1.6;">Estimado/a Responsable,</p>
                <p style="color: #334155; font-size: 15px; line-height: 1.6;">Este es un recordatorio automático diario. El siguiente convenio cuenta con <strong>alertas de vencimiento o plazos activos</strong> pendientes:</p>
                
                <div style="background-color: #f1f5f9; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #e2e8f0;">
                  <strong style="font-size: 16px; color: #0f172a;">${c.codigo} - ${c.titulo_proyecto}</strong><br/>
                  <div style="color: #64748b; font-size: 13px; margin-top: 6px;">
                    <strong>Director/Investigador:</strong> ${c.investigador_principal || 'No especificado'}<br/>
                    <strong>Responsable del Proceso:</strong> ${c.responsable_proceso || c.coinvestigador || 'No especificado'}<br/>
                    <strong>No. Convenio:</strong> ${c.no_convenio || 'N/A'}
                  </div>
                </div>

                <h3 style="color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 25px;">Alertas Activas:</h3>
                <ul style="padding-left: 0; margin-top: 15px;">
                  ${alertsHtml}
                </ul>

                <p style="color: #4f46e5; font-size: 14px; font-weight: bold; margin-top: 25px;">
                  👉 Por favor, ingrese al Gestor de Convenios para tramitar la adición, prórroga, póliza o registro correspondiente.
                </p>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Este mensaje fue enviado de manera automática por la plataforma de Gestión de Convenios. Por favor no responda a este correo.</p>
              </div>
            `;

            const emailRes = await sendEmail({ to: recipient, subject, html });
            if (emailRes.success) {
              sentCount++;
              console.log(`[SCHEDULER] Notificación enviada con éxito para ${c.codigo} a ${recipient}`);
            } else {
              console.error(`[SCHEDULER] Error al enviar notificación de ${c.codigo} a ${recipient}: ${emailRes.error || ''}`);
            }
          }
        }
      }
      console.log(`[SCHEDULER] Chequeo diario finalizado. Correos enviados de manera automática: ${sentCount}`);

      try {
        await logAudit(
          db,
          { id: 0, email: 'sistema@local', name: 'Sistema Automático', role: 'admin' },
          'ALERTA_DIARIA_AUTO',
          'sistema',
          'scheduler',
          `Chequeo diario de alertas ejecutado a las ${settings.scheduled_time || '08:00'}. Correos enviados: ${sentCount}`
        );
      } catch (logErr) {
        console.error("[SCHEDULER] Error guardando log de auditoría del scheduler:", logErr);
      }
    } catch (error) {
      console.error("[SCHEDULER] Error en el chequeo de alertas diario automático:", error);
    }
  };

  const startEmailNotificationScheduler = () => {
    const getMsUntilNextScheduledTime = async () => {
      let timeStr = "08:00";
      let daysStr = "1,2,3,4,5";

      try {
        const db = await getDb();
        const settings = await db.get("SELECT scheduled_time, scheduled_days FROM email_settings LIMIT 1");
        if (settings) {
          if (settings.scheduled_time) timeStr = settings.scheduled_time;
          if (settings.scheduled_days) daysStr = settings.scheduled_days;
        }
      } catch (err) {
        console.error("[SCHEDULER] Error al obtener hora y días programados:", err);
      }

      const now = new Date();
      const nextRunDate = computeNextScheduledDate(now, timeStr, daysStr);

      return { delay: nextRunDate.getTime() - now.getTime(), targetTimeStr: nextRunDate.toLocaleString() };
    };

    const scheduleNextRun = async () => {
      const { delay, targetTimeStr } = await getMsUntilNextScheduledTime();
      console.log(`[SCHEDULER] Próximo chequeo automático de alertas programado para: ${targetTimeStr} (en ${Math.round(delay / 1000 / 60)} minutos)`);
      
      setTimeout(async () => {
        await runDailyAlertsCheck();
        // Schedule next one
        scheduleNextRun();
      }, delay);
    };

    // Run an initial check 30 seconds after startup
    setTimeout(() => {
      console.log("[SCHEDULER] Ejecutando chequeo inicial de arranque para verificación inmediata...");
      runDailyAlertsCheck().catch(err => console.error("[SCHEDULER] Error en chequeo inicial:", err));
    }, 30000);

    scheduleNextRun();
  };

  // Start the automated alert scheduler
  startEmailNotificationScheduler();


  // --- VITE MIDDLEWARE / STATIC ASSETS ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA routing - Express v4 route matches everything for SPA index.html serving
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
