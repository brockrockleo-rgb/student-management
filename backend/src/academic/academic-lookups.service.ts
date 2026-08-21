import { Injectable } from "@nestjs/common";
import { Position } from "../entities";
import type { JwtUser } from "../security";
import { ClassesService } from "./classes.service";
import { DepartmentsService } from "./departments.service";
import { TeachersService } from "./teachers.service";

@Injectable()
export class AcademicLookupsService {
  constructor(
    private readonly classes: ClassesService,
    private readonly departments: DepartmentsService,
    private readonly teachers: TeachersService,
  ) {}

  async get(jwt: JwtUser) {
    const classes = await this.classes.list(jwt);
    const departments =
      jwt.position === Position.ADMIN
        ? await this.departments.list()
        : [
            ...new Map(
              classes
                .filter((item) => Boolean(item.department))
                .map((item) => [item.department.id, item.department]),
            ).values(),
          ];
    const teachers =
      jwt.position === Position.ADMIN ? await this.teachers.list() : [];

    return { departments, classes, teachers };
  }
}
