import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Poll } from './poll.entity';

@Entity({ name: 'poll_rounds' })
export class PollRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Poll, (p) => p.rounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poll_id' })
  poll: Poll;

  @Column({ name: 'poll_id', type: 'uuid' })
  pollId: string;

  @Column({ type: 'text', default: 'open' })
  status: 'open' | 'closed';

  @Column({ name: 'opened_at', type: 'timestamptz', default: () => 'now()' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;
}
