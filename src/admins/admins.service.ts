import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';

@Injectable()
export class AdminsService {
  constructor(@InjectRepository(Admin) private readonly repo: Repository<Admin>) { }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async upsertFromSupabase(user: any) {
    const email = user?.email as string | undefined;
    const sub = user?.sub as string | undefined;
    if (!email) return null;

    const username =
      user?.user_metadata?.user_name ||
      user?.user_metadata?.username ||
      user?.user_metadata?.name ||
      email.split('@')[0];

    let admin = sub ? await this.repo.findOne({ where: { authUserId: sub } }) : null;

    if (!admin) {
      admin = await this.repo.findOne({ where: { email } });
    }

    if (!admin) {
      admin = this.repo.create({ email, username, authUserId: sub });
    } else {
       if (!admin.authUserId && sub) admin.authUserId = sub;
      if (!admin.username) admin.username = username;
    }

    return this.repo.save(admin);
  }
}
