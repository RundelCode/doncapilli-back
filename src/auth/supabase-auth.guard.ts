// src/auth/supabase-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private static jwksCache: { exp: number; jwks: any } | null = null;
  private lastPayload: any = null;

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();

    const baseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
    if (!baseUrl) throw new Error('SUPABASE_URL no configurado.');

    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const header = this.decodeHeader(token);
    const alg: string = header?.alg ?? '';
    const expectedIssuer = `${baseUrl}/auth/v1`;

    // Decodifica payload solo para debug de issuer en errores
    const decodedPayload = (() => {
      try {
        const [, p] = token.split('.');
        return JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
      } catch { return null; }
    })();

    if (/^HS/i.test(alg)) {
      const hsOk = await this.tryVerifyHS(token);
      if (!hsOk) {
        throw new UnauthorizedException(
          'Invalid token (HS): SUPABASE_JWT_SECRET incorrecto o formato inválido.'
        );
      }
      (req as any).user = this.lastPayload;
      return true;
    }

    // RS/ES/EdDSA -> JWKS
    try {
      await this.verifyWithJWKS(token, expectedIssuer);
      (req as any).user = this.lastPayload;
      return true;
    } catch (e) {
      throw new UnauthorizedException(
        `Invalid token (JWKS): issuer esperado "${expectedIssuer}", recibido "${decodedPayload?.iss ?? 'desconocido'}".`
      );
    }
  }

  // ===== Helpers =====

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();

    const cookie = req.headers.cookie || '';
    for (const name of ['access_token', 'sb-access-token', 'sb:token']) {
      const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
      if (m) return decodeURIComponent(m[1]);
    }
    return null;
  }

  private decodeHeader(token: string): any {
    try {
      const [h] = token.split('.');
      return JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Invalid JWT format');
    }
  }

  private async verifyWithJWKS(token: string, issuer: string) {
    const { jwtVerify, createLocalJWKSet } = await import('jose');

    const now = Date.now();
    let jwksJson: any | null = null;
    if (SupabaseAuthGuard.jwksCache && SupabaseAuthGuard.jwksCache.exp > now) {
      jwksJson = SupabaseAuthGuard.jwksCache.jwks;
    } else {
      const jwksUrl = `${issuer}/.well-known/jwks.json`;
      const resp = await fetch(jwksUrl);
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new UnauthorizedException(`Unable to fetch JWKS (HTTP ${resp.status}) ${text?.slice(0, 120) ?? ''}`);
      }
      jwksJson = await resp.json();
      SupabaseAuthGuard.jwksCache = { exp: now + 10 * 60 * 1000, jwks: jwksJson };
    }

    const JWKS = createLocalJWKSet(jwksJson);
    const { payload } = await jwtVerify(token, JWKS, {
      issuer,
      algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'EdDSA'],
    });
    this.lastPayload = payload;
  }

  private async tryVerifyHS(token: string): Promise<boolean> {
    const secret = (process.env.SUPABASE_JWT_SECRET || '').trim();
    if (!secret) return false;

    const { jwtVerify } = await import('jose');
    const { createSecretKey } = await import('crypto');

    const candidates = [
      () => createSecretKey(Buffer.from(secret, 'utf-8')),
      () => createSecretKey(Buffer.from(secret, 'base64')),
      () => createSecretKey(Buffer.from(secret, 'base64url')),
      () => createSecretKey(Buffer.from(secret, 'hex')),
    ];

    for (const mk of candidates) {
      try {
        const key = mk();
        const { payload } = await jwtVerify(token, key, {
          algorithms: ['HS256', 'HS384', 'HS512'],
        });
        this.lastPayload = payload;
        return true;
      } catch {
      }
    }
    return false;
  }
}
