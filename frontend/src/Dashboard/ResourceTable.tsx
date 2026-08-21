import { Table } from "antd";
import type { Key } from "react";
import { useMemo } from "react";
import type { DataRecord, ResourceKey } from "../types";
import type { PermissionChecker, ResourceConfig } from "./dashboard.types";
import { createColumns } from "./dashboard.utils";

type Props = {
  config: ResourceConfig;
  activeResource: ResourceKey;
  rows: DataRecord[];
  loading: boolean;
  selected: Key[];
  can: PermissionChecker;
  onSelectedChange: (keys: Key[]) => void;
  onEdit: (record: DataRecord) => void;
};

export default function ResourceTable({
  config,
  activeResource,
  rows,
  loading,
  selected,
  can,
  onSelectedChange,
  onEdit,
}: Props) {
  const columns = useMemo(
    () => createColumns(config, activeResource),
    [activeResource, config]
  );

  const getRowKey = (record: DataRecord): Key => {
    if (record.id) return String(record.id);
    if (record._id) return String(record._id);
    if (record.studentCode) return `student-${String(record.studentCode)}`;
    if (record.teacherCode) return `teacher-${String(record.teacherCode)}`;
    if (record.code) return `${activeResource}-${String(record.code)}`;

    console.error("Record khong co key duy nhat:", record);
    return JSON.stringify(record);
  };

  return (
    <Table<DataRecord>
      className="management-table"
      rowKey={getRowKey}
      loading={loading}
      columns={columns}
      dataSource={rows}
      rowSelection={
        can("delete", activeResource)
          ? {
              selectedRowKeys: selected,
              onChange: onSelectedChange,
              onCell: () => ({ onClick: (event) => event.stopPropagation() }),
            }
          : undefined
      }
      onRow={(record) => ({
        onClick: () => onEdit(record),
      })}
      pagination={{
        pageSize: 10,
        showSizeChanger: false,
        showTotal: (total) => `Tổng ${total}`,
      }}
      scroll={{ x: 760 }}
    />
  );
}