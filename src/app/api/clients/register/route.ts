import { NextRequest, NextResponse } from 'next/server';
import { getDB, run, get, all } from '@/lib/db';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export async function POST(request: NextRequest) {
  let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

  try {
    await getDB();
    const body = await request.json();
    const { name, phone, address, cuil, dni_front, dni_back } = body;

    if (!name || !phone || !cuil) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    const existingClient = await get('SELECT id FROM clients WHERE cuil = ?', [cuil]);
    if (existingClient) {
      return NextResponse.json({ message: 'Ya existe un cliente registrado con este CUIL' }, { status: 400 });
    }

    const result = await run(
      'INSERT INTO clients (name, phone, address, cuil, dni_front, dni_back, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, phone, address || null, cuil, dni_front || null, dni_back || null, 1]
    );

    const usersToNotify = await all("SELECT email FROM users WHERE role IN ('admin', 'operator')");

    const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    if (smtpHost && smtpUser && smtpPass && usersToNotify.length > 0) {
      const isGmail = smtpHost.includes('gmail.com');
      const transportOptions: SMTPTransport.Options = {
        host: smtpHost,
        port: isGmail ? 465 : smtpPort,
        secure: isGmail ? true : smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      };

      transporter = nodemailer.createTransport(transportOptions);

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 2rem; text-align: center;">
      <h2 style="color: #fff; margin: 0;">Nuevo Cliente Registrado</h2>
    </div>
    <div style="padding: 2rem;">
      <p style="color: #333;">Se ha registrado un nuevo cliente en el portal público:</p>
      <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
        <p style="margin: 0.5rem 0; color: #333;"><strong>Nombre:</strong> ${name}</p>
        <p style="margin: 0.5rem 0; color: #333;"><strong>Teléfono:</strong> ${phone}</p>
        <p style="margin: 0.5rem 0; color: #333;"><strong>CUIL:</strong> ${cuil}</p>
        ${address ? `<p style="margin: 0.5rem 0; color: #333;"><strong>Dirección:</strong> ${address}</p>` : ''}
      </div>
      <p style="color: #666; font-size: 0.875rem;">
        Ingresá al dashboard para completar el alta del cliente.
      </p>
    </div>
  </div>
</body>
</html>
      `;

      for (const user of usersToNotify) {
        if (user.email) {
          try {
            await transporter.sendMail({
              from: smtpUser,
              to: String(user.email),
              subject: `Nuevo cliente registrado: ${name}`,
              html: emailHtml,
            });
          } catch (emailErr) {
            console.error('Error sending email to operator:', emailErr);
          }
        }
      }
    }

    return NextResponse.json({ 
      message: 'Registro exitoso. Te contactaremos pronto.',
      clientId: Number(result.lastID)
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error registering client:', error);
    return NextResponse.json({ message: 'Error al registrar cliente' }, { status: 500 });
  } finally {
    if (transporter && typeof transporter.close === 'function') {
      transporter.close();
    }
  }
}