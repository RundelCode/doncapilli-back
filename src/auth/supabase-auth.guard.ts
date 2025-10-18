// src/auth/supabase-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private static jwksCache: { exp: number; jwks: any } | null = null;

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const { jwtVerify, createLocalJWKSet } = await import('jose');
    const { createSecretKey } = await import('crypto');

    const baseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
    if (!baseUrl) throw new Error('SUPABASE_URL no configurado');

    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const token = auth.slice(7).trim();

    // Decodifica header para detectar alg
    let header: any;
    try {
      header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Invalid JWT format');
    }
    const alg: string = header?.alg ?? '';

    const issuer = `${baseUrl}/auth/v1`;

    if (alg.startsWith('HS')) {
      // ====== HS (secreto simétrico) ======
      const secret = (process.env.SUPABASE_JWT_SECRET || '').trim();
      if (!secret) {
        throw new UnauthorizedException(
          'Falta SUPABASE_JWT_SECRET en .env (Settings → API → JWT Settings → JWT Secret).'
        );
      }

      // probamos varias interpretaciones del secret:
      const candidates = [
        () => createSecretKey(Buffer.from(secret, 'utf-8')),
        () => createSecretKey(Buffer.from(secret, 'base64')),
        () => createSecretKey(Buffer.from(secret, 'base64url')),
        () => createSecretKey(Buffer.from(secret, 'hex')),
      ];

      let lastErr: any = null;
      for (const mk of candidates) {
        try {
          const key = mk();
          const { payload } = await jwtVerify(token, key, {
            // algunos proyectos no ponen issuer; si falla, quita issuer
            algorithms: ['HS256', 'HS512'],
          });
          (req as any).user = payload;
          return true;
        } catch (e) {
          lastErr = e;
          // sigue probando el siguiente formato
        }
      }
      console.error('JWT verify failed (HS) con todas las variantes:', lastErr);
      throw new UnauthorizedException('Invalid token (HS): secret incorrecto o formato inválido');
    }

    // ====== RS/ECDSA (JWKS) ======
    const now = Date.now();
    let jwksJson: any | null = null;
    if (SupabaseAuthGuard.jwksCache && SupabaseAuthGuard.jwksCache.exp > now) {
      jwksJson = SupabaseAuthGuard.jwksCache.jwks;
    } else {
      const jwksUrl = `${baseUrl}/auth/v1/.well-known/jwks.json`;
      const resp = await fetch(jwksUrl);
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.error('JWKS status:', resp.status, resp.statusText, 'Body:', text?.slice(0, 200));
        throw new UnauthorizedException(`Unable to fetch JWKS (HTTP ${resp.status})`);
      }
      jwksJson = await resp.json();
      SupabaseAuthGuard.jwksCache = { exp: now + 10 * 60 * 1000, jwks: jwksJson };
    }

    try {
      const { createLocalJWKSet } = await import('jose');
      const JWKS = createLocalJWKSet(jwksJson);
      const { payload } = await jwtVerify(token, JWKS, {
        issuer,
        algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'EdDSA'],
      });
      (req as any).user = payload;
      return true;
    } catch (e) {
      console.error('JWT verify failed (JWKS):', e);
      throw new UnauthorizedException('Invalid token (JWKS)');
    }
  }
}
