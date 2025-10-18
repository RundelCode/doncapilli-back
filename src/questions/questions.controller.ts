import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller()
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @UseGuards(SupabaseAuthGuard)
  @Post('questions')
  create(@Body() dto: CreateQuestionDto) {
    return this.service.create(dto);
  }

  @Get('questions/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('questions/quiz/:quizId')
  findByQuiz(@Param('quizId') quizId: string) {
    return this.service.findByQuiz(quizId);
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch('questions/:id')
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(SupabaseAuthGuard)
  @Delete('questions/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
