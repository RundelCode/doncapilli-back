import { Body, Controller, Inject, Post, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { AdminsService } from '../admins/admins.service';
import { AdminLoginDto } from 'src/admins/dto/admin-login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('SUPABASE') private readonly sb: SupabaseClient,
    private readonly admins: AdminsService,
  ) {}

  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    const { data, error } = await this.sb.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });
    if (error || !data.user) throw new UnauthorizedException('Credenciales inválidas');

    const email = data.user.email!;
    const username =
      data.user.user_metadata?.user_name ||
      data.user.user_metadata?.username ||
      data.user.user_metadata?.name ||
      email.split('@')[0];

    const admin = await this.admins.upsertFromSupabase(data.user);

    return {
      username: admin?.username,
      email: admin?.email,
      session: data.session,
    };
  }
}
