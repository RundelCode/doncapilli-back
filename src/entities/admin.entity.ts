import { Entity, PrimaryGeneratedColumn, Column, Index, OneToMany } from 'typeorm';
import { Quiz } from './quiz.entity';

@Entity({ name: 'admins' })
export class Admin {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ unique: true }) username: string;

  @Index()
  @Column({ unique: true }) email: string;

  @Column() password: string;

  @OneToMany(() => Quiz, (q) => q.admin) quizzes: Quiz[];
}
