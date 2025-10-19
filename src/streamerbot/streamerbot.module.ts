import { Module } from '@nestjs/common';
import { StreamerbotService } from './streamerbot.service';
import { StreamerbotController } from './streamerbot.controller';
import { ParticipantsModule } from '../participants/participants.module';

@Module({
  imports: [
    ParticipantsModule,
  ],
  providers: [StreamerbotService],
  controllers: [StreamerbotController],
  exports: [StreamerbotService],
})
export class StreamerbotModule {}
