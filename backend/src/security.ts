import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository, ObjectId } from "@mikro-orm/mongodb";
import { Position,User, UserPermission } from "./entities";

export const IS_PUBLIC_KEY = "isPublic";
export const PERMISSIONS_KEY = "permissions";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

export type JwtUser = {
  sub: string;
  username: string;
  name: string;
  position: Position;
  teacherId?: string;
  studentId?: string;
  referenceCode?: string;
  tokenVersion:number;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector:Reflector,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users:EntityRepository<User>,
  ){}
  async canActivate(context:ExecutionContext,){
    const isPublic=this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,[context.getHandler(),context.getClass],);
    if (isPublic)
      return true;
    const request=context.switchToHttp().getRequest();
    const [type,token]=request.headers.authorization?.split(" ")??[];
    if(type!=="Bearer"||!token)
      throw new UnauthorizedException("ban chua dang nhap");
    try {const payload=await this.jwt.verifyAsync<JwtUser>(token);
      if(!ObjectId.isValid(payload.sub,))
        throw new UnauthorizedException("token ko hop le");
      const user=await this.users.findOne(
        {
          _id: new ObjectId(payload.sub),
          deleted:false,
        },{
          populate:["teacher","student"],
        },
      );
      if (!user){
        throw new UnauthorizedException("tai khoan ko con ton tai");
      }
     const rawJwtVersion = Number(payload.tokenVersion);
const rawDbVersion = Number(user.tokenVersion);

const tokenVersion = Number.isFinite(rawJwtVersion) ? rawJwtVersion : 0;
const userTokenVersion = Number.isFinite(rawDbVersion) ? rawDbVersion : 0;

console.log("[CHECK TOKEN]", {
  username: user.username,
  jwtVersion: tokenVersion,
  dbVersion: userTokenVersion,
  rawDbVersion: user.tokenVersion,
});

if (tokenVersion !== userTokenVersion) {
  throw new UnauthorizedException("Phien dang nhap het hieu luc");
}
      request.user={
        sub:user._id.toHexString(),
        username:user.username,
        name:user.name,
        position:user.position,
        teacherId:user.teacher?.id,
        studentId:user.student?.id,
        referenceCode:user.teacher?.teacherCode??user.student?.studentCode,
        tokenVersion:userTokenVersion,
      }satisfies JwtUser;
      return true;
    }catch(error){
      if(error instanceof UnauthorizedException)
        throw error;
      throw new UnauthorizedException("token ko hop le hoac da het thoi gian");
    }
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(UserPermission) 
    private readonly userPermissions: EntityRepository<UserPermission>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(), 
      context.getClass()
    ]);

    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest().user as JwtUser;

    if (user.position === Position.ADMIN) {
      return true;
    }

    const mappings = await this.userPermissions.find(
      {
        user: new ObjectId(user.sub),
        deleted: false,
      } as never,
      {
        populate: ["permission"] as never,
      },
    );

    const available = new Set(
      mappings.map((item: any) => item.permission.code)
    );

    return required.every((permission) => available.has(permission));
  }
}