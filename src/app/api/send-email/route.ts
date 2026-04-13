import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import path from 'path';
import dns from 'dns';
import { getJwtSecret } from '@/lib/auth';

const smtpPort = parseInt(process.env.SMTP_PORT || '587');

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { role: string };
    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Solo admins pueden enviar emails' }, { status: 403 });
    }

    const { to, subject, body, inlineImage } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('Missing SMTP configuration');
      return NextResponse.json({ message: 'Error al enviar email: configuración SMTP incompleta' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      lookup: (
        hostname: string,
        options: any,
        callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
      ) => {
        dns.lookup(hostname, { family: 4, all: false }, callback);
      },
    } as SMTPTransport.Options);

    const mailOptions: any = {
      from: process.env.SMTP_USER,
      to,
      subject,
      html: body,
    };

    if (inlineImage) {
      mailOptions.attachments = [
        {
          filename: 'email-image.png',
          path: path.join(process.cwd(), 'public', 'email-image.png'),
          cid: 'email-image@stefanov',
        },
      ];
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'Email enviado exitosamente' });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ message: 'Error al enviar email: ' + (error.message || 'Error desconocido') }, { status: 500 });
  }
}