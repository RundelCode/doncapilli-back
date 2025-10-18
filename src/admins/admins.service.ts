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

  async upsertProfile(email: string, username?: string) {
    let admin = await this.findByEmail(email);
    if (!admin) {
      admin = this.repo.create({ email, username: username ?? email.split('@')[0] });
    } else if (!admin.username && username) {
      admin.username = username;
    }
    return this.repo.save(admin);
  }
}
