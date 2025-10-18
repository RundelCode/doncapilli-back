import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { Quiz } from '../entities/quiz.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question) private readonly qRepo: Repository<Question>,
    @InjectRepository(Quiz) private readonly quizRepo: Repository<Quiz>,
  ) {}

  async create(dto: CreateQuestionDto) {
    const quiz = await this.quizRepo.findOne({ where: { id: dto.quizId } });
    if (!quiz) throw new NotFoundException('Quiz no encontrado');

    const question = this.qRepo.create({
      question: dto.question,
      answers: dto.answers,
      correctAnswer: dto.correctAnswer,
      quiz,
    });
    return this.qRepo.save(question);
  }

  async findOne(id: string) {
    const q = await this.qRepo.findOne({ where: { id }, relations: ['quiz'] });
    if (!q) throw new NotFoundException('Pregunta no encontrada');
    return q;
  }

  // Listar preguntas por quiz
  findByQuiz(quizId: string) {
    return this.qRepo.find({ where: { quiz: { id: quizId } }, order: { id: 'ASC' } });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const q = await this.findOne(id);
    Object.assign(q, dto);
    return this.qRepo.save(q);
  }

  async remove(id: string) {
    const q = await this.findOne(id);
    await this.qRepo.remove(q);
    return { ok: true };
  }
}
