import {
  Entity,
  ManyToOne,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "./base.entity";
import { Department } from "./department.entity";

@Entity({ collection: "teachers" })
@Unique({ properties: ["teacherCode"] })
export class Teacher extends BaseEntity {
  @Property()
  teacherCode!: string;

  @Property()
  name!: string;

  @ManyToOne(() => Department)
  department!: Department;
}
