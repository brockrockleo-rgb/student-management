import { Entity, Property, Unique } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "./base.entity";

@Entity({ collection: "departments" })
@Unique({ properties: ["code"] })
export class Department extends BaseEntity {
  @Property()
  code!: string;

  @Property()
  name!: string;
}
