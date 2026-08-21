export type Position = "admin" | "teacher" | "student";
export type ResourceKey = "students" | "teachers" | "departments" | "classes" | "users" | "permissions";
export type Action = "view" | "create" | "update" | "delete";

export type CurrentUser = {
  id: string;
  username: string;
  name: string;
  position: Position;
  teacherId?: string;
  studentId?: string;
  referenceCode?: string;
  permissions: string[];
};

export type DataRecord = Record<string, unknown> & {
  id: string;
  deleted: boolean;
};

export type FieldConfig = {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "email" | "number" | "select" | "password";
  options?: { label: string; value: string }[];
};
