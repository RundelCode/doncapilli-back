import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Participant } from '../entities/participant.entity';
import { Quiz } from '../entities/quiz.entity';
import { Question } from '../entities/question.entity';

type SubmitPayload = { username: string; rawAnswer: string };

@Injectable()
export class ParticipantsService {
  private readonly log = new Logger(ParticipantsService.name);

  constructor(
    @InjectRepository(Participant) private readonly pRepo: Repository<Participant>,
    @InjectRepository(Quiz) private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(Question) private readonly qRepo: Repository<Question>,
    private readonly db: DataSource,
  ) { }

  private BASE_POINTS = 10;
  private BONUS_FIRST_10 = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  async submitAnswer({ username, rawAnswer }: SubmitPayload) {
    const quiz = await this.quizRepo.findOne({ where: { status: 'active' } });
    if (!quiz) return { accepted: false, reason: 'NO_ACTIVE_QUIZ' };

    const question = await this.qRepo.findOne({
      where: { quiz: { id: quiz.id }, status: 'active' as any },
    });
    if (!question) return { accepted: false, reason: 'NO_ACTIVE_QUESTION' };

    const answer = this.normalizeAnswer(rawAnswer);
    const correct = this.isCorrectAnswer(question, answer);

    let participant = await this.pRepo.findOne({ where: { quiz: { id: quiz.id }, username } });
    if (!participant) {
      participant = this.pRepo.create({ username, quiz, score: 0, lastScoredQuestionId: null });
      participant = await this.pRepo.save(participant);
    }

    if (!correct) {
      return { accepted: true, correct: false, awardedPoints: 0, totalScore: participant.score };
    }

    return this.db.transaction(async (em) => {
      const pRepo = em.getRepository(Participant);
      const qRepo = em.getRepository(Question);

      await em.query(
        `SELECT pg_advisory_xact_lock( ('x'||substr(md5($1),1,16))::bit(64)::bigint )`,
        [question.id],
      );

      const updRes = await pRepo
        .createQueryBuilder()
        .update(Participant)
        .set({ lastScoredQuestionId: question.id })
        .where('id = :pid', { pid: participant.id })
        .andWhere('(last_scored_question_id IS DISTINCT FROM :qid)', { qid: question.id })
        .returning(['id'])
        .execute();

      if (updRes.affected === 0) {
        const fresh = await pRepo.findOne({ where: { id: participant.id } });
        return {
          accepted: false,
          reason: 'ALREADY_SCORED_THIS_QUESTION',
          correct: true,
          awardedPoints: 0,
          totalScore: fresh!.score,
        };
      }

      const qRow = await qRepo
        .createQueryBuilder('q')
        .setLock('pessimistic_write')
        .where('q.id = :qid', { qid: question.id })
        .getOne();

      const currentCount = qRow?.correctCount ?? 0;
      const position = currentCount + 1;
      const bonus = position <= this.BONUS_FIRST_10.length ? this.BONUS_FIRST_10[position - 1] : 0;
      const awardedPoints = this.BASE_POINTS + bonus;

      await qRepo
        .createQueryBuilder()
        .update(Question)
        .set({ correctCount: () => 'correct_count + 1' })
        .where('id = :qid', { qid: question.id })
        .execute();

      await pRepo
        .createQueryBuilder()
        .update(Participant)
        .set({ score: () => `score + ${awardedPoints}` })
        .where('id = :pid', { pid: participant.id })
        .execute();

      const updated = await pRepo.findOne({ where: { id: participant.id } });

      return {
        accepted: true,
        correct: true,
        position,
        awardedPoints,
        totalScore: updated!.score,
      };
    });
  }

  async leaderboard(limit = 50) {
    const quiz = await this.quizRepo.findOne({ where: { status: 'active' } });
    if (!quiz) return [];
    return this.pRepo.find({
      where: { quiz: { id: quiz.id } },
      order: { score: 'DESC', username: 'ASC' },
      take: Math.max(1, Math.min(limit, 500)),
    });
  }

  async allByQuiz(quizId: string) {
    const quiz = await this.quizRepo.findOne({ where: { id: quizId } });
    if (!quiz) {
      return [];
    }

    return this.pRepo.find({
      where: { quiz: { id: quizId } },
      order: { username: 'ASC' },
    });
  }

  private normalizeAnswer(s: string) {
    const t = (s ?? '').trim().toLowerCase();
    if (['a', 'b', 'c', 'd', 'e'].includes(t)) return t;
    if (['1', '2', '3', '4', '5'].includes(t)) return ({ '1': 'a', '2': 'b', '3': 'c', '4': 'd', '5': 'e' } as any)[t];
    return t;
  }

  private isCorrectAnswer(q: Question, a: string) {
    const correct = (q.correctAnswer ?? '').trim().toLowerCase();
    if (!correct) return false;
    if (a === correct) return true;

    const answers: string[] = Array.isArray(q.answers) ? q.answers : [];
    const idxMap: any = { a: 0, b: 1, c: 2, d: 3, e: 4 };
    if (idxMap[correct] != null && answers[idxMap[correct]]) {
      if ((answers[idxMap[correct]] || '').trim().toLowerCase() === a) return true;
    }
    return false;
  }
}
