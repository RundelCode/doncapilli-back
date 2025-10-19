import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';
import { Question } from 'src/entities/question.entity';
import { Quiz } from 'src/entities/quiz.entity';
import { Participant } from 'src/entities/participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participant, Quiz, Question]),
  ],
  providers: [ParticipantsService],
  controllers: [ParticipantsController],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
