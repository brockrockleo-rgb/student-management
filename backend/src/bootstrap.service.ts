import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { EntityManager, MikroORM } from "@mikro-orm/mongodb";
import * as bcrypt from "bcryptjs";
import { Department, Permission, Position, SchoolClass, Student, Teacher, User, UserPermission } from "./entities";

const resources = ["students", "teachers", "departments", "classes", "users", "permissions"];
const actions = ["view", "create", "update", "delete"];

const DEFAULT_PERMISSION_CODES: Record<Position, string[]> = {
  [Position.STUDENT]: ["students.view"],
  [Position.TEACHER]: ["students.view", "students.create", "students.update", "students.delete", "classes.view"],
  [Position.ADMIN]: [],
};

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  constructor(private readonly orm: MikroORM) {}

  async onApplicationBootstrap() {
    const em = this.orm.em.fork();

    await this.ensureSeedData(em);
    await em.flush();

    await this.migrateExistingData(em);
    await em.flush();

    await this.ensureFixedPermissions(em);
    await em.flush();

    await this.ensureUserPermissionDefaults(em);
    await em.flush();
  }

  private normalizeTokenVersion(user: User) {
    const value = Number(user.tokenVersion);
    user.tokenVersion = Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
  }

  private async ensureSeedData(em: EntityManager) {
    let cntt = await em.findOne(Department, { code: "CNTT" });
    if (!cntt) {
      cntt = em.create(Department, { code: "CNTT", name: "Khoa Cong nghe thong tin", deleted: false });
      em.persist(cntt);
      await em.flush();
    } else {
      cntt.deleted = false;
    }

    let dtvt = await em.findOne(Department, { code: "DTVT" });
    if (!dtvt) {
      dtvt = em.create(Department, { code: "DTVT", name: "Khoa Dien tu - Vien thong", deleted: false });
      em.persist(dtvt);
      await em.flush();
    } else {
      dtvt.deleted = false;
    }

    let teacher1 = await em.findOne(Teacher, { teacherCode: "GV001" });
    if (!teacher1) {
      teacher1 = em.create(Teacher, { teacherCode: "GV001", name: "Nguyen Van Hung", department: cntt, deleted: false });
      em.persist(teacher1);
      await em.flush();
    } else {
      teacher1.deleted = false;
      teacher1.department = cntt;
    }

    let teacher2 = await em.findOne(Teacher, { teacherCode: "GV002" });
    if (!teacher2) {
      teacher2 = em.create(Teacher, { teacherCode: "GV002", name: "Tran Minh Lan", department: dtvt, deleted: false });
      em.persist(teacher2);
      await em.flush();
    } else {
      teacher2.deleted = false;
      teacher2.department = dtvt;
    }

    let ktmt = await em.findOne(SchoolClass, { code: "KTMT01" });
    if (!ktmt) {
      ktmt = em.create(SchoolClass, { code: "KTMT01", name: "Ky thuat may tinh 01", department: cntt, homeroomTeacher: teacher1, deleted: false });
      em.persist(ktmt);
      await em.flush();
    } else {
      ktmt.deleted = false;
      ktmt.department = cntt;
      ktmt.homeroomTeacher = teacher1;
    }

    let dtvtClass = await em.findOne(SchoolClass, { code: "DTVT01" });
    if (!dtvtClass) {
      dtvtClass = em.create(SchoolClass, { code: "DTVT01", name: "Dien tu - Vien thong 01", department: dtvt, homeroomTeacher: teacher2, deleted: false });
      em.persist(dtvtClass);
      await em.flush();
    } else {
      dtvtClass.deleted = false;
      dtvtClass.department = dtvt;
      dtvtClass.homeroomTeacher = teacher2;
    }

    let student1 = await em.findOne(Student, { studentCode: "20210001" });
    if (!student1) {
      student1 = em.create(Student, { studentCode: "20210001", name: "Nguyen Minh An", email: "an.nm@hust.edu.vn", schoolClass: ktmt, deleted: false });
      em.persist(student1);
      await em.flush();
    } else {
      student1.deleted = false;
      student1.schoolClass = ktmt;
    }

    let student2 = await em.findOne(Student, { studentCode: "20210002" });
    if (!student2) {
      student2 = em.create(Student, { studentCode: "20210002", name: "Tran Thu Binh", email: "binh.tt@hust.edu.vn", schoolClass: dtvtClass, deleted: false });
      em.persist(student2);
      await em.flush();
    } else {
      student2.deleted = false;
      student2.schoolClass = dtvtClass;
    }

    let admin = await em.findOne(User, { username: "admin" });
    if (!admin) {
      admin = em.create(User, {
        username: "admin",
        passwordHash: await bcrypt.hash("admin123", 12),
        name: "Quan tri he thong",
        position: Position.ADMIN,
        permissionsInitialized: false,
        tokenVersion: 0,
        deleted: false,
      });
      em.persist(admin);
    } else {
      admin.deleted = false;
      this.normalizeTokenVersion(admin);
    }

    const teacherUserByUsername = await em.findOne(User, { username: teacher1.teacherCode });
    const teacherUserByRelation = await em.findOne(User, { teacher: teacher1._id } as never);

    if (teacherUserByUsername && teacherUserByRelation && teacherUserByUsername.id !== teacherUserByRelation.id) {
      throw new Error(`Du lieu User bi xung dot: ${teacher1.teacherCode}`);
    }

    let teacherUser = teacherUserByRelation ?? teacherUserByUsername;
    if (!teacherUser) {
      teacherUser = em.create(User, {
        username: teacher1.teacherCode,
        passwordHash: await bcrypt.hash("teacher123", 12),
        name: teacher1.name,
        position: Position.TEACHER,
        teacher: teacher1,
        student: undefined,
        permissionsInitialized: false,
        tokenVersion: 0,
        deleted: false,
      });
      em.persist(teacherUser);
    } else {
      teacherUser.username = teacher1.teacherCode;
      teacherUser.name = teacher1.name;
      teacherUser.position = Position.TEACHER;
      teacherUser.teacher = teacher1;
      teacherUser.student = undefined;
      teacherUser.deleted = false;
      this.normalizeTokenVersion(teacherUser);
    }

    const studentUserByUsername = await em.findOne(User, { username: student1.studentCode });
    const studentUserByRelation = await em.findOne(User, { student: student1._id } as never);

    if (studentUserByUsername && studentUserByRelation && studentUserByUsername.id !== studentUserByRelation.id) {
      throw new Error(`Du lieu User bi xung dot: ${student1.studentCode}`);
    }

    let studentUser = studentUserByRelation ?? studentUserByUsername;
    if (!studentUser) {
      studentUser = em.create(User, {
        username: student1.studentCode,
        passwordHash: await bcrypt.hash("student123", 12),
        name: student1.name,
        position: Position.STUDENT,
        student: student1,
        teacher: undefined,
        permissionsInitialized: false,
        tokenVersion: 0,
        deleted: false,
      });
      em.persist(studentUser);
    } else {
      studentUser.username = student1.studentCode;
      studentUser.name = student1.name;
      studentUser.position = Position.STUDENT;
      studentUser.student = student1;
      studentUser.teacher = undefined;
      studentUser.deleted = false;
      this.normalizeTokenVersion(studentUser);
    }

    const users = await em.find(User, {});
    for (const user of users) {
      this.normalizeTokenVersion(user);
    }
  }

  private async migrateExistingData(em: EntityManager) {
    const classes = await em.find(SchoolClass, { deleted: false }, { populate: ["department"] });
    const teachers = await em.find(Teacher, { deleted: false }, { populate: ["department"] });

    for (const schoolClass of classes) {
      if (schoolClass.homeroomTeacher) continue;
      const teacher = teachers.find((item) => item.department?.id === schoolClass.department?.id);
      if (teacher) {
        schoolClass.homeroomTeacher = teacher;
      }
    }

    const oldPermissions = await em.find(Permission, { deleted: false });
    for (const permission of oldPermissions) {
      if (permission.code.startsWith("subjects.") || permission.code.startsWith("assignments.")) {
        permission.deleted = true;
      }
    }
  }

  private async ensureFixedPermissions(em: EntityManager) {
    const allFixedCodes = ["permissions.manage"];
    for (const resource of resources) {
      for (const action of actions) {
        allFixedCodes.push(`${resource}.${action}`);
      }
    }

    for (const code of allFixedCodes) {
      const existing = await em.findOne(Permission, { code });
      if (existing) {
        existing.deleted = false;
        continue;
      }
      const permission = em.create(Permission, {
        code,
        name: code,
        description: `Quyen he thong: ${code}`,
        deleted: false,
      });
      em.persist(permission);
    }
  }

  private async ensureUserPermissionDefaults(em: EntityManager) {
    const users = await em.find(User, { deleted: false });

    for (const user of users) {
      if (user.permissionsInitialized) continue;

      const defaultCodes = new Set<string>(
        user.position === Position.ADMIN ? [] : DEFAULT_PERMISSION_CODES[user.position] ?? []
      );

      const existingMappings = await em.find(
        UserPermission,
        { user: user._id } as never,
        { populate: ["permission"] }
      );

      const mappingByCode = new Map<string, UserPermission>();
      for (const mapping of existingMappings) {
        const code = mapping.permission.code;
        mappingByCode.set(code, mapping);
        mapping.deleted = !defaultCodes.has(code);
      }

      const permissionsToAssign = defaultCodes.size > 0
        ? await em.find(Permission, { code: { $in: Array.from(defaultCodes) }, deleted: false })
        : [];

      for (const permission of permissionsToAssign) {
        const existing = mappingByCode.get(permission.code);
        if (existing) {
          existing.deleted = false;
          continue;
        }
        const mapping = em.create(UserPermission, { user, permission, deleted: false });
        em.persist(mapping);
      }

      user.permissionsInitialized = true;
    }
  }
}