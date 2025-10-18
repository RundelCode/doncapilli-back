import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { AdminsModule } from './admins/admins.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { QuestionsModule } from './questions/questions.module';
import { ParticipantsModule } from './participants/participants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        ssl: { rejectUnauthorized: false },
      }),
    }),
    SupabaseModule,
    AuthModule,
    AdminsModule,
    QuizzesModule,
    QuestionsModule,
    ParticipantsModule,
  ],
})
export class AppModule { }
