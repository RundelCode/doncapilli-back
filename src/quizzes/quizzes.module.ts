import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'entities/admin.entity';
import { Question } from 'entities/question.entity';
import { Quiz } from 'entities/quiz.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, Admin, Question])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class QuizzesModule {}
