import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/mongodb";
import { EntityUtilsService } from "../common";
import { ClassDto } from "../dtos";
import { Department, SchoolClass, Teacher, Student } from "../entities";
import type { JwtUser } from "../security";
import { AcademicAccessService } from "./academic-access.service";



export type ClassListWithStudentCountItem = {
  id: string;
  code: string;
  name: string;

  department: {
    id: string;
    code: string;
    name: string;
  } | null;

  homeroomTeacher: {
    id: string;
    teacherCode: string;
    name: string;
  } | null;

  studentCount: number;
};







@Injectable()
export class ClassesService {
  constructor(
    private readonly em: EntityManager,
    private readonly access: AcademicAccessService,
    private readonly entityUtils: EntityUtilsService,
    @InjectRepository(SchoolClass)
    private readonly classes: EntityRepository<SchoolClass>,
    @InjectRepository(Department)
    private readonly departments: EntityRepository<Department>,
    @InjectRepository(Student) private readonly students:EntityRepository<Student>,
    @InjectRepository(Teacher)
    private readonly teachers: EntityRepository<Teacher>,
  ) {}

  async list(jwt: JwtUser) {
    const classIds = await this.access.accessibleClassIds(jwt);
    const scope = classIds === null ? {} : { _id: { $in: classIds } };
    return this.classes.find(
      { deleted: false, ...scope },
      {
        populate: ["department", "homeroomTeacher"],
        orderBy: { createdAt: "ASC" },
      },
    );
  }










async listWithStudentCount(jwt: JwtUser):Promise<ClassListWithStudentCountItem[]> {
  const classes = await this.list(jwt);

  if (classes.length === 0) {
    return [];
  }

  const classIds = classes.map((schoolClass) => schoolClass._id);

  const students = await this.students.find(
    {
      deleted: false,
      schoolClass: {
        $in: classIds,
      },
    } as never,
    {
      populate: [
        "schoolClass",
      ] as never,
    },
  );

  const studentCountByClass = new Map<string, number>();

  for (const student of students) {
    const classId = student.schoolClass?.id;

    if (!classId) {
      continue;
    }

    const currentCount = studentCountByClass.get(classId) ?? 0;

    studentCountByClass.set(
      classId,
      currentCount + 1,
    );
  }

  return classes.map(
  (schoolClass): ClassListWithStudentCountItem => ({
    id: schoolClass.id,
    code: schoolClass.code,
    name: schoolClass.name,
    department: schoolClass.department
      ? {
          id: schoolClass.department.id,
          code: schoolClass.department.code,
          name: schoolClass.department.name,
        }
      : null,
    homeroomTeacher: schoolClass.homeroomTeacher
      ? {
          id: schoolClass.homeroomTeacher.id,
          teacherCode: schoolClass.homeroomTeacher.teacherCode,
          name: schoolClass.homeroomTeacher.name,
        }
      : null,
    studentCount: studentCountByClass.get(schoolClass.id) ?? 0,
  }),
);
}











  async create(dto: ClassDto) {
    const { department, homeroomTeacher } = await this.resolveRelations(dto);
    const entity = this.classes.create({
      code: dto.code,
      name: dto.name,
      department,
      homeroomTeacher,
    });
    this.em.persist(entity);
    await this.em.flush();
    return entity;
  }

  async update(id: string, dto: ClassDto) {
    const entity = await this.entityUtils.getActive(this.classes, id, "lớp");
    const { department, homeroomTeacher } = await this.resolveRelations(dto);
    entity.code = dto.code;
    entity.name = dto.name;
    entity.department = department;
    entity.homeroomTeacher = homeroomTeacher;
    await this.em.flush();
    return entity;
  }

  delete(ids: string[]) {
    return this.entityUtils.softDelete(this.classes, ids);
  }

  private async resolveRelations(dto: ClassDto) {
    const department = await this.entityUtils.getActive(
      this.departments,
      dto.departmentId,
      "khoa",
    );
    const homeroomTeacher = await this.entityUtils.getActive(
      this.teachers,
      dto.teacherId,
      "giáo viên chủ nhiệm",
    );
    await this.em.populate(homeroomTeacher, ["department"]);
    this.assertSameDepartment(department, homeroomTeacher);
    return { department, homeroomTeacher };
  }

  private assertSameDepartment(department: Department, teacher: Teacher) {
    if (
      !teacher.department ||
      teacher.department.deleted ||
      teacher.department.id !== department.id
    ) {
      throw new BadRequestException(
        "Giáo viên chủ nhiệm phải thuộc khoa của lớp",
      );
    }
  }
}
