import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller()
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  // Crear pregunta (solo autenticado)
  @UseGuards(SupabaseAuthGuard)
  @Post('questions')
  create(@Body() dto: CreateQuestionDto) {
    return this.service.create(dto);
  }

  // Obtener una pregunta
  @Get('questions/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Listar por quiz
  @Get('questions/quiz/:quizId')
  findByQuiz(@Param('quizId') quizId: string) {
    return this.service.findByQuiz(quizId);
  }

  // Actualizar (solo autenticado)
  @UseGuards(SupabaseAuthGuard)
  @Patch('questions/:id')
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.service.update(id, dto);
  }

  // Eliminar (solo autenticado)
  @UseGuards(SupabaseAuthGuard)
  @Delete('questions/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
