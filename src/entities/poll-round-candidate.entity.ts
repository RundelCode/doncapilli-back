import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'poll_round_candidates' })
export class PollRoundCandidate {
  @PrimaryColumn({ name: 'round_id', type: 'uuid' })
  roundId: string;

  @PrimaryColumn({ name: 'candidate_id', type: 'uuid' })
  candidateId: string;

  @Column({ type: 'int' })
  position: number;
}
