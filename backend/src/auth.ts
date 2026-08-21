import { BadRequestException, Body, Controller, Get, Injectable, Post, Req, UnauthorizedException,Patch } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@mikro-orm/nestjs";
import {EntityManager, EntityRepository,} from "@mikro-orm/mongodb";
import{ObjectId}from "mongodb";
import * as bcrypt from "bcryptjs";
import {ChangePasswordDto, LoginDto } from "./dtos";
import { Position, UserPermission, User } from "./entities";
import { JwtUser, Public } from "./security";
import { map } from "rxjs";
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: EntityRepository<User>,
    @InjectRepository(UserPermission) private readonly userPermissions: EntityRepository<UserPermission>,
    private readonly jwt: JwtService,
    private readonly em:EntityManager,
  ) {}

  async login(dto: LoginDto) {
  const user = await this.users.findOne(
    {
      username: dto.username,
      deleted: false,
    },
    {
      populate: ["teacher", "student"],
    },
  );

  if (
    !user ||
    !(await bcrypt.compare(dto.password, user.passwordHash))
  ) {
    throw new UnauthorizedException("Ten dang nhap hoac mat khau khong dung");
  }

  const rawTokenVersion = Number(user.tokenVersion);
  const tokenVersion = Number.isFinite(rawTokenVersion) ? rawTokenVersion : 0;

  if (user.tokenVersion !== tokenVersion) {
    user.tokenVersion = tokenVersion;
    await this.em.flush();
  }

  const payload: JwtUser = {
    sub: user._id.toHexString(),
    username: user.username,
    name: user.name,
    position: user.position,
    teacherId: user.teacher?.id,
    studentId: user.student?.id,
    referenceCode: user.teacher?.teacherCode ?? user.student?.studentCode,
    tokenVersion,
  };

  console.log("[LOGIN TOKEN]", {
    username: user.username,
    position: user.position,
    tokenVersion,
  });
  const accessToken=await this.jwt.signAsync(payload);
  const currentUser=await this.profile(payload);

  return {
    accessToken,
    user: currentUser,
  };
}




  async changePassword(payload:JwtUser,dto:ChangePasswordDto){
    const user=await this.users.findOne({_id:new ObjectId(payload.sub,),deleted:false,});
    if(!user)
      throw new UnauthorizedException("tai khoan khong ton tai",);
    const oldPasswordMatches=await bcrypt.compare(dto.oldPassword,user.passwordHash,);
    if(!oldPasswordMatches)
      throw new BadRequestException("mat khau cu khong dung");
    if(dto.newPassword!==dto.confirmPassword){
      throw new BadRequestException("mat khau khong khop , hay nhap lai");
    }
    const sameAsOldPassword=await bcrypt.compare(dto.newPassword,user.passwordHash);
    if(sameAsOldPassword)
      throw new BadRequestException("mat khau moi phai khac mat khau cu");
    user.passwordHash=await bcrypt.hash(dto.newPassword,12);
    const currentTokenVersion= Number(user.tokenVersion);
    user.tokenVersion=Number.isFinite(currentTokenVersion)?currentTokenVersion+1:1;
    await this.em.flush();
    return{
      success:true,
      message:"doi mat khau thanh cong",
    };
    
  }

  async profile(payload: JwtUser) {
  const user = await this.users.findOne(
    {
      _id: new ObjectId(payload.sub),
      deleted: false,
    },
    {
      populate: ["teacher", "student"],
    },
  );

  if (!user) {
    throw new UnauthorizedException("Tai khoan khong con ton tai");
  }

  let permissions: string[] = [];

  
  if (user.position === Position.ADMIN) {
    permissions = ["*"];
  } 
  
  else {
    const mappings = await this.userPermissions.find(
      {
        user: user._id,
        deleted: false,
      } as never,
      {
        populate: ["permission"] as never,
      },
    );

    permissions = mappings
      .filter((item: any) => item.permission && !item.permission.deleted)
      .map((item: any) => item.permission.code);
  }

  console.log("[PROFILE]", {
    username: user.username,
    position: user.position,
    permissions,
  });

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    position: user.position,
    teacherId: user.teacher?.id,
    studentId: user.student?.id,
    referenceCode: user.teacher?.teacherCode ?? user.student?.studentCode,
    permissions,
  };
}
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get("me")
  me(@Req() request: { user: JwtUser }) {
    return this.auth.profile(request.user);
  }
  @Patch("change-password")
  changePassword(@Req() request:{user:JwtUser;},
@Body() dto:ChangePasswordDto,){
  return this.auth.changePassword(request.user,dto,);
}
}