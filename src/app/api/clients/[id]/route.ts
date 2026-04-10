import { NextRequest, NextResponse } from 'next/server';
import { getDB, get, run } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getDB();
    const client = await get('SELECT * FROM clients WHERE id = ?', [parseInt(id)]);
    
    if (!client) {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching client' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getDB();
    const body = await request.json();
    const { name, phone, address, dni_front, dni_back, bcra_status, cuil } = body;

    if (!name && !phone && !address && !dni_front && !dni_back && !bcra_status && !cuil) {
      return NextResponse.json({ message: 'Se requiere al menos un campo para actualizar' }, { status: 400 });
    }

    const now = new Date();
    const updates: string[] = [];
    const values: any[] = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address || null);
    }
    if (dni_front !== undefined && dni_front !== '') {
      updates.push('dni_front = ?');
      values.push(dni_front);
    }
    if (dni_back !== undefined && dni_back !== '') {
      updates.push('dni_back = ?');
      values.push(dni_back);
    }
    if (bcra_status !== undefined) {
      updates.push('bcra_status = ?');
      values.push(bcra_status || null);
      updates.push('bcra_updated_at = ?');
      values.push(now.toISOString());
    }
    if (cuil !== undefined) {
      const cleanCuil = cuil.replace(/\s/g, '').replace(/\D/g, '');
      if (cleanCuil && (cleanCuil.length < 8 || cleanCuil.length > 11)) {
        return NextResponse.json({ message: 'El CUIL debe tener entre 8 y 11 dígitos' }, { status: 400 });
      }
      updates.push('cuil = ?');
      values.push(cleanCuil || null);
    }
    updates.push('updated_at = ?');
    values.push(now.toISOString());
    values.push(parseInt(id));

    await run(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`, values);

    const client = await get('SELECT * FROM clients WHERE id = ?', [parseInt(id)]);
    
    if (!client) {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Cliente actualizado exitosamente',
      client
    });
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Error updating client: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getDB();
    
    const loans = await get('SELECT COUNT(*) as count FROM loans WHERE client_id = ?', [parseInt(id)]);
    
    if (loans && Number(loans.count) > 0) {
      return NextResponse.json({ 
        message: 'No se puede eliminar el cliente porque tiene préstamos asociados' 
      }, { status: 400 });
    }

    const result = await run('DELETE FROM clients WHERE id = ?', [parseInt(id)]);
    
    if (result.changes === 0) {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting client' }, { status: 500 });
  }
}
