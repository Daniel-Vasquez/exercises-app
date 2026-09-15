import { useState } from 'react';
import { signOut } from '@/lib/auth/auth-client';

export default function CerrarSesion() {
  const [saliendo, setSaliendo] = useState(false);

  const alPulsar = async () => {
    setSaliendo(true);
    await signOut();
    // Recarga completa para que el middleware reevalúe la sesión ya invalidada.
    window.location.href = '/';
  };

  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={saliendo}
      className="px-3 py-1.5 rounded-lg border transition-colors hover:border-acento-300 disabled:opacity-60"
      style={{ borderColor: 'var(--borde)', color: 'var(--texto-suave)' }}
    >
      {saliendo ? 'Saliendo…' : 'Salir'}
    </button>
  );
}
