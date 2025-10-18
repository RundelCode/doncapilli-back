import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from '../entities/participant.entity';
import { Quiz } from '../entities/quiz.entity';
// import { ParticipantsService } from './participants.service';
// import { ParticipantsController } from './participants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Participant, Quiz])],
  controllers: [], // [ParticipantsController]
  providers: [],   // [ParticipantsService]
  exports: [TypeOrmModule],
})
export class ParticipantsModule { }
