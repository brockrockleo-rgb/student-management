import { OptionalProps } from "@mikro-orm/core";
import {
  PrimaryKey,
  Property,
  SerializedPrimaryKey,
} from "@mikro-orm/decorators/legacy";



import { ObjectId } from "mongodb";

export abstract class BaseEntity {
  [OptionalProps]?: "_id" | "id" | "deleted" | "createdAt" | "updatedAt";

  @PrimaryKey()
  _id: ObjectId = new ObjectId();

  @SerializedPrimaryKey()
  id!: string;

  @Property()
  deleted = false;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
