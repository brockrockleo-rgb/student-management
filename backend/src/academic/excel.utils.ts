import { BadRequestException } from "@nestjs/common";
import { Workbook, Worksheet } from "exceljs";
import type { UploadedExcelFile } from "./academic.types";

export type ExcelColum = {
    header: string;
    key: string;
    width: number;
};
export type ExcelSheetData = {
    name: string;
    columns: ExcelColum[];
    rows: Record<string, unknown>[];

};
export type ReadExcelRow = {
    row: number;
    values: string[];
};

function columnName(columnNumber: number) {
    let name = "";
    let number = columnNumber;

    while (number > 0) {
        const remainder = (number - 1) % 26;
        name = String.fromCharCode(65 + remainder) + name;
        number = Math.floor((number - 1) / 26);
    }

    return name;
}

function styleSheet(sheet: Worksheet, numberOfColumns: number) {
    const header = sheet.getRow(1);

    header.height = 24;
    header.font = {
        bold: true,
        color: {
            argb: "FFFFFFFF",
        },
    };

    header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FF246CC7",
        },
    };

    header.alignment = {
        vertical: "middle",
        horizontal: "center",
    };

    sheet.autoFilter = `A1:${columnName(numberOfColumns)}1`;

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            row.alignment = {
                vertical: "middle",
            };
        }
    });
}

function addSheet(workbook: Workbook, data: ExcelSheetData) {
    const sheet = workbook.addWorksheet(data.name, {
        views: [
            {
                state: "frozen",
                ySplit: 1,
            },
        ],
    });

    sheet.columns = data.columns;
    sheet.addRows(data.rows);
    styleSheet(sheet,data.columns.length);

    return sheet;
}

export async function createExcelBuffer(
    mainSheet: ExcelSheetData,
    extraSheets: ExcelSheetData[] = [],
) {
    const workbook = new Workbook();

    workbook.creator = "student management";
    workbook.created = new Date();

    addSheet(workbook, mainSheet);
    extraSheets.forEach((sheet) => addSheet(workbook, sheet));

    return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function readExcelRows(
    file: UploadedExcelFile,
    expectedHeaders: string[],
): Promise<ReadExcelRow[]> {
    const fileName = file?.originalname?.trim().toLowerCase() ?? "";

    if (
        !file ||
        !file.buffer ||
        file.buffer.length === 0 ||
        !fileName.endsWith(".xlsx")
    ) {
        throw new BadRequestException(
            "File phai co dang .xlsx",
        );
    }

    const workbook = new Workbook();

   try {
  const excelBuffer =
    file.buffer as unknown as Parameters<
      typeof workbook.xlsx.load
    >[0];

  await workbook.xlsx.load(
    excelBuffer,
  );
} catch (error) {
  console.error(
    "Lỗi đọc file Excel:",
    error,
  );

  throw new BadRequestException(
    "Không đọc được file Excel hoặc file không hợp lệ",
  );
}

    const sheet = workbook.worksheets[0];
   
    if (!sheet) {
        throw new BadRequestException(
            `File excel ko co noi dung`,
        );
    }

    const actualHeaders = expectedHeaders.map((_, index) =>
        sheet.getRow(1).getCell(index + 1).text.trim(),
    );

    const invalidHeader = expectedHeaders.some(
        (header, index) => actualHeaders[index] !== header,
    );

    if (invalidHeader) {
        throw new BadRequestException(
            `Tiêu đề phải là: ${expectedHeaders.join(" | ")}`,
        );
    }

    const rows: ReadExcelRow[] = [];

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            return;
        }

        const values = expectedHeaders.map((_, index) =>
            row.getCell(index + 1).text.trim(),
        );

        if (values.every((value) => !value)) {
            return;
        }

        rows.push({
            row: rowNumber,
            values,
        });
    });

    return rows;
}

export function normalizeCode(value: unknown) {
    return String(value ?? "")
        .trim()
        .toUpperCase();
}