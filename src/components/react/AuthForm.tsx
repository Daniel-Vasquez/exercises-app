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
 *
 * Los campos son NO CONTROLADOS (sin `value` + `onChange`) y se leen con
 * FormData al enviar. Es deliberado:
 *
 *   - Los navegadores y gestores de contraseñas autorrellenan estos campos
 *     ANTES de que la isla llegue a hidratarse. Con inputs controlados, React
 *     encuentra un valor en el DOM donde su render decía `value=""` y aborta
 *     la hidratación con un error de discrepancia (React #418), reconstruyendo
 *     el árbol en cliente.
 *   - Un formulario de acceso no necesita estado por pulsación: solo importa
 *     el contenido al enviar.
 *
 * El atributo `name` de cada campo no es opcional: además de alimentar
 * FormData, es lo que usan los gestores de contraseñas para reconocerlos.
 */
export default function AuthForm({ modo, redirigir = '/' }: Props) {
  const esRegistro = modo === 'registro';

  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const alEnviar = async (evento: React.SubmitEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError(null);

    const datos = new FormData(evento.target);
    const nombre = String(datos.get('nombre') ?? '').trim();
    const correo = String(datos.get('correo') ?? '').trim();
    const password = String(datos.get('password') ?? '');

    // Validación en cliente para dar respuesta inmediata. El servidor vuelve
    // a validar: esto es comodidad, no seguridad.
    if (esRegistro && nombre.length < 2) {
      setError('Escribe tu nombre.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setEnviando(true);

    const resultado = esRegistro
      ? await signUp.email({ name: nombre, email: correo, password })
      : await signIn.email({ email: correo, password });

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
            name="nombre"
            type="text"
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
          name="correo"
          type="email"
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
          name="password"
          type="password"
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
