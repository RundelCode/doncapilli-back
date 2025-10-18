import { IsEnum, IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateQuizDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsEnum(['active', 'inactive', 'done'] as any)
    @IsOptional()
    status?: 'active' | 'inactive' | 'done' = 'inactive';

    @IsUUID()
    adminId!: string;
}
