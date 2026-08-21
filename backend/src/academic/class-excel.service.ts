import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/mongodb";
import { Department, SchoolClass, Teacher } from "../entities";
import type { JwtUser } from "../security";
import type {
  ImportClassRow,
  ImportExcelError,
  ImportExcelResult,
  UploadedExcelFile,
} from "./academic.types";
import { ClassesService } from "./classes.service";
import { createExcelBuffer, normalizeCode, readExcelRows } from "./excel.utils";

@Injectable()
export class ClassExcelService {
  constructor(
    private readonly em: EntityManager,
    private readonly classesService: ClassesService,
    @InjectRepository(SchoolClass)
    private readonly classes: EntityRepository<SchoolClass>,
    @InjectRepository(Department)
    private readonly departments: EntityRepository<Department>,
    @InjectRepository(Teacher)
    private readonly teachers: EntityRepository<Teacher>
  ) {}

  async exportExcel(jwt: JwtUser) {
    const classes = await this.classesService.list(jwt);

    return createExcelBuffer({
      name: "Classes",
      columns: [
        { header: "Mã lớp", key: "code", width: 18 },
        { header: "Tên lớp", key: "name", width: 30 },
        { header: "Mã khoa", key: "departmentCode", width: 18 },
        { header: "Tên khoa", key: "departmentName", width: 35 },
        { header: "Mã GVCN", key: "teacherCode", width: 18 },
        { header: "Tên GVCN", key: "teacherName", width: 30 },
      ],
      rows: classes.map((schoolClass) => ({
        code: schoolClass.code,
        name: schoolClass.name,
        departmentCode: schoolClass.department?.code ?? "",
        departmentName: schoolClass.department?.name ?? "",
        teacherCode: schoolClass.homeroomTeacher?.teacherCode ?? "",
        teacherName: schoolClass.homeroomTeacher?.name ?? "",
      })),
    });
  }

  async createTemplate() {
    const departments = await this.departments.find(
      { deleted: false },
      { orderBy: { createdAt: "ASC" } }
    );

    const teachers = await this.teachers.find(
      { deleted: false },
      { populate: ["department"], orderBy: { createdAt: "ASC" } }
    );

    return createExcelBuffer(
      {
        name: "Nhập lớp",
        columns: [
          { header: "Mã lớp", key: "code", width: 18 },
          { header: "Tên lớp", key: "name", width: 30 },
          { header: "Mã khoa", key: "departmentCode", width: 18 },
          { header: "Mã GVCN", key: "teacherCode", width: 18 },
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
        {
          name: "Danh mục giáo viên",
          columns: [
            { header: "Mã giáo viên", key: "teacherCode", width: 18 },
            { header: "Họ và tên", key: "name", width: 30 },
            { header: "Mã khoa", key: "departmentCode", width: 18 },
          ],
          rows: teachers.map((teacher) => ({
            teacherCode: teacher.teacherCode,
            name: teacher.name,
            departmentCode: teacher.department?.code ?? "",
          })),
        },
      ]
    );
  }

  async importExcel(file: UploadedExcelFile): Promise<ImportExcelResult> {
    const rawRows = await readExcelRows(file,  [
      "Mã lớp",
      "Tên lớp",
      "Mã khoa",
      "Mã GVCN",
    ]);

    if (!rawRows.length) {
      throw new BadRequestException("File Excel ko co du lieu");
    }

    const rows: ImportClassRow[] = rawRows.map(({ row, values }) => ({
      row,
      code: normalizeCode(values[0]),
      name: String(values[1] ?? "").trim(),
      departmentCode: normalizeCode(values[2]),
      teacherCode: normalizeCode(values[3]),
    }));

    const departments = await this.departments.find({ deleted: false });

    const teachers = await this.teachers.find(
      { deleted: false },
      { populate: ["department"] }
    );

    const existingClasses = await this.classes.find({});

    const departmentByCode = new Map<string, Department>(
      departments.map((department) => [
        normalizeCode(department.code),
        department,
      ])
    );

    const teacherByCode = new Map<string, Teacher>(
      teachers.map((teacher) => [
        normalizeCode(teacher.teacherCode),
        teacher,
      ])
    );

    const existingClassByCode = new Map<string, SchoolClass>(
      existingClasses.map((schoolClass) => [
        normalizeCode(schoolClass.code),
        schoolClass,
      ])
    );

    const fileCodes = new Set<string>();
    const errors: ImportExcelError[] = [];
    const importedCodes: string[] = [];

    for (const row of rows) {
      const department = departmentByCode.get(row.departmentCode);
      const teacher = teacherByCode.get(row.teacherCode);
      const existingClass = existingClassByCode.get(row.code);
      const rowErrors: string[] = [];

      if (!row.code) {
        rowErrors.push("Thiếu mã lớp");
      }

      if (!row.name) {
        rowErrors.push("Thiếu tên lớp");
      }

      if (!row.departmentCode) {
        rowErrors.push("Thiếu mã khoa");
      } else if (!department) {
        rowErrors.push("Mã khoa không tồn tại hoặc đã bị xóa");
      }

      if (!row.teacherCode) {
        rowErrors.push("Thiếu mã GVCN");
      } else if (!teacher) {
        rowErrors.push("Mã GVCN không tồn tại hoặc đã bị xóa");
      }

      if (
        department &&
        teacher &&
        (!teacher.department ||
          teacher.department.deleted ||
          normalizeCode(teacher.department.code) !== row.departmentCode)
      ) {
        rowErrors.push("Giáo viên chủ nhiệm không thuộc khoa của lớp");
      }

      if (existingClass && !existingClass.deleted) {
        rowErrors.push("Mã lớp đã tồn tại");
      }

      if (row.code && fileCodes.has(row.code)) {
        rowErrors.push("Mã lớp bị lặp trong file");
      }

      if (row.code) {
        fileCodes.add(row.code);
      }

      if (rowErrors.length > 0 || !department || !teacher) {
        errors.push({
          row: row.row,
          message: rowErrors.join("; "),
        });
        continue;
      }

      if (existingClass && existingClass.deleted) {
        existingClass.deleted = false;
        existingClass.code = row.code;
        existingClass.name = row.name;
        existingClass.department = department;
        existingClass.homeroomTeacher = teacher;

        this.em.persist(existingClass);
        importedCodes.push(row.code);
        continue;
      }

      const schoolClass = this.classes.create({
        code: row.code,
        name: row.name,
        department,
        homeroomTeacher: teacher,
      });

      this.em.persist(schoolClass);
      existingClassByCode.set(row.code, schoolClass);
      importedCodes.push(row.code);
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