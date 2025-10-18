import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
                type: 'postgres',
                url: cfg.get<string>('DATABASE_URL'),
                synchronize: false,
                autoLoadEntities: true,
                ssl: { rejectUnauthorized: false },
            }),
        }),
    ],
})
export class DatabaseModule { }
