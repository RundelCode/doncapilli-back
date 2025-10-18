import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Quiz } from './quiz.entity';

@Entity({ name: 'questions' })
export class Question {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'text' }) question: string;

  @Column('text', { array: true }) answers: string[];       // text[]

  @Column({ name: 'correct_answer', type: 'text' }) correctAnswer: string;

  @ManyToOne(() => Quiz, (q) => q.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  @Index()
  quiz: Quiz;
}
