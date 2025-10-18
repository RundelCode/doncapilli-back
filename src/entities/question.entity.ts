import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, RelationId } from 'typeorm';
import { Quiz } from './quiz.entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  question: string;

  @Column('text', { array: true })
  answers: string[];

  @Column({ name: 'correct_answer' })
  correctAnswer: string;

  @Column({ type: 'text', default: 'inactive' })
  status: 'active' | 'inactive';

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @RelationId((q: Question) => q.quiz)
  quizId: string;
}
