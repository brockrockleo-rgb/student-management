import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/mongodb";
import { ObjectId } from "mongodb";
import { EntityUtilsService } from "../common";
import { Department, Position, SchoolClass, Student, User } from "../entities";
import type { JwtUser } from "../security";

@Injectable()
export class AcademicAccessService {
  constructor(
    private readonly em: EntityManager,
    private readonly entityUtils: EntityUtilsService,
    @InjectRepository(Student)
    private readonly students: EntityRepository<Student>,
    @InjectRepository(SchoolClass)
    private readonly classes: EntityRepository<SchoolClass>,
    @InjectRepository(User)
    private readonly users: EntityRepository<User>,
  ) {}

  async studentScope(jwt: JwtUser): Promise<Record<string, unknown>> {
    if (jwt.position === Position.ADMIN) return {};

    const account = await this.getAccount(jwt.sub);
    if (jwt.position === Position.STUDENT) {
      if (!account.student || account.student.deleted) {
        return { _id: new ObjectId("000000000000000000000000") };
      }
      await this.em.populate(account.student, ["schoolClass"]);
      return { schoolClass: account.student.schoolClass._id };
    }

    const classIds = await this.accessibleClassIds(jwt);
    return { schoolClass: { $in: classIds ?? [] } };
  }

  async accessibleClassIds(jwt: JwtUser): Promise<ObjectId[] | null> {
    if (jwt.position === Position.ADMIN) return null;

    const account = await this.getAccount(jwt.sub);
    if (jwt.position === Position.STUDENT) {
      if (!account.student || account.student.deleted) return [];
      await this.em.populate(account.student, ["schoolClass"]);
      return [account.student.schoolClass._id];
    }

    if (!account.teacher || account.teacher.deleted) return [];
    const classes = await this.classes.find({
      homeroomTeacher: account.teacher._id,
      deleted: false,
    });
    return classes.map((item) => item._id);
  }

  async validateStudentClass(jwt: JwtUser, classId: string,departmentId?:string) {
    const schoolClass = await this.entityUtils.getActive(
      this.classes,
      classId,
      "lớp",
    );
    await this.em.populate(schoolClass, ["department", "homeroomTeacher"]);

    if (!schoolClass.department || schoolClass.department.deleted) {
      throw new BadRequestException(
        "Lớp chưa có khoa hoạt động; admin cần cập nhật lại lớp",
      );
    }
    if (departmentId && schoolClass.department.id !== departmentId){
      throw new BadRequestException("Lớp đã chọn không thuốc khoa");
    }
    if (!schoolClass.homeroomTeacher || schoolClass.homeroomTeacher.deleted) {
      throw new BadRequestException(
        "Lớp chưa có giao viên",
      );
    }

    const accessible = await this.accessibleClassIds(jwt);
    if (accessible && !accessible.some((id) => id.equals(schoolClass._id))) {
      throw new ForbiddenException(
        "Bạn không được quản lý sinh viên của lớp này",
      );
    }
    return schoolClass;
  }

  async assertStudentAccess(jwt: JwtUser, ids: string[]) {
    if (jwt.position === Position.ADMIN) return;

    const scope = await this.studentScope(jwt);
    const objectIds = this.entityUtils.toObjectIds(ids, "ID sinh viên");
    const allowed = await this.students.count({
      _id: { $in: objectIds },
      deleted: false,
      ...scope,
    } as never);

    if (allowed !== new Set(ids).size) {
      throw new ForbiddenException(
        "Bạn không được sửa hoặc xóa sinh viên ngoài lớp chủ nhiệm",
      );
    }
  }

  private async getAccount(id: string) {
    if (!ObjectId.isValid(id)) {
      throw new ForbiddenException("Token không chứa ID tài khoản hợp lệ");
    }

    const account = await this.users.findOne(
      { _id: new ObjectId(id) },
      { populate: ["teacher", "student"] },
    );
    if (!account || account.deleted) {
      throw new ForbiddenException("Tài khoản không còn hoạt động");
    }
    return account;
  }
}
