import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/mongodb";
import { Department, SchoolClass, Student } from "../entities";
import type { JwtUser } from "../security";
import { ClassesService } from "./classes.service";
import type {
  ImportExcelError,
  ImportExcelResult,
  ImportStudentRow,
  UploadedExcelFile,
} from "./academic.types";
import { StudentsService } from "./students.service";
import { Workbook, Worksheet } from "exceljs";
import { ObjectId } from "mongodb";
import { normalizeCode } from "./excel.utils";

@Injectable()
export class StudentExcelService {
  constructor(
    private readonly em: EntityManager,
    private readonly studentsService: StudentsService,
    private readonly classesService: ClassesService,
    @InjectRepository(Student)
    private readonly students: EntityRepository<Student>
  ) {}

  async export(jwt: JwtUser, classId?: string) {
    let students = await this.studentsService.list(jwt);

    if (classId) {
      if (!ObjectId.isValid(classId)) {
        throw new BadRequestException("ID lớp không hợp lệ");
      }

      students = students.filter(
        (student) => student.schoolClass?.id === classId
      );
    }

    const workbook = new Workbook();

    const sheet = workbook.addWorksheet("Sinh viên", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Mã sinh viên", key: "studentCode", width: 18 },
      { header: "Họ và tên", key: "name", width: 28 },
      { header: "Email", key: "email", width: 30 },
      {header:"ma khoa", key:"departmentCode",width:18,},
      {header:"ten khoa",key:"departmentName",width:28},
      { header: "Mã lớp", key: "classCode", width: 16 },
      { header: "Tên lớp", key: "className", width: 28 },
      { header: "Mã GVCN", key: "teacherCode", width: 16 },
      { header: "Giáo viên chủ nhiệm", key: "teacherName", width: 28 },
    ];

    students.forEach((student) => {
      sheet.addRow({
        studentCode: student.studentCode,
        name: student.name,
        email: student.email,
        departmentCode:student.schoolClass?.department?.code??"",
        departmentName:student.schoolClass?.department?.name??"",
        classCode: student.schoolClass?.code ?? "",
        className: student.schoolClass?.name ?? "",
        teacherCode: student.schoolClass?.homeroomTeacher?.teacherCode ?? "",
        teacherName: student.schoolClass?.homeroomTeacher?.name ?? "",
      });
    });

    this.styleSheet(sheet, "A1:I1");

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async createTemplate(jwt: JwtUser) {
    const classes = await this.classesService.list(jwt);
    const workbook = new Workbook();

    workbook.creator = "Student Management";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Nhập sinh viên", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Mã sinh viên", key: "studentCode", width: 18 },
      { header: "Họ và tên", key: "name", width: 28 },
      { header: "Email", key: "email", width: 30 },
      {header:"ma khoa",key:"departmentCode",width:18,},
      { header: "Mã lớp", key: "classCode", width: 18 },
    ];

    this.styleSheet(sheet, "A1:E1");

    const classSheet = workbook.addWorksheet("Danh mục lớp");

    classSheet.columns = [
      {header:"ma khoa", key:"departmentCode",width:18},
      { header: "Mã lớp", key: "code", width: 18 },
      { header: "Tên lớp", key: "name", width: 30 },
      { header: "Mã GVCN", key: "teacherCode", width: 18 },
      { header: "Giáo viên chủ nhiệm", key: "teacherName", width: 28 },
    ];

    classes.forEach((schoolClass) => {
      classSheet.addRow({
        departmentCode:schoolClass.department?.code??"",
        departmentName:schoolClass.department?.name??"",
        code: schoolClass.code,
        name: schoolClass.name,
        teacherCode: schoolClass.homeroomTeacher?.teacherCode ?? "Chưa phân công",
        teacherName: schoolClass.homeroomTeacher?.name ?? "Chưa phân công",
      });
    });

    this.styleSheet(classSheet, "A1:F1");

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async import(
    jwt: JwtUser,
    file: UploadedExcelFile
  ): Promise<ImportExcelResult> {
    const workbook = await this.loadWorkbook(file);

    const sheet =
      workbook.getWorksheet("Nhập sinh viên") ?? workbook.worksheets[0];

    if (!sheet) {
      throw new BadRequestException("File Excel không có worksheet");
    }

    this.validateHeaders(sheet);

    const rawRows = this.readRows(sheet);

    if (!rawRows.length) {
      throw new BadRequestException("File Excel không có dữ liệu sinh viên");
    }

    const classes = await this.classesService.list(jwt);

    const classByCode = new Map<string, SchoolClass>(
      classes.map((schoolClass) => [
        normalizeCode(schoolClass.code),
        schoolClass,
      ])
    );

    const codes = rawRows.map((row) => row.studentCode).filter(Boolean);
    const emails = rawRows
      .map((row) => row.email.trim().toLowerCase())
      .filter(Boolean);

    const existingStudents = await this.students.find({
      $or: [
        { studentCode: { $in: codes } },
        { email: { $in: emails } },
      ],
    } as never);

    const existingStudentByCode = new Map<string, Student>(
      existingStudents.map((student) => [
        normalizeCode(student.studentCode),
        student,
      ])
    );

    const existingStudentByEmail = new Map<string, Student>(
      existingStudents.map((student) => [
        String(student.email ?? "").trim().toLowerCase(),
        student,
      ])
    );

    const fileCodes = new Set<string>();
    const fileEmails = new Set<string>();
    const errors: ImportExcelError[] = [];
    const importedCodes: string[] = [];

    for (const row of rawRows) {
      const studentCode = normalizeCode(row.studentCode);
      const email = row.email.trim().toLowerCase();
      const departmentCode=normalizeCode(row.departmentCode);
      const classCode = normalizeCode(row.classCode);
      const schoolClass = classByCode.get(classCode);

      const existingByCode = existingStudentByCode.get(studentCode);
      const existingByEmail = existingStudentByEmail.get(email);
      const existingStudent = existingByCode ?? existingByEmail;

      const rowErrors: string[] = [];

      if (!studentCode) {
        rowErrors.push("Thiếu mã sinh viên");
      }

      if (!row.name) {
        rowErrors.push("Thiếu họ và tên");
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push("Email không hợp lệ");
      }
      if (!departmentCode){
        rowErrors.push("thieu ma khoa");
      }

      if (!classCode) {
        rowErrors.push("Thiếu mã lớp");
      } else if (!schoolClass) {
        rowErrors.push("Mã lớp không tồn tại hoặc ngoài quyền quản lý");

      }else{const classDepartmentCode=normalizeCode(schoolClass.department?.code);
        if(!departmentCode){
          rowErrors.push("thieu ma khoa");
        }else if(classDepartmentCode!==departmentCode){
          rowErrors.push(`lop ${classCode} khong thuoc khoa ${departmentCode}`);
        }

      
        if (!schoolClass.homeroomTeacher || schoolClass.homeroomTeacher.deleted) {
        rowErrors.push("Lớp chưa có GVCN hoạt động");
      }}

      if (existingByCode && !existingByCode.deleted) {
        rowErrors.push("Mã sinh viên đã tồn tại");
      }

      if (existingByEmail && !existingByEmail.deleted) {
        rowErrors.push("Email đã tồn tại");
      }

      if (
        existingByCode &&
        existingByEmail &&
        existingByCode.id !== existingByEmail.id
      ) {
        rowErrors.push("Mã sinh viên và email thuộc hai bản ghi khác nhau");
      }

      if (studentCode && fileCodes.has(studentCode)) {
        rowErrors.push("Mã sinh viên bị lặp trong file");
      }

      if (email && fileEmails.has(email)) {
        rowErrors.push("Email bị lặp trong file");
      }

      if (studentCode) {
        fileCodes.add(studentCode);
      }

      if (email) {
        fileEmails.add(email);
      }

      if (rowErrors.length > 0 || !schoolClass) {
        errors.push({
          row: row.row,
          message: rowErrors.join("; "),
        });
        continue;
      }

      if (existingStudent && existingStudent.deleted) {
        existingStudent.deleted = false;
        existingStudent.studentCode = studentCode;
        existingStudent.name = row.name;
        existingStudent.email = email;
        existingStudent.schoolClass = schoolClass;

        this.em.persist(existingStudent);

        existingStudentByCode.set(studentCode, existingStudent);
        existingStudentByEmail.set(email, existingStudent);
        importedCodes.push(studentCode);
        continue;
      }

      const student = this.students.create({
        studentCode,
        name: row.name,
        email,
        schoolClass,
      });

      this.em.persist(student);

      existingStudentByCode.set(studentCode, student);
      existingStudentByEmail.set(email, student);
      importedCodes.push(studentCode);
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

  private async loadWorkbook(file: UploadedExcelFile) {
    const fileName = file?.originalname?.trim().toLowerCase() ?? "";

    if (
      !file ||
      !file.buffer ||
      file.buffer.length === 0 ||
      !fileName.endsWith(".xlsx")
    ) {
      throw new BadRequestException("Chỉ chấp nhận file Excel .xlsx");
    }

    const workbook = new Workbook();

    try {
      const excelBuffer = file.buffer as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0];

      await workbook.xlsx.load(excelBuffer);
      return workbook;
    } catch (error) {
      console.error("Lỗi đọc file sinh viên:", error);
      throw new BadRequestException("Không đọc được file Excel");
    }
  }

  private validateHeaders(sheet: Worksheet) {
    const expectedHeaders = ["Mã sinh viên", "Họ và tên", "Email","ma khoa", "Mã lớp"];
    const headers = expectedHeaders.map((_, index) =>
      sheet.getRow(1).getCell(index + 1).text.trim()
    );

    if (expectedHeaders.some((header, index) => headers[index] !== header)) {
      throw new BadRequestException(
        `Dòng tiêu đề phải là: ${expectedHeaders.join(" | ")}`
      );
    }
  }

  private readRows(sheet: Worksheet) {
    const rows: ImportStudentRow[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const values = [1, 2, 3, 4,5].map((column) =>
        row.getCell(column).text.trim()
      );

      if (values.every((value) => !value)) {
        return;
      }

      rows.push({
        row: rowNumber,
        studentCode: normalizeCode(values[0]),
        name: String(values[1] ?? "").trim(),
        email: String(values[2] ?? "").trim().toLowerCase(),
        departmentCode:normalizeCode(values[3]),
        classCode: normalizeCode(values[4]),
      });
    });

    return rows;
  }

  private styleSheet(sheet: Worksheet, autoFilter: string) {
    const header = sheet.getRow(1);

    header.height = 24;
    header.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF2464C7",
      },
    };
    header.alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    sheet.autoFilter = autoFilter;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = {
          vertical: "middle",
        };
      }
    });
  }
}