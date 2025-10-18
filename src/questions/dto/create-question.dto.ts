import { ArrayMinSize, IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateQuestionDto {
  @IsUUID()
  quizId!: string;

  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsArray()
  @ArrayMinSize(2)
  answers!: string[];

  @IsString()
  @IsNotEmpty()
  correctAnswer!: string;
}
