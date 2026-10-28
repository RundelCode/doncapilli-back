import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Admin } from './admin.entity';
import { PollCandidate } from './poll-candidate.entity';
import { PollRound } from './poll-round.entity';

@Entity({ name: 'polls' })
export class Poll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @ManyToOne(() => Admin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @OneToMany(() => PollCandidate, (c) => c.poll)
  candidates: PollCandidate[];

  @OneToMany(() => PollRound, (r) => r.poll)
  rounds: PollRound[];

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
