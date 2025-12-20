import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: AuthError;
}

// Translate Supabase errors to Spanish
function translateError(error: any): string {
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code || '';

  if (message.includes('invalid login credentials') || code === 'invalid_credentials') {
    return 'Email o contraseña incorrectos';
  }
  if (message.includes('user already registered') || code === 'user_already_exists') {
    return 'El email ya está registrado';
  }
  if (message.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (message.includes('invalid email')) {
    return 'El email no es válido';
  }
  if (message.includes('email not confirmed')) {
    return 'Debes confirmar tu email antes de iniciar sesión';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Error de conexión. Revisa tu internet';
  }

  return error?.message || 'Ocurrió un error inesperado';
}

export async function signUp(
  email: string,
  password: string,
  nombreNegocio: string
): Promise<AuthResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No se pudo crear el usuario');

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update nombre_negocio using RLS-safe update
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ nombre_negocio: nombreNegocio })
      .eq('id', authData.user.id);

    if (updateError) console.warn('Advertencia:', updateError);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return {
        success: false,
        error: { message: translateError(error), code: error.code },
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error: any) {
    return {
      success: false,
      error: { message: translateError(error) },
    };
  }
}

export async function signOut(): Promise<{ success: boolean; error?: AuthError }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: { message: translateError(error) },
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: { message: translateError(error) },
    };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: AuthError }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

    if (error) {
      return {
        success: false,
        error: { message: translateError(error) },
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: { message: translateError(error) },
    };
  }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
