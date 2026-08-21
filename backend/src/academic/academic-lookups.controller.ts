import { Controller, Get, Req } from "@nestjs/common";
import { RequirePermissions } from "../security";
import type { AuthRequest } from "./academic.types";
import { AcademicLookupsService } from "./academic-lookups.service";

@Controller("academic-lookups")
export class AcademicLookupsController {
  constructor(private readonly lookups: AcademicLookupsService) {}

  @Get()
  @RequirePermissions("students.view")
  get(@Req() req: AuthRequest) {
    return this.lookups.get(req.user);
  }
}
