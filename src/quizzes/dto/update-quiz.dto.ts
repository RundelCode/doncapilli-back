import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateQuizDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(['active', 'inactive', 'done'] as any)
  @IsOptional()
  status?: 'active' | 'inactive' | 'done';
}
