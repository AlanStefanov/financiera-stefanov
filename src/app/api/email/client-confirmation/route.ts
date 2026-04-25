import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export async function POST(request: NextRequest) {
  let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({ message: 'Error de configuración' }, { status: 500 });
    }

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 2rem; text-align: center;">
      <img src="https://i.imgur.com/l5VQf2Q.png" alt="Stefanov" style="height: 60px;">
    </div>
    <div style="padding: 2rem;">
      <h2 style="color: #1e3a5f; margin-top: 0;">¡Bienvenido a Microcréditos Stefanov!</h2>
      <p style="color: #333; line-height: 1.6;">
        Hola <strong>${name}</strong>, gracias por registrarte en nuestro sistema de microcréditos.
      </p>
      <p style="color: #333; line-height: 1.6;">
        Tu solicitud ha sido recibida correctamente. Un operador de crédito te contactará en breve para continuar con el proceso de aprobación.
      </p>
      <p style="color: #333; line-height: 1.6;">
        ¿Tenés alguna consulta? No dudes en contactarnos.
      </p>
      <p style="color: #666; font-size: 0.875rem; margin-top: 2rem; text-align: center;">
        © 2024 Microcréditos Stefanov - Tu partner financiero de confianza
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: smtpUser,
      to: email,
      subject: 'Registro confirmado - Microcréditos Stefanov',
      html: emailHtml,
    });

    return NextResponse.json({ message: 'Email enviado' });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ message: 'Error al enviar email' }, { status: 500 });
  } finally {
    if (transporter && typeof transporter.close === 'function') {
      transporter.close();
    }
  }
}