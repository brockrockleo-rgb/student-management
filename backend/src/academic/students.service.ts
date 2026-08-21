import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/mongodb";
import { EntityUtilsService } from "../common";
import { StudentDto } from "../dtos";
import { Student } from "../entities";
import type { JwtUser } from "../security";
import { AcademicAccessService } from "./academic-access.service";

@Injectable()
export class StudentsService {
  constructor(
    private readonly em: EntityManager,
    private readonly access: AcademicAccessService,
    private readonly entityUtils: EntityUtilsService,
    @InjectRepository(Student)
    private readonly students: EntityRepository<Student>,
  ) {}

  async list(jwt: JwtUser) {
    const scope = await this.access.studentScope(jwt);
    return this.students.find(
      { deleted: false, ...scope },
      {
        populate: [
          "schoolClass",
          "schoolClass.department",
          "schoolClass.homeroomTeacher",
        ],
        orderBy: { createdAt: "ASC" },
      },
    );
  }

  async create(jwt: JwtUser, dto: StudentDto) {
    const schoolClass = await this.access.validateStudentClass(jwt, dto.classId,dto.departmentId);
    const entity = this.students.create({
      studentCode: dto.studentCode,
      name: dto.name,
      email: dto.email,
      schoolClass,
    });
    this.em.persist(entity);
    await this.em.flush();
    return entity;
  }

  async update(jwt: JwtUser, id: string, dto: StudentDto) {
    await this.access.assertStudentAccess(jwt, [id]);
    const entity = await this.entityUtils.getActive(
      this.students,
      id,
      "sinh viên",
    );
    const schoolClass = await this.access.validateStudentClass(jwt, dto.classId,dto.departmentId);

    entity.studentCode = dto.studentCode;
    entity.name = dto.name;
    entity.email = dto.email;
    entity.schoolClass = schoolClass;
    await this.em.flush();
    return entity;
  }

  async delete(jwt: JwtUser, ids: string[]) {
    await this.access.assertStudentAccess(jwt, ids);
    return this.entityUtils.softDelete(this.students, ids);
  }

}
