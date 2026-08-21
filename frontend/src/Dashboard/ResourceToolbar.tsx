import {
  DeleteOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Input, Popconfirm, Select, Upload } from "antd";
import type { Key } from "react";
import type { CurrentUser, DataRecord, ResourceKey } from "../types";
import type { PermissionChecker, ResourceConfig } from "./dashboard.types";

type Props = {
  config: ResourceConfig;
  activeResource: ResourceKey;
  user: CurrentUser;
  can: PermissionChecker;
  departments:DataRecord[];
  departmentFilter?:string;
  onDepartmentFilterChange:(value?:string)=>void;
  classes: DataRecord[];
  classFilter?: string;
  onClassFilterChange: (value?: string) => void;
  selected: Key[];
  search: string;
  onSearchChange: (value: string) => void;
  onExport: () => void;
  onDownloadTemplate: () => void;
  onImport: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  onCreate: () => void;
};

export default function ResourceToolbar({
  config,
  activeResource,
  user,
  can,
  departments,
  departmentFilter,
  onDepartmentFilterChange,
  classes,
  classFilter,
  onClassFilterChange,
  selected,
  search,
  onSearchChange,
  onExport,
  onDownloadTemplate,
  onImport,
  onDelete,
  onCreate,
}: Props) {
  const showDepartmentFilter=activeResource==="students"||activeResource==="teachers"||activeResource==="classes";
  const classOptions=departmentFilter?classes.filter((item)=>(item.department as |DataRecord|undefined)?.id===departmentFilter):classes;
  return (
    <div className="table-toolbar">
      <div className="toolbar-left">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={`Tìm ${config.singular}...`}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          style={{ width: 280 }}
        />
        {showDepartmentFilter&&(
          <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="chon khoa"
          value={departmentFilter}
          onChange={(value)=>{
            onDepartmentFilterChange(value);
            onClassFilterChange(undefined);
          }}
          style={{minWidth:230}}
          options={departments.map((item)=>({
            value:item.id,
            label:`${String(item.code)}-${String(item.name)}`,
          }))}/>
        
        )}

        {activeResource === "students" && user.position !== "student" && (
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Chọn lớp"
            value={classFilter}
            onChange={onClassFilterChange}
            style={{ minWidth: 230 }}
            options={classOptions.map((item) => ({
              value: item.id,
              label: `${String(item.code)} - ${String(item.name)}`,
            }))}
          />
        )}

        {selected.length > 0 && (
          <span className="selected-copy">Đã chọn {selected.length} mục</span>
        )}
      </div>

      <div className="toolbar-right">
        {config.excel && can("view", activeResource) && (
          <Button icon={<DownloadOutlined />} onClick={onExport}>
            Xuất Excel
          </Button>
        )}

        {config.excel && can("create", activeResource) && (
          <Button icon={<FileExcelOutlined />} onClick={onDownloadTemplate}>
            File mẫu
          </Button>
        )}

        {config.excel && can("create", activeResource) && (
          <Upload
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              void onImport(file);
              return false;
            }}
          >
            <Button icon={<UploadOutlined />}>Nhập Excel</Button>
          </Upload>
        )}

        {selected.length > 0 && can("delete", activeResource) && (
          <Popconfirm
            title="Xóa các mục đã chọn"
            description="Có chắc chắn muốn xóa?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={onDelete}
          >
            <Button danger icon={<DeleteOutlined />}>
              Xóa đã chọn
            </Button>
          </Popconfirm>
        )}

        {can("create", activeResource) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            Tạo mới
          </Button>
        )}
      </div>
    </div>
  );
}
