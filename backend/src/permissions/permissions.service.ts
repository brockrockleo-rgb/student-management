import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager, EntityRepository } from "@mikro-orm/mongodb";
import { Permission } from "../entities";
import { User } from "../entities";
import { UserPermission } from "../entities";
import { Position } from "../entities"; 
import { ObjectId } from "mongodb";
const FIXED_PERMISSION_CODES = [
  'students.view',
  'students.create', 
  'students.update',
  'students.delete',
  'classes.view',
  'classes.create',
  'classes.update',
  'classes.delete',
  'teachers.view',
  //'teachers.create',
  'teachers.update',
  //'teacher.delete',
  //'departments.view',
  //'departments.create',
  //'departments.update',
  //'departments.delete',
  //'users.view',
  //'users.create',
  //'users.update',
 // 'users.delete',

];

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(User)
    private readonly users: EntityRepository<User>,
    @InjectRepository(Permission)
    private readonly permissions: EntityRepository<Permission>,
    private readonly em: EntityManager,
    @InjectRepository(UserPermission)
    private readonly userPermissions: EntityRepository<UserPermission>,
  ) {}

  async catalog() {
    return this.permissions.find(
      {
        code: {
          $in: [...FIXED_PERMISSION_CODES],
        },
        deleted: false,
      } as never,
      {
        orderBy: {
          code: 'ASC',
        },
      },
    );
  }

  async usersWithPermissions() {
    const users = await this.users.find(
      {
        deleted: false,
        position: {
          $ne: Position.ADMIN,
        },
      } as never,
      {
        populate: ["teacher","teacher.department","student","student.schoolClass","student.schoolClass.department",] as never,
      },
    );

    const mappings = users.length
      ? await this.userPermissions.find(
          {
            user: {
              $in: users.map((user) => user._id),
            },
            deleted: false,
          } as never,
          {
            populate: ['permission'] as never,
          },
        )
      : [];

    const byUser = new Map<string, string[]>();

    for (const mapping of mappings) {
      const list = byUser.get(mapping.user.id) ?? [];
      list.push(mapping.permission.code);
      byUser.set(mapping.user.id, list);
    }

    return users.map((user) => {
      let department;
      if(user.position===Position.TEACHER)
        department=user.teacher?.department;
      if(user.position===Position.STUDENT)
        department=user.student?.schoolClass?.department;
      const schoolClass= user.position=== Position.STUDENT?user.student?.schoolClass:undefined;
      return{
        id:user.id,
        username:user.username,
        name:user.name,
        position:user.position,
        referenceCode:user.teacher?.teacherCode??user.student?.studentCode,
        departmentId:department?.id,
        department:department?{id:department.id,
          code:department.code,
          name:department.name,
        }:undefined,
        classId:schoolClass?.id,
        schoolClass:schoolClass?{
          id:schoolClass.id,
          code:schoolClass.code,
          name:schoolClass.name,
        }:undefined,
        permissionCodes:byUser.get(user.id)??[],
      };
    });
  }

  async setUserPermissions(userId: string, permissionCodes: string[]) {
    if (!ObjectId.isValid(userId)) throw new NotFoundException("Không tìm thấy người dùng");
    
    const userObjectId = new ObjectId(userId);
    const user = await this.users.findOne({ _id: userObjectId, deleted: false } as never);
    if (!user) throw new NotFoundException("Không tìm thấy người dùng");

    const requestedCodes = new Set(permissionCodes);
    const existingMappings = await this.userPermissions.find(
      { user: userObjectId } as never,
      { populate: ["permission"] as never }
    );

    const mappingByCode = new Map<string, UserPermission>();
    for (const mapping of existingMappings) {
      const code = mapping.permission.code;
      mappingByCode.set(code, mapping);
      mapping.deleted = !requestedCodes.has(code);
    }

    const permissionsToAssign = permissionCodes.length > 0
      ? await this.permissions.find({ code: { $in: [...requestedCodes] }, deleted: false } as never)
      : [];

    for (const permission of permissionsToAssign) {
      const existing = mappingByCode.get(permission.code);
      if (existing) {
        existing.deleted = false;
        continue;
      }
      this.em.persist(this.userPermissions.create({ user, permission, deleted: false } as never));
    }

    await this.em.flush();
    return { success: true, message: "Cập nhật phân quyền thành công" };
  }
}