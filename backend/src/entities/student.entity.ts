import {
  Entity,
  ManyToOne,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "./base.entity";
import { SchoolClass } from "./school-class.entity";

@Entity({ collection: "students" })
@Unique({ properties: ["studentCode"] })
@Unique({ properties: ["email"] })
export class Student extends BaseEntity {
  @Property()
  studentCode!: string;

  @Property()
  name!: string;

  @Property()
  email!: string;

  @ManyToOne(() => SchoolClass)
  schoolClass!: SchoolClass;
}
