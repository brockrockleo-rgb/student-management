import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/mongodb";
import { Department, Teacher } from "../entities";
import type {
  ImportExcelError,
  ImportExcelResult,
  ImportTeacherRow,
  UploadedExcelFile,
} from "./academic.types";
import { createExcelBuffer, normalizeCode, readExcelRows } from "./excel.utils";

@Injectable()
export class TeacherExcelService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Teacher)
    private readonly teachers: EntityRepository<Teacher>,
    @InjectRepository(Department)
    private readonly departments: EntityRepository<Department>
  ) {}

  async exportExcel() {
    const teachers = await this.teachers.find(
      { deleted: false },
      {
        populate: ["department"],
        orderBy: { createdAt: "ASC" },
      }
    );

    return createExcelBuffer({
      name: "Danh sách giáo viên",
      columns: [
        { header: "Mã giáo viên", key: "teacherCode", width: 18 },
        { header: "Họ và tên", key: "name", width: 30 },
        { header: "Mã khoa", key: "departmentCode", width: 18 },
        { header: "Tên khoa", key: "departmentName", width: 35 },
      ],
      rows: teachers.map((teacher) => ({
        teacherCode: teacher.teacherCode,
        name: teacher.name,
        departmentCode: teacher.department?.code ?? "",
        departmentName: teacher.department?.name ?? "",
      })),
    });
  }

  async createTemplate() {
    const departments = await this.departments.find(
      { deleted: false },
      { orderBy: { createdAt: "ASC" } }
    );

    return createExcelBuffer(
      {
        name: "Nhập giáo viên",
        columns: [
          { header: "Mã giáo viên", key: "teacherCode", width: 18 },
          { header: "Họ và tên", key: "name", width: 30 },
          { header: "Mã khoa", key: "departmentCode", width: 18 },
        ],
        rows: [],
      },
      [
        {
          name: "Danh mục khoa",
          columns: [
            { header: "Mã khoa", key: "code", width: 18 },
            { header: "Tên khoa", key: "name", width: 35 },
          ],
          rows: departments.map((department) => ({
            code: department.code,
            name: department.name,
          })),
        },
      ]
    );
  }

  async importExcel(file: UploadedExcelFile): Promise<ImportExcelResult> {
    const rawRows = await readExcelRows(file, "Nhập giáo viên", [
      "Mã giáo viên",
      "Họ và tên",
      "Mã khoa",
    ]);

    if (!rawRows.length) {
      throw new BadRequestException("File Excel không có dữ liệu giáo viên");
    }

    const rows: ImportTeacherRow[] = rawRows.map(({ row, values }) => ({
      row,
      teacherCode: normalizeCode(values[0]),
      name: String(values[1] ?? "").trim(),
      departmentCode: normalizeCode(values[2]),
    }));

    const departments = await this.departments.find({ deleted: false });

    const departmentByCode = new Map<string, Department>(
      departments.map((department) => [
        normalizeCode(department.code),
        department,
      ])
    );

    const existingTeachers = await this.teachers.find({});

    const existingTeacherByCode = new Map<string, Teacher>(
      existingTeachers.map((teacher) => [
        normalizeCode(teacher.teacherCode),
        teacher,
      ])
    );

    const fileCodes = new Set<string>();
    const errors: ImportExcelError[] = [];
    const importedCodes: string[] = [];

    for (const row of rows) {
      const department = departmentByCode.get(row.departmentCode);
      const existingTeacher = existingTeacherByCode.get(row.teacherCode);
      const rowErrors: string[] = [];

      if (!row.teacherCode) {
        rowErrors.push("Thiếu mã giáo viên");
      }

      if (!row.name) {
        rowErrors.push("Thiếu họ và tên");
      }

      if (!row.departmentCode) {
        rowErrors.push("Thiếu mã khoa");
      } else if (!department) {
        rowErrors.push("Mã khoa không tồn tại hoặc đã bị xóa");
      }

      if (existingTeacher && !existingTeacher.deleted) {
        rowErrors.push("Mã giáo viên đã tồn tại");
      }

      if (row.teacherCode && fileCodes.has(row.teacherCode)) {
        rowErrors.push("Mã giáo viên bị lặp trong file");
      }

      if (row.teacherCode) {
        fileCodes.add(row.teacherCode);
      }

      if (rowErrors.length > 0 || !department) {
        errors.push({
          row: row.row,
          message: rowErrors.join("; "),
        });
        continue;
      }

      if (existingTeacher && existingTeacher.deleted) {
        existingTeacher.deleted = false;
        existingTeacher.teacherCode = row.teacherCode;
        existingTeacher.name = row.name;
        existingTeacher.department = department;

        this.em.persist(existingTeacher);
        importedCodes.push(row.teacherCode);
        continue;
      }

      const teacher = this.teachers.create({
        teacherCode: row.teacherCode,
        name: row.name,
        department,
      });

      this.em.persist(teacher);
      existingTeacherByCode.set(row.teacherCode, teacher);
      importedCodes.push(row.teacherCode);
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