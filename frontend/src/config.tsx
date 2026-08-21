import { ApartmentOutlined, IdcardOutlined, SafetyCertificateOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import type { FieldConfig, ResourceKey } from "./types";

export type ExcelConfig = { exportFile: string; templateFile: string };
export type ResourceConfig = {
  label: string; menuLabel: string; singular: string; description: string;
  icon: ReactNode; endpoint: string; fields: FieldConfig[];
  columns: { key: string; label: string; kind?: "code" | "name" | "position" | "permission" }[];
  excel?: ExcelConfig;
};

const posOpts = [
  { label: "Quản trị viên", value: "admin" },
  { label: "Giáo viên", value: "teacher" },
  { label: "Sinh viên", value: "student" },
];

export const resourceConfigs: Record<ResourceKey, ResourceConfig> = {
  students: {
    label: "Danh sách sinh viên", menuLabel: "Sinh viên", singular: "sinh viên",
    description: "Quản lý sinh viên theo lớp và giáo viên chủ nhiệm",
    icon: <IdcardOutlined />, endpoint: "/students",
    fields: [
      { key: "studentCode", label: "Mã sinh viên", required: true },
      { key: "name", label: "Họ và tên", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      {key:"departmentId",label:"khoa", type:"select",required:true},
      { key: "classId", label: "Lớp", type: "select", required: true },
    ],
    columns: [
      { key: "studentCode", label: "Mã SV", kind: "code" },
      { key: "name", label: "Họ và tên", kind: "name" },
      { key: "email", label: "Email" },
      { key:"schoolClass.department.name",label:"khoa"},
      { key: "schoolClass.code", label: "Mã lớp", kind: "code" },
      { key: "schoolClass.name", label: "Tên lớp" },
      { key: "schoolClass.homeroomTeacher.teacherCode", label: "Mã GVCN", kind: "code" },
      { key: "schoolClass.homeroomTeacher.name", label: "Giáo viên chủ nhiệm" },
    ],
  },
  teachers: {
    label: "Danh sách giáo viên", menuLabel: "Giáo viên", singular: "giáo viên",
    description: "Quản lý hồ sơ và đơn vị công tác của giáo viên",
    icon: <TeamOutlined />, endpoint: "/teachers",
    fields: [
      { key: "teacherCode", label: "Mã giáo viên", required: true },
      { key: "name", label: "Họ và tên", required: true },
      { key: "departmentId", label: "Khoa", type: "select", required: true },
    ],
    columns: [
      { key: "teacherCode", label: "Mã GV", kind: "code" },
      { key: "name", label: "Họ và tên", kind: "name" },
      { key: "department.name", label: "Khoa" },
    ],
  },
  departments: {
    label: "Danh sách khoa", menuLabel: "Khoa", singular: "khoa",
    description: "Quản lý các khoa và đơn vị đào tạo",
    icon: <ApartmentOutlined />, endpoint: "/departments",
    fields: [
      { key: "code", label: "Mã khoa", required: true },
      { key: "name", label: "Tên khoa", required: true },
    ],
    columns: [
      { key: "code", label: "Mã khoa", kind: "code" },
      { key: "name", label: "Tên khoa", kind: "name" },
      { key: "classCount", label: "Tổng số lớp" },
    ],
  },
  classes: {
    label: "Danh sách lớp", menuLabel: "Lớp", singular: "lớp",
    description: "Quản lý lớp, khoa và giáo viên chủ nhiệm",
    icon: <TeamOutlined />, endpoint: "/classes",
    fields: [
      { key: "code", label: "Mã lớp", required: true },
      { key: "name", label: "Tên lớp", required: true },
      { key: "departmentId", label: "Khoa", type: "select", required: true },
      { key: "teacherId", label: "Giáo viên chủ nhiệm", type: "select", required: true },
    ],
    columns: [
      { key: "code", label: "Mã lớp", kind: "code" },
      { key: "name", label: "Tên lớp", kind: "name" },
      { key: "department.name", label: "Khoa" },
      { key: "homeroomTeacher.teacherCode", label: "Mã giáo viên", kind: "code" },
      { key: "homeroomTeacher.name", label: "Giáo viên chủ nhiệm" },
      { key: "studentCount", label: "Tổng số sinh viên" },
    ],
  },
  users: {
    label: "Danh sách user", menuLabel: "User", singular: "tài khoản",
    description: "Tạo tài khoản và liên kết với mã giáo viên hoặc sinh viên",
    icon: <UserOutlined />, endpoint: "/users",
    fields: [
      { key: "username", label: "Tên đăng nhập", required: true },
      { key: "password", label: "Mật khẩu", type: "password", required: true },
      { key: "name", label: "Tên hiển thị", required: true },
      { key: "position", label: "Vai trò", type: "select", options: posOpts, required: true },
      { key: "referenceCode", label: "Mã SV / mã GV" },
    ],
    columns: [
      { key: "username", label: "Tên đăng nhập", kind: "code" },
      { key: "name", label: "Tên hiển thị", kind: "name" },
      { key: "position", label: "Vai trò", kind: "position" },
      { key: "referenceCode", label: "Mã liên kết" },
    ],
  },
  permissions: {
    label: "Danh sách quyền", menuLabel: "Quyền", singular: "quyền",
    description: "Danh mục quyền dùng cho backend Guard và ẩn/hiện chức năng",
    icon: <SafetyCertificateOutlined />, endpoint: "/permissions",
    fields: [
      { key: "code", label: "Mã quyền", required: true },
      { key: "name", label: "Tên quyền", required: true },
      { key: "description", label: "Mô tả" },
    ],
    columns: [
      { key: "code", label: "Mã quyền", kind: "permission" },
      { key: "name", label: "Tên quyền", kind: "name" },
      { key: "description", label: "Mô tả" },
    ],
  },
};