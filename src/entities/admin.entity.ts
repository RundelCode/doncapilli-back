// src/entities/admin.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, OneToMany } from 'typeorm';
import { Quiz } from './quiz.entity';

@Entity({ name: 'admins' })
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Index()
  @Column({ unique: true })
  email: string;

  @Index({ unique: true })
  @Column({ name: 'auth_user_id', type: 'uuid', nullable: true })
  authUserId?: string;

  @OneToMany(() => Quiz, (quiz) => quiz.admin)
  quizzes: Quiz[];
}
