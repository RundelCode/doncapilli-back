import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { Quiz } from '../entities/quiz.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

type Status = 'active' | 'inactive';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question) private readonly qRepo: Repository<Question>,
    @InjectRepository(Quiz) private readonly quizRepo: Repository<Quiz>,
  ) { }

  async create(dto: CreateQuestionDto) {
    const quiz = await this.quizRepo.findOne({ where: { id: dto.quizId } });
    if (!quiz) throw new NotFoundException('Quiz no encontrado');

    const question = this.qRepo.create({
      question: dto.question,
      answers: dto.answers,
      correctAnswer: dto.correctAnswer,
      quiz,
      status: 'inactive',
    });
    return this.qRepo.save(question);
  }

  async findOne(id: string) {
    const q = await this.qRepo.findOne({ where: { id }, relations: ['quiz'] });
    if (!q) throw new NotFoundException('Pregunta no encontrada');
    return q;
  }

  findByQuiz(quizId: string) {
    return this.qRepo.find({
      where: { quiz: { id: quizId } },
      order: { status: 'DESC', id: 'ASC' },
    });
  }

  async findActiveByQuiz(quizId: string) {
    return this.qRepo.findOne({
      where: { quiz: { id: quizId }, status: 'active' as Status },
    });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const q = await this.findOne(id);
    Object.assign(q, dto);
    await this.qRepo.save(q);
    return this.findOne(id);
  }

  async remove(id: string) {
    const q = await this.findOne(id);
    await this.qRepo.remove(q);
    return { ok: true };
  }

  async setStatus(input: { quizId: string; questionId: string; status: Status }) {
    const { quizId, questionId, status } = input;

    return this.qRepo.manager.transaction(async (em) => {
      const qRepo = em.getRepository(Question);

      const question = await qRepo.findOne({
        where: { id: questionId, quiz: { id: quizId } },
        relations: ['quiz'],
      });
      if (!question) throw new NotFoundException('Question not found in this quiz');

      if (status === 'active') {
        await qRepo
          .createQueryBuilder()
          .update(Question)
          .set({ status: 'inactive' })
          .where('quiz_id = :quizId', { quizId })
          .andWhere('id <> :questionId', { questionId })
          .andWhere('status = :active', { active: 'active' })
          .execute();

        await qRepo
          .createQueryBuilder()
          .update(Question)
          .set({ status: 'active' })
          .where('id = :questionId', { questionId })
          .execute();
      } else {
        await qRepo
          .createQueryBuilder()
          .update(Question)
          .set({ status: 'inactive' })
          .where('id = :questionId', { questionId })
          .execute();
      }

      return qRepo.findOne({
        where: { id: questionId },
        relations: ['quiz'],
      }); 
    });
  }
}
