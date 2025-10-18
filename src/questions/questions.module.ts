import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from '../entities/question.entity';
import { Quiz } from '../entities/quiz.entity';
// import { QuestionsService } from './questions.service';
// import { QuestionsController } from './questions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Quiz])],
  controllers: [], // [QuestionsController]
  providers: [],   // [QuestionsService]
  exports: [TypeOrmModule],
})
export class QuestionsModule {}
