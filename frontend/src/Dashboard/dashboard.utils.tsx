import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DataRecord, ResourceKey } from "../types";
import type { ResourceConfig } from "./dashboard.types";

export const roleLabels = {
  admin: "Quản trị viên",
  teacher: "Giáo viên",
  student: "Sinh viên",
};

export function nested(record: DataRecord, path: string) {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        (value as Record<string, unknown> | undefined)?.[key],
      record,
    );
}

export function createColumns(
  config: ResourceConfig,
  activeResource: ResourceKey,
): ColumnsType<DataRecord> {
  return config.columns.map((column) => ({
    title: column.label,
    key: column.key,
    ellipsis: true,
    render: (_, record) => {
      let value = nested(record, column.key);

      if (activeResource === "users" && column.key === "referenceCode") {
        value =
          (record.teacher as DataRecord | undefined)?.teacherCode ??
          (record.student as DataRecord | undefined)?.studentCode ??
          "—";
      }

      if (column.kind === "code") {
        return <span className="entity-code">{String(value ?? "—")}</span>;
      }

      if (column.kind === "name") {
        return <span className="entity-name">{String(value ?? "—")}</span>;
      }

      if (column.kind === "permission") {
        return <Tag color="blue">{String(value)}</Tag>;
      }

      if (column.kind === "position") {
        return (
          <Tag
            color={
              value === "admin"
                ? "red"
                : value === "teacher"
                  ? "gold"
                  : "green"
            }
          >
            {roleLabels[value as keyof typeof roleLabels] ?? String(value ?? "—")}
          </Tag>
        );
      }

      return String(value ?? "—");
    },
  }));
}
