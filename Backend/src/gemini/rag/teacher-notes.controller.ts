import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/auth/decorators/currentUser.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { RoleGuard } from 'src/auth/guards/roles-guard/roles.guard';
import { UserRole } from 'src/common/enums/enum';
import { GeminiThrottle } from '../guards/gemini-throttle.guard';
import { MAX_NOTE_BYTES, requireTeacherId } from './note.errors';
import { RagPipelineService } from './rag-pipeline.service';
import { BatchDeleteNotesDto } from './batch-delete-notes.dto';

interface TeacherIdentity {
  userId: string;
}

@Controller('teacher-notes')
@UseGuards(jwtAuthGuard, RoleGuard)
@Roles(UserRole.TEACHER)
export class TeacherNotesController {
  constructor(private readonly notes: RagPipelineService) {}

  @Get()
  list(@CurrentUser() user: TeacherIdentity) {
    return this.notes.list(requireTeacherId(user?.userId));
  }

  @Get('storage')
  storage(@CurrentUser() user: TeacherIdentity) {
    return this.notes.storageSummary(requireTeacherId(user?.userId));
  }

  @Post('batch-delete')
  @HttpCode(HttpStatus.OK)
  batchDelete(
    @CurrentUser() user: TeacherIdentity,
    @Body() dto: BatchDeleteNotesDto,
  ) {
    return this.notes.deleteDocuments(
      requireTeacherId(user?.userId),
      dto.fileIds,
    );
  }

  @Post()
  @UseGuards(GeminiThrottle)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_NOTE_BYTES, files: 1 } }),
  )
  upload(
    @CurrentUser() user: TeacherIdentity,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.notes.ingestDocument(file, requireTeacherId(user?.userId));
  }

  @Get(':fileId/download')
  download(
    @CurrentUser() user: TeacherIdentity,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.notes.download(requireTeacherId(user?.userId), fileId);
  }

  @Delete(':fileId')
  @HttpCode(204)
  delete(
    @CurrentUser() user: TeacherIdentity,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.notes.deleteDocument(requireTeacherId(user?.userId), fileId);
  }
}
