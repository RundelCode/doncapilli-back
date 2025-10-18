import { Controller, Get } from '@nestjs/common';
import { StreamerbotService } from './streamerbot.service';

@Controller('streamerbot')
export class StreamerbotController {
  constructor(private readonly sb: StreamerbotService) {}

  @Get('health')
  health() {
    return this.sb.getHealth();
  }
}
