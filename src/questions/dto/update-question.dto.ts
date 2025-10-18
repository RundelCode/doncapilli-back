import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  question?: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsOptional()
  answers?: string[];

  @IsString()
  @IsOptional()
  correctAnswer?: string;
}
