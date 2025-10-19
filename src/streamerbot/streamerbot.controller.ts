import { Controller, Get, Query, Sse, MessageEvent, Post, Body } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { StreamerbotService } from './streamerbot.service';

@Controller('streamerbot')
export class StreamerbotController {
  constructor(private readonly sb: StreamerbotService) {}

  @Get('health')
  health() { return this.sb.getHealth(); }

  @Get('last')
  last() { return this.sb.getLastChat() ?? { message: 'No hay mensajes aún.' }; }

  @Get('events')
  events(@Query('limit') limit?: string) {
    const n = Number(limit ?? 20);
    return this.sb.getRecent(isNaN(n) ? 20 : n);
  }

  @Get('stats')
  stats() { return this.sb.getStats(); }

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.sb.events$.pipe(map((data) => ({ data } as MessageEvent)));
  }

  @Post('simulate')
  simulate(@Body() body: any) {
    const msg = this.sb.simulateIncoming(body?.text ?? '!ping', body?.user ?? 'Tester');
    return { ok: true, pushed: msg };
  }
}
