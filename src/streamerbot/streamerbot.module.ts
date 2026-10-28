import { Module } from '@nestjs/common';
import { StreamerbotService } from './streamerbot.service';
import { StreamerbotController } from './streamerbot.controller';
import { ParticipantsModule } from '../participants/participants.module';
import { PollsModule } from '../polls/polls.module';

@Module({
  imports: [
    ParticipantsModule,
    PollsModule,
  ],
  providers: [StreamerbotService],
  controllers: [StreamerbotController],
  exports: [StreamerbotService],
})
export class StreamerbotModule {}
