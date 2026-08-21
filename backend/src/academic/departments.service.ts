import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import { InjectRepository } from "@mikro-orm/nestjs";
import {
  EntityManager,
  EntityRepository,
} from "@mikro-orm/mongodb";

import { EntityUtilsService } from "../common";
import { DepartmentDto } from "../dtos";
import { Department,SchoolClass } from "../entities";

import { UploadedExcelFile } from "./academic.types";

import {
  createExcelBuffer,
  normalizeCode,
  readExcelRows,
} from "./excel.utils";
export type DepartmentListWithClassCountItem = {
  id: string;
  code: string;
  name: string;
  classCount: number;
};
@Injectable()
export class DepartmentsService {
  constructor(
    private readonly em: EntityManager,

    private readonly entityUtils: EntityUtilsService,

    @InjectRepository(Department)
    private readonly departments: EntityRepository<Department>,
    @InjectRepository(SchoolClass) private readonly classes:EntityRepository<SchoolClass>,
  ) {}

  
  list() {
    return this.departments.find(
      {
        deleted: false,
      },
      {
        orderBy: {
          createdAt: "ASC",
        },
      },
    );
  }

  



async listWithClassCount():Promise<DepartmentListWithClassCountItem[]> {
  const departments = await this.list();

  if (departments.length === 0) {
    return [];
  }

  const departmentIds = departments.map(
    (department) => department._id,
  );

  const classes = await this.classes.find(
    {
      deleted: false,
      department: {
        $in: departmentIds,
      },
    } as never,
    {
      populate: [
        "department",
      ] as never,
    },
  );

  const classCountByDepartment = new Map<string, number>();

  for (const schoolClass of classes) {
    const departmentId = schoolClass.department?.id;

    if (!departmentId) {
      continue;
    }

    const currentCount =
      classCountByDepartment.get(
        departmentId,
      ) ?? 0;

    classCountByDepartment.set(
      departmentId,
      currentCount + 1,
    );
  }

  return departments.map(
    (department) => ({
      ...department,
      classCount:
        classCountByDepartment.get(
          department.id,
        ) ?? 0,
    }),
  );
}













  async create(dto: DepartmentDto) {
    const entity = this.departments.create({
      code: normalizeCode(dto.code),
      name: dto.name.trim(),
    });

    this.em.persist(entity);

    await this.em.flush();

    return entity;
  }

  
  async update(
    id: string,
    dto: DepartmentDto,
  ) {
    const entity =
      await this.entityUtils.getActive(
        this.departments,
        id,
        "khoa",
      );

    entity.code = normalizeCode(dto.code);
    entity.name = dto.name.trim();

    await this.em.flush();

    return entity;
  }

 
  delete(ids: string[]) {
    return this.entityUtils.softDelete(
      this.departments,
      ids,
    );
  }

  
  async exportExcel() {
    const departments = await this.list();

    return createExcelBuffer({
      name: "Danh sách khoa",

      columns: [
        {
          header: "Mã khoa",
          key: "code",
          width: 18,
        },
        {
          header: "Tên khoa",
          key: "name",
          width: 35,
        },
      ],

      rows: departments.map((department) => ({
        code: department.code,
        name: department.name,
      })),
    });
  }

  createImportTemplate() {
    return createExcelBuffer({
      name: "Nhập khoa",

      columns: [
        {
          header: "Mã khoa",
          key: "code",
          width: 18,
        },
        {
          header: "Tên khoa",
          key: "name",
          width: 35,
        },
      ],

      rows: [],
    });
  }

 async importExcel(file: UploadedExcelFile) {
    const rows = await readExcelRows(file, [
      "Mã khoa",
      "Tên khoa",
    ]);

    if (!rows.length) {
      throw new BadRequestException("File không có dữ liệu khoa");
    }

    const existingDepartments = await this.departments.find({});

    const existingByCode = new Map<string, Department>(
      existingDepartments.map((department) => [
        normalizeCode(department.code),
        department,
      ])
    );

    const fileCodes = new Set<string>();
    const errors: { row: number; message: string }[] = [];
    const importedCodes: string[] = [];

    for (const row of rows) {
      const code = normalizeCode(row.values[0]);
      const name = String(row.values[1] ?? "").trim();
      const rowErrors: string[] = [];

      const existingDepartment = code ? existingByCode.get(code) : undefined;

      if (!code) {
        rowErrors.push("Thiếu mã khoa");
      }

      if (!name) {
        rowErrors.push("Thiếu tên khoa");
      }

      if (existingDepartment && !existingDepartment.deleted) {
        rowErrors.push("Mã khoa đã tồn tại");
      }

      if (code && fileCodes.has(code)) {
        rowErrors.push("Mã khoa bị lặp lại trong file");
      }

      if (code) {
        fileCodes.add(code);
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: row.row,
          message: rowErrors.join("; "),
        });
        continue;
      }

      if (existingDepartment && existingDepartment.deleted) {
        existingDepartment.deleted = false;
        existingDepartment.name = name;
        this.em.persist(existingDepartment);
        importedCodes.push(code);
        continue;
      }

      const department = this.departments.create({
        code,
        name,
      });

      this.em.persist(department);
      existingByCode.set(code, department);
      importedCodes.push(code);
    }

    if (importedCodes.length > 0) {
      await this.em.flush();
    }

    return {
      imported: importedCodes.length,
      skipped: errors.length,
      importedCodes,
      errors,
    };
  }
  
}