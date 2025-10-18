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

  // Crear pregunta
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

  // Una pregunta por id
  async findOne(id: string) {
    const q = await this.qRepo.findOne({ where: { id }, relations: ['quiz'] });
    if (!q) throw new NotFoundException('Pregunta no encontrada');
    return q;
  }

  // Listar preguntas por quiz (activa primero)
  findByQuiz(quizId: string) {
    return this.qRepo.find({
      where: { quiz: { id: quizId } },
      order: { status: 'DESC', id: 'ASC' }, // active > inactive
    });
  }

  // Obtener la pregunta activa de un quiz (o null)
  async findActiveByQuiz(quizId: string) {
    return this.qRepo.findOne({
      where: { quiz: { id: quizId }, status: 'active' as Status },
    });
  }

  // Actualizar una pregunta
  async update(id: string, dto: UpdateQuestionDto) {
    const q = await this.findOne(id);
    Object.assign(q, dto);
    await this.qRepo.save(q);
    return this.findOne(id);
  }

  // Eliminar una pregunta
  async remove(id: string) {
    const q = await this.findOne(id);
    await this.qRepo.remove(q);
    return { ok: true };
  }

  // ✅ Cambiar estado garantizando solo 1 activa por quiz (con transacción)
  async setStatus(input: { quizId: string; questionId: string; status: Status }) {
    const { quizId, questionId, status } = input;

    return this.qRepo.manager.transaction(async (em) => {
      const qRepo = em.getRepository(Question);

      // Verifica pertenencia
      const question = await qRepo.findOne({
        where: { id: questionId, quiz: { id: quizId } },
        relations: ['quiz'],
      });
      if (!question) throw new NotFoundException('Question not found in this quiz');

      if (status === 'active') {
        // Desactivar todas las demás activas del mismo quiz
        await qRepo
          .createQueryBuilder()
          .update(Question)
          .set({ status: 'inactive' })
          .where('quiz_id = :quizId', { quizId })
          .andWhere('id <> :questionId', { questionId })
          .andWhere('status = :active', { active: 'active' })
          .execute();

        // Activar la seleccionada
        await qRepo
          .createQueryBuilder()
          .update(Question)
          .set({ status: 'active' })
          .where('id = :questionId', { questionId })
          .execute();
      } else {
        // Solo desactivar esta
        await qRepo
          .createQueryBuilder()
          .update(Question)
          .set({ status: 'inactive' })
          .where('id = :questionId', { questionId })
          .execute();
      }

      // Devuelve el estado final desde BD
      return qRepo.findOne({
        where: { id: questionId },
        relations: ['quiz'],
      }); 
    });
  }
}
