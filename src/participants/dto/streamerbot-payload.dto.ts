import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class StreamerbotPayloadDto {
  @IsString()
  event!: string;

  @IsString()
  username!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  message?: string;
}
