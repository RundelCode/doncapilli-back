import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'poll_votes' })
export class PollVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'round_id', type: 'uuid' })
  roundId: string;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId: string;

  @Column({ name: 'voter_key' })
  voterKey: string;

  @Column({ name: 'voter_username' })
  voterUsername: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
