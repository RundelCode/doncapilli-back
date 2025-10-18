import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from 'entities/question.entity';
import { Quiz } from 'entities/quiz.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Quiz])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class QuestionsModule {}
