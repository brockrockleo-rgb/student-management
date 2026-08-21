import { ArrayNotEmpty, IsArray, IsEmail, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength,ValidateIf } from "class-validator";
import { Position } from "./entities";

export class LoginDto {
  @IsString() @IsNotEmpty() username!: string;
  @IsString() @IsNotEmpty() password!: string;
}

export class IdsDto {
  @IsArray() @ArrayNotEmpty() @IsMongoId({ each: true }) ids!: string[];
}

export class DepartmentDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
}

export class ClassDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsMongoId() departmentId!: string;
  @IsMongoId() teacherId!: string;
}
export class ChangePasswordDto{
  @IsString() @IsNotEmpty() oldPassword!: string;
  @IsString() @IsNotEmpty() @MinLength(6) @MaxLength(18) newPassword!:string;
  @IsString() @IsNotEmpty() @MinLength(6) @MaxLength(18) confirmPassword!:string;
}

export class StudentDto {
  @IsString() @IsNotEmpty() studentCode!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsEmail() email!: string;
  @IsMongoId() departmentId!:string;
  @IsMongoId() classId!: string;
}

export class TeacherDto {
  @IsString() @IsNotEmpty() teacherCode!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsMongoId() departmentId!: string;
}

export class PermissionDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateUserDto {
  @ValidateIf(o => o.position === Position.ADMIN) @IsString() @IsNotEmpty() username?: string;
  @IsString() @IsNotEmpty() @MinLength(6) password!: string;
  @ValidateIf(o => o.position === Position.ADMIN) @IsString() @IsNotEmpty() name?: string;
  @IsEnum(Position) position!: Position;
  @ValidateIf(o => [Position.TEACHER, Position.STUDENT].includes(o.position)) @IsString() @IsNotEmpty() referenceCode?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @IsNotEmpty() username?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsEnum(Position) position?: Position;
  @IsOptional() @IsString() referenceCode?: string;
}

export class SetUserPermissionsDto{
  @IsArray() @IsString({each:true}) permissionCodes!:string[];
}