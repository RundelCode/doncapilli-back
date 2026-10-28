import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from '../entities/quiz.entity';
import { Admin } from '../entities/admin.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz) private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
  ) { }

  async create(dto: CreateQuizDto) {
    const admin = await this.adminRepo.findOne({ where: { id: dto.adminId } });
    if (!admin) throw new NotFoundException('Admin no encontrado');

    const quiz = this.quizRepo.create({
      title: dto.title,
      status: (dto.status ?? 'inactive') as any,
      admin,
    });
    return this.quizRepo.save(quiz);
  }

  findAll() {
    return this.quizRepo.find({ relations: ['admin'] });
  }

  async findOne(id: string) {
    const quiz = await this.quizRepo.findOne({ where: { id }, relations: ['admin'] });
    if (!quiz) throw new NotFoundException('Quiz no encontrado');
    return quiz;
  }

  async update(id: string, dto: UpdateQuizDto) {
    const quiz = await this.findOne(id);
    Object.assign(quiz, dto);
    return this.quizRepo.save(quiz);
  }

  async remove(id: string) {
    const quiz = await this.findOne(id);
    await this.quizRepo.remove(quiz);
    return { ok: true };
  }

  async findActive() {
    const quiz = await this.quizRepo.findOne({
      where: { status: 'active' },
      relations: ['admin'],
    });
    return { trivia: quiz ?? null };
  }

  async createForAuthUser(dto: CreateQuizDto, authUserId: string) {
    const admin = await this.adminRepo.findOne({ where: { authUserId } });
    if (!admin) throw new NotFoundException('Admin no encontrado para este token');

    const quiz = this.quizRepo.create({
      title: dto.title,
      status: (dto.status ?? 'inactive') as any,
      admin,
    });
    return this.quizRepo.save(quiz);
  }
} 
