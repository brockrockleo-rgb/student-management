import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { IdsDto, StudentDto } from "../dtos";
import { RequirePermissions } from "../security";
import type { AuthRequest, UploadedExcelFile } from "./academic.types";
import { XLSX_MIME } from "./academic.types";
import { StudentExcelService } from "./student-excel.service";
import { StudentsService } from "./students.service";

@Controller("students")
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly excel: StudentExcelService,
  ) {}

  @Get("export")
  @RequirePermissions("students.view")
  async export(@Req() req: AuthRequest, @Query("classId") classId?: string) {
    const buffer = await this.excel.export(req.user, classId);
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="students.xlsx"',
    });
  }

  @Get("import-template")
  @RequirePermissions("students.create")
  async importTemplate(@Req() req: AuthRequest) {
    const buffer = await this.excel.createTemplate(req.user);
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="student-import-template.xlsx"',
    });
  }

  @Post("import")
  @RequirePermissions("students.create")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  import(@Req() req: AuthRequest, @UploadedFile() file: UploadedExcelFile) {
    return this.excel.import(req.user, file);
  }

  @Get()
  @RequirePermissions("students.view")
  list(@Req() req: AuthRequest) {
    return this.students.list(req.user);
  }

  @Post()
  @RequirePermissions("students.create")
  create(@Req() req: AuthRequest, @Body() dto: StudentDto) {
    return this.students.create(req.user, dto);
  }

  @Patch(":id")
  @RequirePermissions("students.update")
  update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() dto: StudentDto,
  ) {
    return this.students.update(req.user, id, dto);
  }

  @Delete()
  @RequirePermissions("students.delete")
  delete(@Req() req: AuthRequest, @Body() dto: IdsDto) {
    return this.students.delete(req.user, dto.ids);
  }
}
