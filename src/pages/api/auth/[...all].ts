import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth/auth';

// Better Auth expone todos sus endpoints (/api/auth/sign-in, /sign-up,
// /sign-out, /get-session…) bajo esta única ruta comodín.
export const prerender = false;

export const ALL: APIRoute = ({ request }) => auth.handler(request);
