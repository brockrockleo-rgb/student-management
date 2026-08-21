import { App as AntApp } from "antd";
import type { Key } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { DataRecord, ResourceKey } from "../types";
import type { ResourceConfig } from "./dashboard.types";

type UseResourceDataOptions = {
  activeResource: ResourceKey;
  config: ResourceConfig;
  enabled?:boolean;
};

export function useResourceData({
  activeResource,
  config,
  enabled=true,
}: UseResourceDataOptions) {
  const { message } = AntApp.useApp();

  const [rows, setRows] = useState<DataRecord[]>([]);
  const [departments, setDepartments] = useState<DataRecord[]>([]);
  const [classes, setClasses] = useState<DataRecord[]>([]);
  const [teachers, setTeachers] = useState<DataRecord[]>([]);
  const [classFilter, setClassFilter] = useState<string>();
  const [departmentFilter,setDepartmentFilter]=useState<string>();
  const [selected, setSelected] = useState<Key[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DataRecord | null>(null);

  const loadRows = async () => {
    if(!enabled||activeResource==="permissions"){
      setRows([]);
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.get<DataRecord[]>(config.endpoint);
      setRows(data);
    } catch (error: any) {
      message.error(
        error.response?.data?.message ?? "Không thể tải dữ liệu",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const { data } = await api.get<{
        departments: DataRecord[];
        classes: DataRecord[];
        teachers: DataRecord[];
      }>("/academic-lookups");

      setDepartments(data.departments);
      setClasses(data.classes);
      setTeachers(data.teachers);
    } catch (error) {
      console.error("Không thể tải dữ liệu lựa chọn:", error);
    }
  };

  useEffect(() => {
    void loadRows();
    void loadLookups();

    setSelected([]);
    setSearch("");
    setDepartmentFilter(undefined);
    setClassFilter(undefined);
  }, [activeResource]);

  const filteredRows=useMemo(()=>rows.filter((row)=>{
    const rowDepartmentId=activeResource==="students"?((row.schoolClass as | DataRecord |undefined)?.department as |DataRecord |undefined)?.id :activeResource==="teachers"||activeResource==="classes"?(row.department as |DataRecord |undefined)?.id:undefined;
    const matchesDepartment= activeResource!=="students"&& activeResource!=="teachers"&& activeResource!=="classes"?true:!departmentFilter||rowDepartmentId===departmentFilter;
    const matchesClass=activeResource!=="students"||!classFilter||(row.schoolClass as |DataRecord |undefined)?.id===classFilter;
    const matchesSearch=JSON.stringify(row).toLowerCase().includes(search.toLowerCase(),);
    return( matchesClass && matchesDepartment && matchesSearch);
  }),[
    activeResource,
    departmentFilter,
    classFilter,
    rows,
    search,
  ],);

  const save = async (values: Record<string, unknown>) => {
    try {
      if (editing) {
        await api.patch(`${config.endpoint}/${editing.id}`, values);
      } else {
        await api.post(config.endpoint, values);
      }

      message.success(
        editing
          ? `Đã cập nhật ${config.singular}`
          : `Đã tạo ${config.singular}`,
      );

      setModalOpen(false);
      await Promise.all([loadRows(), loadLookups()]);
    } catch (error: any) {
      message.error(error.response?.data?.message ?? "Không thể lưu dữ liệu");
    }
  };

  const softDelete = async () => {
    try {
      await api.delete(config.endpoint, {
        data: {
          ids: selected,
        },
      });

      message.success(`Đã chuyển ${selected.length} mục sang deleted = true`);
      setSelected([]);
      await loadRows();
    } catch (error: any) {
      message.error(error.response?.data?.message ?? "Không thể xóa dữ liệu");
    }
  };

  return {
    rows,
    departments,
    classes,
    teachers,
    classFilter,
    setClassFilter,
    departmentFilter,
    setDepartmentFilter,
    selected,
    setSelected,
    search,
    setSearch,
    loading,
    modalOpen,
    setModalOpen,
    editing,
    setEditing,
    filteredRows,
    loadRows,
    loadLookups,
    save,
    softDelete,
  };
}
