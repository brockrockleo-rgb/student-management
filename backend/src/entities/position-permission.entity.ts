import {
  Entity,
  Enum,
  ManyToOne,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "./base.entity";
import { Permission } from "./permission.entity";
import { Position } from "./position.enum";

@Entity({ collection: "position_permissions" })
@Unique({ properties: ["position", "permission"] })
export class PositionPermission extends BaseEntity {
  @Enum(() => Position)
  position!: Position;

  @ManyToOne(() => Permission)
  permission!: Permission;
}