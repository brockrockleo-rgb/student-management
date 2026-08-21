import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/mongodb";
import { EntityUtilsService } from "../common";
import { TeacherDto } from "../dtos";
import { Department, Teacher } from "../entities";

@Injectable()
export class TeachersService {
  constructor(
    private readonly em: EntityManager,
    private readonly entityUtils: EntityUtilsService,
    @InjectRepository(Teacher)
    private readonly teachers: EntityRepository<Teacher>,
    @InjectRepository(Department)
    private readonly departments: EntityRepository<Department>,
  ) {}

  list() {
    return this.teachers.find(
      { deleted: false },
      { populate: ["department"], orderBy: { createdAt: "ASC" } },
    );
  }

  async create(dto: TeacherDto) {
    const department = await this.entityUtils.getActive(
      this.departments,
      dto.departmentId,
      "khoa",
    );
    const entity = this.teachers.create({
      teacherCode: dto.teacherCode,
      name: dto.name,
      department,
    });
    this.em.persist(entity);
    await this.em.flush();
    return entity;
  }

  async update(id: string, dto: TeacherDto) {
    const entity = await this.entityUtils.getActive(
      this.teachers,
      id,
      "giáo viên",
    );
    const department = await this.entityUtils.getActive(
      this.departments,
      dto.departmentId,
      "khoa",
    );
    entity.teacherCode = dto.teacherCode;
    entity.name = dto.name;
    entity.department = department;
    await this.em.flush();
    return entity;
  }

  delete(ids: string[]) {
    return this.entityUtils.softDelete(this.teachers, ids);
  }
}
