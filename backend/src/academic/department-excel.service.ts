import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import {
  InjectRepository,
} from "@mikro-orm/nestjs";
import {
  EntityManager,
  EntityRepository,
} from "@mikro-orm/mongodb";
import { Department } from "../entities";
import type {
  ImportDepartmentRow,
  ImportExcelError,
  ImportExcelResult,
  UploadedExcelFile,
} from "./academic.types";
import {
  createExcelBuffer,
  normalizeCode,
  readExcelRows,
} from "./excel.utils";

@Injectable()
export class DepartmentExcelService {
  constructor(
    private readonly em: EntityManager,

    @InjectRepository(Department)
    private readonly departments:
      EntityRepository<Department>,
  ) {}

  async exportExcel() {
    const departments =
      await this.departments.find(
        {
          deleted: false,
        },
        {
          orderBy: {
            createdAt: "ASC",
          },
        },
      );

    return createExcelBuffer({
      name: "Danh sách khoa",

      columns: [
        {
          header: "Mã khoa",
          key: "code",
          width: 18,
        },
        {
          header: "Tên khoa",
          key: "name",
          width: 35,
        },
      ],

      rows: departments.map(
        (department) => ({
          code: department.code,
          name: department.name,
        }),
      ),
    });
  }

  createTemplate() {
    return createExcelBuffer({
      name: "Nhập khoa",

      columns: [
        {
          header: "Mã khoa",
          key: "code",
          width: 18,
        },
        {
          header: "Tên khoa",
          key: "name",
          width: 35,
        },
      ],

      rows: [],
    });
  }

  async importExcel(
    file: UploadedExcelFile,
  ): Promise<ImportExcelResult> {
    const rawRows =
      await readExcelRows(
        file,
        "Nhập khoa",
        [
          "Mã khoa",
          "Tên khoa",
        ],
      );

    if (!rawRows.length) {
      throw new BadRequestException(
        "File Excel không có dữ liệu khoa",
      );
    }

    const rows:
      ImportDepartmentRow[] =
      rawRows.map(
        ({ row, values }) => ({
          row,
          code:
            normalizeCode(values[0]),
          name: values[1].trim(),
        }),
      );

    const existing =
      await this.departments.find({});

    const existingCodes =
      new Set(
        existing.map((department) =>
          normalizeCode(
            department.code,
          ),
        ),
      );

    const fileCodes =
      new Set<string>();

    const errors:
      ImportExcelError[] = [];

    const importedCodes:
      string[] = [];

    for (const row of rows) {
      const rowErrors:
        string[] = [];

      if (!row.code) {
        rowErrors.push(
          "thiếu mã khoa",
        );
      }

      if (!row.name) {
        rowErrors.push(
          "thiếu tên khoa",
        );
      }

      if (
        row.code &&
        existingCodes.has(row.code)
      ) {
        rowErrors.push(
          "mã khoa đã tồn tại",
        );
      }

      if (
        row.code &&
        fileCodes.has(row.code)
      ) {
        rowErrors.push(
          "mã khoa bị lặp trong file",
        );
      }

      if (row.code) {
        fileCodes.add(row.code);
      }

      if (rowErrors.length) {
        errors.push({
          row: row.row,
          message:
            rowErrors.join("; "),
        });

        continue;
      }

      const entity =
        this.departments.create({
          code: row.code,
          name: row.name,
        });

      this.em.persist(entity);

      importedCodes.push(
        row.code,
      );
    }

    if (importedCodes.length) {
      await this.em.flush();
    }

    return {
      imported:
        importedCodes.length,
      skipped: errors.length,
      importedCodes,
      errors,
    };
  }
}