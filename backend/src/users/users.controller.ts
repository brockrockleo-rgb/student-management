import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CreateUserDto, IdsDto, UpdateUserDto } from "../dtos";
import { RequirePermissions } from "../security";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions("users.view")
  list() {
    return this.users.list();
  }

  @Post()
  @RequirePermissions("users.create")
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("users.update")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete()
  @RequirePermissions("users.delete")
  delete(@Body() dto: IdsDto) {
    return this.users.delete(dto.ids);
  }
}
