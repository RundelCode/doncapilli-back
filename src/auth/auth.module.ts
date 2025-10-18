import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminsModule } from '../admins/admins.module';

@Module({
  imports: [SupabaseModule, AdminsModule],
  controllers: [AuthController],
})
export class AuthModule {}
