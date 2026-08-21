import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { IdsDto, TeacherDto } from "../dtos";
import { RequirePermissions } from "../security";
import type { UploadedExcelFile } from "./academic.types";
import { XLSX_MIME } from "./academic.types";
import { TeacherExcelService } from "./teacher-excel.service";
import { TeachersService } from "./teachers.service";

@Controller("teachers")
export class TeachersController {
  constructor(
    private readonly teachers: TeachersService,
    private readonly excel: TeacherExcelService
  ) {}

  @Get("export")
  @RequirePermissions("teachers.view")
  async export() {
    const buffer = await this.excel.exportExcel();

    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="teachers.xlsx"',
    });
  }

  @Get("import-template")
  @RequirePermissions("teachers.create")
  async importTemplate() {
    const buffer = await this.excel.createTemplate();

    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="teacher-import-template.xlsx"',
    });
  }

  @Post("import")
  @RequirePermissions("teachers.create")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    })
  )
  import(@UploadedFile() file: UploadedExcelFile) {
    return this.excel.importExcel(file);
  }

  @Get()
  @RequirePermissions("teachers.view")
  list() {
    return this.teachers.list();
  }

  @Post()
  @RequirePermissions("teachers.create")
  create(@Body() dto: TeacherDto) {
    return this.teachers.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("teachers.update")
  update(@Param("id") id: string, @Body() dto: TeacherDto) {
    return this.teachers.update(id, dto);
  }

  @Delete()
  @RequirePermissions("teachers.delete")
  delete(@Body() dto: IdsDto) {
    return this.teachers.delete(dto.ids);
  }
}