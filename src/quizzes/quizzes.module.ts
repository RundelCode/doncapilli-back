import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from '../entities/quiz.entity';
import { Admin } from '../entities/admin.entity';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, Admin])],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [TypeOrmModule, QuizzesService],
})
export class QuizzesModule {}
