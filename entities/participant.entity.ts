import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from '../entities/quiz.entity';
import { Participant } from 'src/participants/entities/participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Participant, Quiz])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class ParticipantsModule {}
