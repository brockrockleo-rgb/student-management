import { Department } from "./department.entity";
import { Permission } from "./permission.entity";
import { PositionPermission } from "./position-permission.entity";
import { SchoolClass } from "./school-class.entity";
import { Student } from "./student.entity";
import { Teacher } from "./teacher.entity";
import { User } from "./user.entity";
import { UserPermission } from "./user-permission.entity";
import { BaseEntity } from "./base.entity";
export * from "./base.entity";
export * from "./department.entity";
export * from "./permission.entity";
export * from "./position-permission.entity";
export * from "./position.enum";
export * from "./school-class.entity";
export * from "./student.entity";
export * from "./teacher.entity";
export * from "./user.entity";
export * from "./user-permission.entity"
export const entities = [
 // BaseEntity,
  Department,
  SchoolClass,
  Student,
  Teacher,
  Permission,
  PositionPermission,
  User,
  UserPermission,
];
