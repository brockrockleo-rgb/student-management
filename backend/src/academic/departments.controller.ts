import { Body, Controller, Delete, Get, Param, Patch, Post,StreamableFile,UploadedFile,UseInterceptors } from "@nestjs/common";
import { DepartmentDto, IdsDto } from "../dtos";
import { RequirePermissions } from "../security";
import { DepartmentsService } from "./departments.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadedExcelFile } from "./academic.types";
import { XLSX_MIME } from "./academic.types";
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get("export")
  @RequirePermissions("departments.view")
async export(){
  const buffer=await this.departments.exportExcel();
  return new StreamableFile(buffer,{type:XLSX_MIME,disposition:'attachment;filename="departments.xlsx',});
}



  @Get("import-template")
  @RequirePermissions("departments.create")
  async importTemplate() {
    const buffer =
      await this.departments.createImportTemplate();

    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition:
        'attachment; filename="department-import-template.xlsx"',
    });
  }

  @Post("import")
  @RequirePermissions("departments.create")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  import(
    @UploadedFile()
    file: UploadedExcelFile,
  ) {
    return this.departments.importExcel(file);
  }

  @Get()
  @RequirePermissions("departments.view")
  list() {
    return this.departments.listWithClassCount();
  }

  @Post()
  @RequirePermissions("departments.create")
  create(@Body() dto: DepartmentDto) {
    return this.departments.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("departments.update")
  update(
    @Param("id") id: string,
    @Body() dto: DepartmentDto,
  ) {
    return this.departments.update(id, dto);
  }

  @Delete()
  @RequirePermissions("departments.delete")
  delete(@Body() dto: IdsDto) {
    return this.departments.delete(dto.ids);
  }
}