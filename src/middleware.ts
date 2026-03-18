// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { UserRole } from '@/constants/userRole';
import { getDashboardPathByRole } from '@/lib/auth-utils';

interface DecodedToken {
  role?: string;
  status?: string;
  exp?: number;
  [key: string]: any;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const pathname = request.nextUrl.pathname;

  // Sin token → login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  let decoded: DecodedToken;
  try {
    decoded = jwtDecode<DecodedToken>(token);
  } catch {
    // Token malformado → limpiar cookie y redirigir
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('token');
    res.cookies.delete('refreshToken');
    return res;
  }

  // Token expirado → limpiar y redirigir
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < now) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('token');
    res.cookies.delete('refreshToken');
    return res;
  }

  const userRole = decoded.role;
  const correctPath = getDashboardPathByRole(userRole);

  // Si intenta acceder a un dashboard que no le corresponde
  // → redirigir a su dashboard correcto
  if (pathname.startsWith('/dashboard/patient') && userRole !== UserRole.PATIENT) {
    return NextResponse.redirect(
      new URL(correctPath, request.url)
    );
  }

  if (pathname.startsWith('/dashboard/doctor') && userRole !== UserRole.DOCTOR) {
    return NextResponse.redirect(
      new URL(correctPath, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};