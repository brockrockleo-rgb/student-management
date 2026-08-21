import {
  Entity,
  Enum,
  OneToOne,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "./base.entity";
import { Position } from "./position.enum";
import { Student } from "./student.entity";
import { Teacher } from "./teacher.entity";

@Entity({ collection: "users" })
@Unique({ properties: ["username"] })
@Unique({ properties: ["teacher"], options: { sparse: true } })
@Unique({ properties: ["student"], options: { sparse: true } })
export class User extends BaseEntity {

  @Property()
  username!: string;

  @Property({ hidden: true })
  passwordHash!: string;

  @Property()
  name!: string;

  @Enum(() => Position)
  position!: Position;
  @Property() permissionsInitialized: boolean=false;
  @Property({default:0,}) tokenVersion: number=0;

  @OneToOne(() => Teacher, { nullable: true })
  teacher?: Teacher;

  @OneToOne(() => Student, { nullable: true })
  student?: Student;
}