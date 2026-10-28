import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';
import { Admin } from '../entities/admin.entity';
import { Poll } from '../entities/poll.entity';
import { PollCandidate } from '../entities/poll-candidate.entity';
import { PollRound } from '../entities/poll-round.entity';
import { PollRoundCandidate } from '../entities/poll-round-candidate.entity';
import { PollVote } from '../entities/poll-vote.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Poll, PollCandidate, PollRound, PollRoundCandidate, PollVote])],
  controllers: [PollsController],
  providers: [PollsService],
  exports: [PollsService],
})
export class PollsModule {}
