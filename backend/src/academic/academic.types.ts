import type { JwtUser } from "../security";

export type AuthRequest = {
  user: JwtUser;
};

export type UploadedExcelFile = {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
};

export type ImportStudentRow = {
  row: number;
  studentCode: string;
  name: string;
  email: string;
  departmentCode:string;
  classCode: string;
};
export type ImportDepartmentRow={
  row:number;
  code:string;
  name:string;
};
export type ImportTeacherRow={
  row:number;
  teacherCode:string;
  name:string;
  departmentCode:string;
};
export type ImportClassRow={
  row:number;
  code:string;
  name:string;
  departmentCode:string;
  teacherCode:string;
};
export type ImportExcelError={
  row: number;
  message:string;
  
};
export type ImportExcelResult={
  imported: number;
  skipped:number;
  importedCodes:string[];
  errors:ImportExcelError[];
  
};


export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";


