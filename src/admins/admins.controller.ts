import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdminsService } from './admins.service';

@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: any) {
    const admin = await this.adminsService.upsertFromSupabase(user);
    return {
      id: admin?.id,
      email: admin?.email,
      username: admin?.username,
      authUserId: admin?.authUserId ?? null,
    };
  }
}
