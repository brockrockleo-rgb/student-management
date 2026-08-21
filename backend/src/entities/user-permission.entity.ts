import{Entity,ManyToOne,Unique,}from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "./base.entity";
import { Permission } from "./permission.entity";
import{ User}from "./user.entity";
@Entity({collection:"user_permissions",})
@Unique({properties:["user","permission",],})
export class UserPermission extends BaseEntity{
    @ManyToOne(()=>User)user!:User;
    @ManyToOne(()=>Permission) permission!:Permission;
}










