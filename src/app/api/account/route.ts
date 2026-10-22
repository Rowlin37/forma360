import { NextResponse } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from '@/lib/supabase/server';

/**
 * Elimina todos los datos personales asociados al usuario autenticado en Supabase
 * (y la identidad en `auth.users` cuando `SUPABASE_SERVICE_ROLE_KEY` está configurada en servidor).
 */
export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: true, mode: 'local_only', message: 'Supabase no configurado en servidor.' },
      { status: 200 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: 'Sesión no autenticada.' },
      { status: 401 }
    );
  }

  // Borrado relacional explícito respetando políticas RLS
  await supabase.from('profiles').delete().eq('user_id', user.id);

  // Si existe clave privada de administración en servidor, borrar también el registro en auth.users
  const adminClient = createSupabaseServiceRoleClient();
  if (adminClient) {
    await adminClient.auth.admin.deleteUser(user.id);
  }

  return NextResponse.json({
    ok: true,
    deletedUserId: user.id,
    deletedAuthIdentity: Boolean(adminClient),
  });
}
