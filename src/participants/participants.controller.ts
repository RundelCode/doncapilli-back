import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ParticipantsService } from './participants.service';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly service: ParticipantsService) {}

  @Post('submit')
  submit(@Body() body: { username: string; answer: string }) {
    return this.service.submitAnswer({ username: body.username, rawAnswer: body.answer });
  }

  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    return this.service.leaderboard(Number(limit) || 50);
  }
}
