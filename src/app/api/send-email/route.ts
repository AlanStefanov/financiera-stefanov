import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Solo admins pueden enviar emails' }, { status: 403 });
    }

    const { to, subject, body, inlineImage } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

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
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ message: 'Error al enviar email' }, { status: 500 });
  }
}