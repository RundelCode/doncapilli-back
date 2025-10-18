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

  @Get('questions/quiz/:quizId/active')
  async getActiveByQuiz(@Param('quizId') quizId: string) {
    const list = await this.service.findByQuiz(quizId);
    return list.find(q => q.status === 'active') ?? null;
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

  @UseGuards(SupabaseAuthGuard)
  @Patch('quizzes/:quizId/questions/:questionId/status')
  setStatus(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body() body: { status: 'active' | 'inactive' },
  ) {
    return this.service.setStatus({ quizId, questionId, status: body.status });
  }
}
