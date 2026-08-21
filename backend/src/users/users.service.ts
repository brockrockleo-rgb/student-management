import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/mongodb";
import * as bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { CreateUserDto, UpdateUserDto } from "../dtos";
import { Permission, Position, Student, Teacher, User, UserPermission } from "../entities";

const DEFAULT_PERMISSION_CODES: Record<Position, string[]> = {
  [Position.STUDENT]: ["students.view"],
  [Position.TEACHER]: ["students.view", "students.create", "students.update", "students.delete", "classes.view"],
  [Position.ADMIN]: [],
};

@Injectable()
export class UsersService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(User) private readonly users: EntityRepository<User>,
    @InjectRepository(Student) private readonly students: EntityRepository<Student>,
    @InjectRepository(Teacher) private readonly teachers: EntityRepository<Teacher>,
    @InjectRepository(Permission) private readonly permissions: EntityRepository<Permission>,
    @InjectRepository(UserPermission) private readonly userPermissions: EntityRepository<UserPermission>,
  ) {}

  list() {
    return this.users.find({ deleted: false }, { populate: ["teacher", "student"], orderBy: { createdAt: "ASC" } });
  }

  async create(dto: CreateUserDto) {
    const { teacher, student, linkedUser } = await this.resolveReference(dto.position, dto.referenceCode);

    if (linkedUser && !linkedUser.deleted) {
      throw new ConflictException(
        dto.position === Position.TEACHER ? "Giao vien nay da co tai khoan" : "Sinh vien nay da co tai khoan"
      );
    }

    const username = this.resolveUsername(dto.position, dto.username, teacher, student);
    const usernameOwner = await this.users.findOne({ username });

    if (usernameOwner && !usernameOwner.deleted) {
      throw new ConflictException(`Ten dang nhap ${username} da ton tai`);
    }

    const name = this.resolveDisplayName(dto.position, dto.name, teacher, student);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const deletedUser = linkedUser?.deleted ? linkedUser : usernameOwner?.deleted ? usernameOwner : undefined;

    if (deletedUser) {
      if (linkedUser && usernameOwner && linkedUser.id !== usernameOwner.id) {
        throw new ConflictException("Du lieu tai khoan cu bi trung. Hay kiem tra lai database");
      }

      Object.assign(deletedUser, {
        username,
        name,
        position: dto.position,
        passwordHash,
        teacher,
        student,
        deleted: false,
        permissionsInitialized: false,
        tokenVersion: this.nextTokenVersion(deletedUser.tokenVersion),
      });

      await this.resetDefaultPermissions(deletedUser);
      await this.flushOrThrowDuplicate();
      return deletedUser;
    }

    const user = this.users.create({
      username,
      name,
      position: dto.position,
      passwordHash,
      teacher,
      student,
      permissionsInitialized: false,
      tokenVersion: 0,
      deleted: false,
    });

    this.em.persist(user);
    await this.flushOrThrowDuplicate();
    await this.resetDefaultPermissions(user);
    await this.flushOrThrowDuplicate();

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException("ID tai khoan khong hop le");
    }

    const entity = await this.users.findOne(
      { _id: new ObjectId(id), deleted: false },
      { populate: ["teacher", "student"] }
    );

    if (!entity) {
      throw new NotFoundException("Khong tim thay tai khoan");
    }

    const oldPosition = entity.position;
    const oldTeacherId = entity.teacher?.id;
    const oldStudentId = entity.student?.id;
    const oldUsername = entity.username;
    const nextPosition = dto.position ?? entity.position;
    let shouldInvalidateToken = false;

    if (nextPosition === Position.TEACHER || nextPosition === Position.STUDENT) {
      const currentRefCode = nextPosition === Position.TEACHER ? entity.teacher?.teacherCode : entity.student?.studentCode;
      const { teacher, student, linkedUser } = await this.resolveReference(nextPosition, dto.referenceCode ?? currentRefCode);

      if (linkedUser && linkedUser.id !== id && !linkedUser.deleted) {
        throw new ConflictException(
          nextPosition === Position.TEACHER ? "Giao vien nay da co tai khoan" : "Sinh vien nay da co tai khoan"
        );
      }

      entity.position = nextPosition;
      entity.teacher = teacher;
      entity.student = student;
      entity.username = this.resolveUsername(nextPosition, undefined, teacher, student);
      entity.name = this.resolveDisplayName(nextPosition, undefined, teacher, student);

      const referenceChanged = oldTeacherId !== entity.teacher?.id || oldStudentId !== entity.student?.id;
      if (oldPosition !== nextPosition || referenceChanged || oldUsername !== entity.username) {
        shouldInvalidateToken = true;
      }
    }

    if (nextPosition === Position.ADMIN) {
      if (oldPosition !== Position.ADMIN) shouldInvalidateToken = true;

      entity.position = Position.ADMIN;
      entity.teacher = undefined;
      entity.student = undefined;

      if (dto.username !== undefined) {
        const username = dto.username.trim();
        if (!username) throw new BadRequestException("Ten dang nhap khong duoc de trong");
        if (username !== entity.username) shouldInvalidateToken = true;
        entity.username = username;
      }

      if (dto.name !== undefined) {
        const name = dto.name.trim();
        if (!name) throw new BadRequestException("Ten hien thi khong duoc de trong");
        entity.name = name;
      }
    }

    const usernameOwner = await this.users.findOne({ username: entity.username });
    if (usernameOwner && usernameOwner.id !== id) {
      throw new ConflictException("Ten dang nhap da ton tai");
    }

    if (dto.password) {
      entity.passwordHash = await bcrypt.hash(dto.password, 12);
      shouldInvalidateToken = true;
    }

    if (oldPosition !== nextPosition) {
      entity.permissionsInitialized = false;
      await this.resetDefaultPermissions(entity);
    }

    entity.tokenVersion = shouldInvalidateToken
      ? this.nextTokenVersion(entity.tokenVersion)
      : this.normalizeTokenVersion(entity.tokenVersion);

    await this.flushOrThrowDuplicate();
    return entity;
  }

  async delete(ids: string[]) {
    if (ids.some((id) => !ObjectId.isValid(id))) {
      throw new BadRequestException("ID can xoa khong hop le");
    }

    const objectIds = ids.map((id) => new ObjectId(id));
    const items = await this.users.find({ _id: { $in: objectIds }, deleted: false });

    for (const item of items) {
      item.deleted = true;
      item.tokenVersion = this.nextTokenVersion(item.tokenVersion);
    }

    await this.em.flush();
    return { deletedIds: items.map((item) => item.id), deleted: true };
  }

  private async resolveReference(position: Position, referenceCode?: string) {
    const code = referenceCode?.trim();

    if (position === Position.TEACHER) {
      if (!code) throw new BadRequestException("Vui long nhap ma giao vien");
      const teacher = await this.teachers.findOne({ teacherCode: code, deleted: false });
      if (!teacher) throw new NotFoundException(`Khong tim thay giao vien ${code}`);
      const linkedUser = await this.users.findOne({ teacher: teacher._id } as never);
      return { teacher, student: undefined, linkedUser };
    }

    if (position === Position.STUDENT) {
      if (!code) throw new BadRequestException("Vui long nhap ma sinh vien");
      const student = await this.students.findOne({ studentCode: code, deleted: false });
      if (!student) throw new NotFoundException(`Khong tim thay sinh vien ${code}`);
      const linkedUser = await this.users.findOne({ student: student._id } as never);
      return { teacher: undefined, student, linkedUser };
    }

    return { teacher: undefined, student: undefined, linkedUser: undefined };
  }

  private resolveUsername(position: Position, providedUsername?: string, teacher?: Teacher, student?: Student): string {
    if (position === Position.TEACHER) {
      if (!teacher) throw new BadRequestException("Khong tim thay giao vien");
      return teacher.teacherCode.trim();
    }
    if (position === Position.STUDENT) {
      if (!student) throw new BadRequestException("Khong tim thay sinh vien");
      return student.studentCode.trim();
    }
    const username = providedUsername?.trim();
    if (!username) throw new BadRequestException("Quan tri vien phai co ten dang nhap");
    return username;
  }

  private resolveDisplayName(position: Position, providedName?: string, teacher?: Teacher, student?: Student): string {
    if (position === Position.TEACHER) {
      if (!teacher) throw new BadRequestException("Khong tim thay thong tin giao vien");
      return teacher.name;
    }
    if (position === Position.STUDENT) {
      if (!student) throw new BadRequestException("Khong tim thay thong tin sinh vien");
      return student.name;
    }
    const adminName = providedName?.trim();
    if (!adminName) throw new BadRequestException("Phai nhap ten hien thi cua quan tri vien");
    return adminName;
  }

  private normalizeTokenVersion(value: unknown): number {
    const version = Number(value);
    return Number.isFinite(version) && version >= 0 ? Math.trunc(version) : 0;
  }

  private nextTokenVersion(value: unknown): number {
    return this.normalizeTokenVersion(value) + 1;
  }

  private async flushOrThrowDuplicate() {
    try {
      await this.em.flush();
    } catch (error: unknown) {
      const duplicateCode = (error as { code?: number } | null)?.code;
      if (error instanceof UniqueConstraintViolationException || duplicateCode === 11000) {
        throw new ConflictException("Ten dang nhap, ma sinh vien hoac ma giao vien da duoc su dung");
      }
      throw error;
    }
  }

  private async resetDefaultPermissions(user: User) {
    const defaultCodes = new Set<string>(
      user.position === Position.ADMIN ? [] : DEFAULT_PERMISSION_CODES[user.position] ?? []
    );

    const mappings = await this.userPermissions.find(
      { user: user._id } as never,
      { populate: ["permission"] as never }
    );

    const mappingByCode = new Map<string, UserPermission>();

    for (const mapping of mappings) {
      mappingByCode.set(mapping.permission.code, mapping);
      mapping.deleted = !defaultCodes.has(mapping.permission.code);
    }

    const permissionsToAssign = defaultCodes.size > 0
      ? await this.permissions.find({ code: { $in: Array.from(defaultCodes) }, deleted: false } as never)
      : [];

    for (const permission of permissionsToAssign) {
      const existing = mappingByCode.get(permission.code);
      if (existing) {
        existing.deleted = false;
        continue;
      }
      const mapping = this.userPermissions.create({ user, permission, deleted: false } as never);
      this.em.persist(mapping);
    }

    user.permissionsInitialized = true;
  }
}