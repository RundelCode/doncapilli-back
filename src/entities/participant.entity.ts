import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Quiz } from './quiz.entity';

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  username: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @ManyToOne(() => Quiz, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @Column({ name: 'last_scored_question_id', type: 'uuid', nullable: true })
  lastScoredQuestionId: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
