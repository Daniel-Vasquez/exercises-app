import { useState } from 'react';
import { signIn, signUp } from '@/lib/auth/auth-client';

interface Props {
  modo: 'login' | 'registro';
  /** Ruta a la que volver tras autenticarse. */
  redirigir?: string;
}

/**
 * Formulario de registro e inicio de sesión.
 *
 * Un solo componente para ambos modos: los campos coinciden salvo el nombre,
 * y duplicarlo llevaría a que las validaciones se desincronizasen.
 */
export default function AuthForm({ modo, redirigir = '/' }: Props) {
  const esRegistro = modo === 'registro';

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const alEnviar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError(null);

    // Se valida en cliente para dar respuesta inmediata, pero el servidor
    // vuelve a validar: esto es comodidad, no seguridad.
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (esRegistro && nombre.trim().length < 2) {
      setError('Escribe tu nombre.');
      return;
    }

    setEnviando(true);

    const resultado = esRegistro
      ? await signUp.email({ name: nombre.trim(), email: correo.trim(), password })
      : await signIn.email({ email: correo.trim(), password });

    if (resultado.error) {
      setError(traducirError(resultado.error.code, resultado.error.message));
      setEnviando(false);
      return;
    }

    // Recarga completa en lugar de navegación en cliente: así el middleware
    // vuelve a ejecutarse y la nueva sesión queda reflejada en el servidor.
    window.location.href = redirigir;
  };

  return (
    <form onSubmit={alEnviar} className="grid gap-4" noValidate>
      {esRegistro && (
        <Campo etiqueta="Nombre" id="nombre">
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="name"
            required
            className={CLASES_INPUT}
            style={ESTILO_INPUT}
          />
        </Campo>
      )}

      <Campo etiqueta="Correo" id="correo">
        <input
          id="correo"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
          className={CLASES_INPUT}
          style={ESTILO_INPUT}
        />
      </Campo>

      <Campo etiqueta="Contraseña" id="password">
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={esRegistro ? 'new-password' : 'current-password'}
          required
          minLength={8}
          className={CLASES_INPUT}
          style={ESTILO_INPUT}
        />
        {esRegistro && (
          <p className="text-xs mt-1" style={{ color: 'var(--texto-suave)' }}>
            Mínimo 8 caracteres.
          </p>
        )}
      </Campo>

      {error && (
        <p
          role="alert"
          className="text-sm rounded-lg px-3 py-2 border"
          style={{
            color: 'var(--color-fallo-500)',
            borderColor: 'var(--color-fallo-500)',
            backgroundColor: 'color-mix(in oklch, var(--color-fallo-500) 8%, transparent)',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="min-h-11 rounded-xl bg-acento-500 text-white font-medium transition-colors hover:bg-acento-600 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {enviando ? 'Un momento…' : esRegistro ? 'Crear cuenta' : 'Entrar'}
      </button>
    </form>
  );
}

const CLASES_INPUT =
  'w-full min-h-11 px-3 rounded-xl border transition-colors focus:border-acento-500';
const ESTILO_INPUT = {
  borderColor: 'var(--borde)',
  backgroundColor: 'var(--superficie)',
  color: 'var(--texto)',
} as const;

function Campo({
  etiqueta,
  id,
  children,
}: {
  etiqueta: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}

/** Los códigos de error de Better Auth llegan en inglés; la UI es en español. */
function traducirError(codigo: string | undefined, respaldo: string | undefined): string {
  const mensajes: Record<string, string> = {
    USER_ALREADY_EXISTS: 'Ya existe una cuenta con ese correo.',
    INVALID_EMAIL_OR_PASSWORD: 'Correo o contraseña incorrectos.',
    INVALID_EMAIL: 'Ese correo no es válido.',
    PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
    PASSWORD_TOO_LONG: 'La contraseña es demasiado larga.',
  };
  return (codigo && mensajes[codigo]) || respaldo || 'No se pudo completar la operación.';
}
