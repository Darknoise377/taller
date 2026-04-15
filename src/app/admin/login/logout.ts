'use client';

import { message } from 'antd';
import { useRouter } from 'next/navigation';

export async function logout(router?: ReturnType<typeof useRouter>) {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
    message.success('Sesión cerrada');
    router?.push('/admin/login');
  } catch {
    message.error('Error al cerrar sesión');
  }
}
