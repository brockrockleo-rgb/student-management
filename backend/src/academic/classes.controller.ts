import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ClassDto, IdsDto } from "../dtos";
import { RequirePermissions } from "../security";
import type { AuthRequest, UploadedExcelFile } from "./academic.types";
import { XLSX_MIME } from "./academic.types";
import { ClassExcelService } from "./class-excel.service";
import { ClassesService } from "./classes.service";

@Controller("classes")
export class ClassesController {
  constructor(
    private readonly classes: ClassesService,
    private readonly excel: ClassExcelService
  ) {}












  






















  @Get("export")
  @RequirePermissions("classes.view")
  async export(@Req() req: AuthRequest) {
    const buffer = await this.excel.exportExcel(req.user);

    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="classes.xlsx"',
    });
  }

  @Get("import-template")
  @RequirePermissions("classes.create")
  async importTemplate() {
    const buffer = await this.excel.createTemplate();

    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="class-import-template.xlsx"',
    });
  }

  @Post("import")
  @RequirePermissions("classes.create")
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
  @RequirePermissions("classes.view")
  list(@Req() req: AuthRequest) {
    return this.classes.listWithStudentCount(req.user);
  }

  @Post()
  @RequirePermissions("classes.create")
  create(@Body() dto: ClassDto) {
    return this.classes.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("classes.update")
  update(@Param("id") id: string, @Body() dto: ClassDto) {
    return this.classes.update(id, dto);
  }

  @Delete()
  @RequirePermissions("classes.delete")
  delete(@Body() dto: IdsDto) {
    return this.classes.delete(dto.ids);
  }
}