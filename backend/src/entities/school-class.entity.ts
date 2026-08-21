import {
  Entity,
  ManyToOne,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "./base.entity";
import { Department } from "./department.entity";
import { Teacher } from "./teacher.entity";

@Entity({ collection: "classes" })
@Unique({ properties: ["code"] })
export class SchoolClass extends BaseEntity {
  @Property()
  code!: string;

  @Property()
  name!: string;

  @ManyToOne(() => Department)
  department!: Department;

  @ManyToOne(() => Teacher, { nullable: true })
  homeroomTeacher?: Teacher;
}
