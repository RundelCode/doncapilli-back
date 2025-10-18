import { Body, Controller, Inject, Post, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { AdminsService } from '../admins/admins.service';

class LoginDto {
    email!: string;
    password!: string;
}

@Controller('auth')
export class AuthController {
    constructor(
        @Inject('SUPABASE') private readonly sb: SupabaseClient,
        private readonly admins: AdminsService,
    ) { }

    /**
     * POST /auth/login
     * Body: { email, password }
     * Return: { username, email } (+ opcional access_token)
     */
    @Post('login')
    async login(@Body() dto: LoginDto) {
        const { data, error } = await this.sb.auth.signInWithPassword({
            email: dto.email,
            password: dto.password,
        });

        if (error || !data.user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Datos del usuario de Supabase
        const email = data.user.email!;
        const username =
            (data.user.user_metadata && (data.user.user_metadata.user_name || data.user.user_metadata.username)) ||
            data.user.user_metadata?.name ||
            email.split('@')[0];

        // Upsert del perfil en tu tabla admins (sin contraseña)
        const admin = await this.admins.upsertProfile(email, username);

        // Si quieres enviar el token para que el frontend lo use en siguientes requests:
        // const access_token = data.session?.access_token;

        return {
            username: admin.username,
            email: admin.email,
            // access_token, // <- descomenta si lo necesitas
        };
    }
}
