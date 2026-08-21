import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import mikroOrmConfig from "./mikro-orm.config";
import { entities } from "./entities";
import {
  AcademicAccessService,
  AcademicLookupsController,
  AcademicLookupsService,
  ClassExcelService,
  ClassesController,
  ClassesService,
  DepartmentExcelService,
  DepartmentsController,
  DepartmentsService,
  StudentExcelService,
  StudentsController,
  StudentsService,
  TeacherExcelService,
  TeachersController,
  TeachersService,
} from "./academic";
import { AuthController, AuthService } from "./auth";
import { BootstrapService } from "./bootstrap.service";
import { EntityUtilsService } from "./common";
import { PermissionsController, PermissionsService } from "./permissions";
import { JwtAuthGuard, PermissionsGuard } from "./security";
import { UsersController, UsersService } from "./users";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    MikroOrmModule.forFeature(entities),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "development-secret-change-me",
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? "8h") as never,
      },
    }),
  ],
  controllers: [
    AuthController,
    StudentsController,
    TeachersController,
    DepartmentsController,
    ClassesController,
    AcademicLookupsController,
    UsersController,
    PermissionsController,
  ],
  providers: [
    AuthService,
    EntityUtilsService,
    AcademicAccessService,
    StudentsService,
    StudentExcelService,
    TeachersService,
    TeacherExcelService,
    DepartmentsService,
    DepartmentExcelService,
    ClassesService,
    ClassExcelService,
    AcademicLookupsService,
    UsersService,
    PermissionsService,
    BootstrapService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}