import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  sub?: string;
  email?: string;
  role?: string;
  status?: string;
  firstName?: string;
  lastName?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Decodifica un JWT y extrae su payload
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    return decoded;
  } catch (error) {
    console.error('Error decodificando token:', error);
    return null;
  }
}

/**
 * Obtiene el rol del token decodificado
 */
export function getTokenRole(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.role || null;
}

/**
 * Obtiene el status del token decodificado
 */
export function getTokenStatus(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.status || null;
}

/**
 * Obtiene el email del token decodificado
 */
export function getTokenEmail(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.email || null;
}

/**
 * Verifica si el token ha expirado
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}
