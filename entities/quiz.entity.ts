import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Admin } from './admin.entity';
import { Question } from './question.entity';

@Entity({ name: 'quizzes' })
export class Quiz {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() title: string;

  @Index()
  @Column({ type: 'text' }) status: 'active' | 'inactive' | 'done';

  @ManyToOne(() => Admin, (a) => a.quizzes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @OneToMany(() => Question, (q) => q.quiz) questions: Question[];
}
