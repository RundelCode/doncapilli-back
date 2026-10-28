import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { Poll } from '../entities/poll.entity';
import { PollCandidate } from '../entities/poll-candidate.entity';
import { PollRound } from '../entities/poll-round.entity';
import { PollRoundCandidate } from '../entities/poll-round-candidate.entity';
import { CreatePollDto } from './dto/create-poll.dto';

export type VoteResult =
  | { accepted: true; candidateName: string; position: number; roundId: string }
  | { accepted: false; reason: 'NO_ACTIVE_ROUND' | 'INVALID_OPTION' | 'ALREADY_VOTED' };

export type RoundOption = {
  position: number;
  candidateId: string;
  name: string;
  votes: number;
};

export type RoundView = {
  id: string;
  pollId: string;
  number: number;
  status: 'open' | 'closed';
  openedAt: Date;
  closedAt: Date | null;
  options: RoundOption[];
  totalVotes: number;
};

type VoteInput = { voterKey: string; username: string; position: number };

@Injectable()
export class PollsService {
  private readonly log = new Logger(PollsService.name);

  constructor(
    @InjectRepository(Poll) private readonly pollRepo: Repository<Poll>,
    @InjectRepository(PollCandidate) private readonly candRepo: Repository<PollCandidate>,
    @InjectRepository(PollRound) private readonly roundRepo: Repository<PollRound>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
    private readonly db: DataSource,
  ) {}


  async create(dto: CreatePollDto, authUser: { sub?: string; email?: string }) {
    const admin = await this.resolveAdmin(authUser);

    const names = dto.participants.map((n) => n.trim()).filter(Boolean);
    const unique = new Set(names.map((n) => n.toLowerCase()));
    if (names.length < 2) throw new BadRequestException('Se necesitan al menos 2 participantes');
    if (unique.size !== names.length) throw new BadRequestException('Hay participantes con nombre repetido');

    return this.db.transaction(async (em) => {
      const poll = await em.getRepository(Poll).save(
        em.getRepository(Poll).create({ title: dto.title.trim(), admin }),
      );
      const candidates = await em
        .getRepository(PollCandidate)
        .save(names.map((name) => em.getRepository(PollCandidate).create({ name, pollId: poll.id })));

      return { id: poll.id, title: poll.title, createdAt: poll.createdAt, candidates: candidates.map(this.candView) };
    });
  }

  async list() {
    const rows: any[] = await this.db.query(`
      SELECT p.id, p.title, p.created_at AS "createdAt",
        (SELECT count(*)::int FROM poll_candidates c WHERE c.poll_id = p.id) AS "candidateCount",
        (SELECT count(*)::int FROM poll_rounds r WHERE r.poll_id = p.id) AS "roundCount",
        EXISTS (SELECT 1 FROM poll_rounds r WHERE r.poll_id = p.id AND r.status = 'open') AS "hasOpenRound"
      FROM polls p
      ORDER BY p.created_at DESC
    `);
    return { polls: rows };
  }

  async getOne(pollId: string) {
    const poll = await this.pollRepo.findOne({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Votación no encontrada');

    const candidates = await this.candRepo.find({ where: { pollId }, order: { createdAt: 'ASC', name: 'ASC' } });
    const rounds = await this.roundRepo.find({ where: { pollId }, order: { openedAt: 'ASC', id: 'ASC' } });
    const roundViews = await Promise.all(rounds.map((r, i) => this.buildRoundView(r, i + 1)));

    const totalsRows: { candidate_id: string; votes: number }[] = await this.db.query(
      `SELECT v.candidate_id, count(*)::int AS votes
         FROM poll_votes v JOIN poll_rounds r ON r.id = v.round_id
        WHERE r.poll_id = $1
        GROUP BY v.candidate_id`,
      [pollId],
    );
    const totalMap = new Map(totalsRows.map((t) => [t.candidate_id, t.votes]));

    return {
      id: poll.id,
      title: poll.title,
      createdAt: poll.createdAt,
      candidates: candidates.map(this.candView),
      rounds: roundViews.reverse(), // la más reciente primero
      totals: candidates
        .map((c) => ({ candidateId: c.id, name: c.name, votes: totalMap.get(c.id) ?? 0 }))
        .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name)),
    };
  }

  async remove(pollId: string) {
    const res = await this.pollRepo.delete({ id: pollId });
    if (!res.affected) throw new NotFoundException('Votación no encontrada');
    return { ok: true };
  }

  async openRound(pollId: string, candidateIds: string[]) {
    const poll = await this.pollRepo.findOne({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Votación no encontrada');

    const valid = await this.candRepo
      .createQueryBuilder('c')
      .where('c.poll_id = :pollId', { pollId })
      .andWhere('c.id IN (:...ids)', { ids: candidateIds })
      .getCount();
    if (valid !== candidateIds.length) {
      throw new BadRequestException('Algún participante no pertenece a esta votación');
    }

    const roundId = await this.db.transaction(async (em) => {
      await em
        .getRepository(PollRound)
        .createQueryBuilder()
        .update(PollRound)
        .set({ status: 'closed', closedAt: () => 'now()' })
        .where("status = 'open'")
        .execute();

      const round = await em.getRepository(PollRound).save(em.getRepository(PollRound).create({ pollId, status: 'open' }));

      await em.getRepository(PollRoundCandidate).insert(
        candidateIds.map((candidateId, i) => ({ roundId: round.id, candidateId, position: i + 1 })),
      );
      return round.id;
    });

    return this.getRound(roundId);
  }

  async closeRound(roundId: string) {
    const res = await this.roundRepo
      .createQueryBuilder()
      .update(PollRound)
      .set({ status: 'closed', closedAt: () => 'now()' })
      .where('id = :roundId', { roundId })
      .andWhere("status = 'open'")
      .execute();

    if (!res.affected) {
      const exists = await this.roundRepo.exist({ where: { id: roundId } });
      if (!exists) throw new NotFoundException('Ronda no encontrada');
    }
    return this.getRound(roundId);
  }

  async getRound(roundId: string): Promise<RoundView> {
    const round = await this.roundRepo.findOne({ where: { id: roundId } });
    if (!round) throw new NotFoundException('Ronda no encontrada');
    const number = await this.roundNumber(round);
    return this.buildRoundView(round, number);
  }

  async getActiveRound() {
    const round = await this.roundRepo.findOne({ where: { status: 'open' } });
    if (!round) return { poll: null, round: null };

    const poll = await this.pollRepo.findOne({ where: { id: round.pollId } });
    const view = await this.buildRoundView(round, await this.roundNumber(round));
    return { poll: poll ? { id: poll.id, title: poll.title } : null, round: view };
  }

  async castVote({ voterKey, username, position }: VoteInput): Promise<VoteResult> {
    const rows: { round_id: string; candidate_id: string; name: string }[] = await this.db.query(
      `
      WITH ins AS (
        INSERT INTO poll_votes (round_id, candidate_id, voter_key, voter_username)
        SELECT rc.round_id, rc.candidate_id, $2, $3
          FROM poll_round_candidates rc
          JOIN poll_rounds r ON r.id = rc.round_id AND r.status = 'open'
         WHERE rc.position = $1
        ON CONFLICT (round_id, voter_key) DO NOTHING
        RETURNING round_id, candidate_id
      )
      SELECT ins.round_id, ins.candidate_id, c.name
        FROM ins JOIN poll_candidates c ON c.id = ins.candidate_id
      `,
      [position, voterKey, username],
    );

    if (rows.length > 0) {
      return { accepted: true, candidateName: rows[0].name, position, roundId: rows[0].round_id };
    }

    const open = await this.roundRepo.findOne({ where: { status: 'open' } });
    if (!open) return { accepted: false, reason: 'NO_ACTIVE_ROUND' };

    const option = await this.db.getRepository(PollRoundCandidate).findOne({ where: { roundId: open.id, position } });
    if (!option) return { accepted: false, reason: 'INVALID_OPTION' };

    return { accepted: false, reason: 'ALREADY_VOTED' };
  }

  private async resolveAdmin(user: { sub?: string; email?: string }) {
    const admin =
      (user?.sub ? await this.adminRepo.findOne({ where: { authUserId: user.sub } }) : null) ??
      (user?.email ? await this.adminRepo.findOne({ where: { email: user.email } }) : null);
    if (!admin) throw new NotFoundException('Admin no encontrado para este token');
    return admin;
  }

  private async roundNumber(round: PollRound) {
    const rows: { n: number }[] = await this.db.query(
      `SELECT count(*)::int AS n
         FROM poll_rounds r2
         JOIN poll_rounds r ON r.id = $1
        WHERE r2.poll_id = r.poll_id AND (r2.opened_at, r2.id) <= (r.opened_at, r.id)`,
      [round.id],
    );
    return Math.max(1, rows[0]?.n ?? 1);
  }

  private async buildRoundView(round: PollRound, number: number): Promise<RoundView> {
    const options: RoundOption[] = await this.db.query(
      `
      SELECT rc.position,
             c.id   AS "candidateId",
             c.name AS name,
             count(v.id)::int AS votes
        FROM poll_round_candidates rc
        JOIN poll_candidates c ON c.id = rc.candidate_id
        LEFT JOIN poll_votes v ON v.round_id = rc.round_id AND v.candidate_id = rc.candidate_id
       WHERE rc.round_id = $1
       GROUP BY rc.position, c.id, c.name
       ORDER BY rc.position
      `,
      [round.id],
    );

    return {
      id: round.id,
      pollId: round.pollId,
      number,
      status: round.status,
      openedAt: round.openedAt,
      closedAt: round.closedAt,
      options,
      totalVotes: options.reduce((sum, o) => sum + o.votes, 0),
    };
  }

  private candView = (c: PollCandidate) => ({ id: c.id, name: c.name });
}
