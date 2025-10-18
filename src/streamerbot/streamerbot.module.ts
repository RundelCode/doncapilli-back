import { Module, Global } from '@nestjs/common';
import { StreamerbotService } from './streamerbot.service';
import { StreamerbotController } from './streamerbot.controller';

@Global()
@Module({
  controllers: [StreamerbotController],
  providers: [StreamerbotService],
  exports: [StreamerbotService],
})
export class StreamerbotModule {}
