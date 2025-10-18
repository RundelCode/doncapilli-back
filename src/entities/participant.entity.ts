import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Quiz } from './quiz.entity';

@Entity({ name: 'participants' })
export class Participant {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Index()
  @Column() username: string;

  @Column({ type: 'int', default: 0 }) score: number;

  @ManyToOne(() => Quiz, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  @Index()
  quiz: Quiz;
}
