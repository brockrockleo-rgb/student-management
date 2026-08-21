import { Entity, Property, Unique } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "./base.entity";

@Entity({ collection: "permissions" })
@Unique({ properties: ["code"] })
export class Permission extends BaseEntity {
  @Property()
  code!: string;

  @Property()
  name!: string;

  @Property({ nullable: true })
  description?: string;
}
