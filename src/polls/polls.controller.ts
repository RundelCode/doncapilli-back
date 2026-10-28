import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { OpenRoundDto } from './dto/open-round.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('polls')
export class PollsController {
  constructor(private readonly service: PollsService) {}

  @UseGuards(SupabaseAuthGuard)
  @Post()
  create(@Body() dto: CreatePollDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get()
  list() {
    return this.service.list();
  }

  @Get('active-round')
  activeRound() {
    return this.service.getActiveRound();
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch('rounds/:roundId/close')
  closeRound(@Param('roundId', new ParseUUIDPipe()) roundId: string) {
    return this.service.closeRound(roundId);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get(':id')
  getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getOne(id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post(':id/rounds')
  openRound(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: OpenRoundDto) {
    return this.service.openRound(id, dto.candidateIds);
  }
}
