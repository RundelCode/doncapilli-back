import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'SUPABASE',
            inject: [ConfigService],
            useFactory: (cfg: ConfigService): SupabaseClient => {
                const url = cfg.get<string>('SUPABASE_URL')!;
                const key = cfg.get<string>('SUPABASE_ANON_KEY')!;
                return createClient(url, key, { auth: { persistSession: false } });
            },
        },
    ],
    exports: ['SUPABASE'],
})
export class SupabaseModule { }
