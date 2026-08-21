import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { SetUserPermissionsDto } from "../dtos";
import { RequirePermissions } from "../security";
import { PermissionsService } from "./permissions.service";

@Controller("permissions")
@RequirePermissions("permissions.manage")
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get("catalog")
  catalog() {
    return this.permissions.catalog();
  }

  @Get("users")
  users() {
    return this.permissions.usersWithPermissions();
  }

  @Patch("users/:userId")
  setUserPermissions(
    @Param("userId") userId: string,
    @Body() dto: SetUserPermissionsDto,
  ) {
    return this.permissions.setUserPermissions(
      userId,
      dto.permissionCodes,
    );
  }
}