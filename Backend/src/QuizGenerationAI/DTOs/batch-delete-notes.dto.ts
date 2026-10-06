import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';

export class BatchDeleteNotesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  fileIds: string[];
}
