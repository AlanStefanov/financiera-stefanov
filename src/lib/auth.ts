import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export function getJwtSecret() {
  return process.env.JWT_SECRET || 'default_secret_change_in_production';
}

export function authMiddleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return { valid: true, user: decoded };
  } catch (error: any) {
    return NextResponse.json({ message: 'Token inválido: ' + (error.message || 'invalid token') }, { status: 401 });
  }
}

export function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    return jwt.verify(token, getJwtSecret()) as { id: number; username: string; role: string };
  } catch {
    return null;
  }
}

export function verifyToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as { id: number; role: string; username?: string };
}
