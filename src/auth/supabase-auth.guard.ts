import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
    private jwks = createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL}/auth/v1/keys`));
    private issuer = `${process.env.SUPABASE_URL}/auth/v1`;

    async canActivate(ctx: ExecutionContext) {
        const req = ctx.switchToHttp().getRequest();
        const auth: string = req.headers['authorization'] || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token) throw new UnauthorizedException('Missing bearer token');

        try {
            const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer });
            req.user = payload;
            return true;
        } catch {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
