import { Form, Input, InputNumber, Modal, Select } from "antd";
import { useEffect } from "react";
import type { DataRecord, FieldConfig, Position } from "./types";

type Props = {
  open: boolean; singular: string; fields: FieldConfig[]; record: DataRecord | null; readOnly: boolean;
  departments: DataRecord[]; classes: DataRecord[]; teachers: DataRecord[];
  onClose: () => void; onSave: (values: Record<string, unknown>) => Promise<void>;
};

export default function EntityModal({ open, singular, fields, record, readOnly, departments, classes, teachers, onClose, onSave }: Props) {
  const [form] = Form.useForm();
  const position = Form.useWatch<Position>("position", form);
  const departmentId = Form.useWatch<string>("departmentId", form);

  const isStudentForm = fields.some((f) => f.key === "studentCode");
  const isClassForm = fields.some((f) => f.key === "teacherId");
  const isUserForm = fields.some((f) => f.key === "position");

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (!record) return;

    const schoolClass = record.schoolClass as DataRecord | undefined;
    const schoolClassDepartment = schoolClass?.department as DataRecord | undefined;
    const directDepartment = record.department as DataRecord | undefined;
    const homeroomTeacher = record.homeroomTeacher as DataRecord | undefined;
    const linkedTeacher = record.teacher as DataRecord | undefined;
    const linkedStudent = record.student as DataRecord | undefined;

    form.setFieldsValue({
      ...record,
      departmentId: getId( directDepartment) ??getId( schoolClassDepartment),
      classId: schoolClass?.id,
      teacherId: getId(homeroomTeacher),
      referenceCode: linkedTeacher?.teacherCode ?? linkedStudent?.studentCode,
      password: undefined,
    });
  }, [open, record, form]);


  const getId=(value:unknown,):string|undefined=>{
    if(!value)
      return undefined;
    if(typeof value==="string")
      return value;
    if(typeof value==="object")
    {
      const data=value as DataRecord;
      if(data.id){
        return String(data.id);
      }

    }
    return undefined;
  }




  const visibleFields = fields.filter(({ key }) => {
    if (!isUserForm) return true;
    if (["username", "name"].includes(key)) return position === "admin";
    if (key === "referenceCode") return position === "teacher" || position === "student";
    return true;
  });

  const optionsFor = (field: FieldConfig) => {
    if (field.key === "departmentId") return departments.map((d) => ({ value: d.id, label: `${String(d.code)} - ${String(d.name)}` }));
    if (field.key === "classId") return !departmentId ?[]: classes.filter((c) => departmentId && (c.department as DataRecord | undefined)?.id === departmentId).map((c) => ({ value: c.id, label: `${String(c.code)} - ${String(c.name)}` }));
if (field.key === "teacherId") return !departmentId ? [] : teachers.filter(t => String((t.department as DataRecord | undefined)?.id ?? "") === String(departmentId)).map(t => ({ value: String(t.id), label: `${String(t.teacherCode)} - ${String(t.name)}` }));
    return field.options;
  };

  const onSelectedChange = (field: FieldConfig) => {
    if (field.key !== "departmentId") return;
    if (isStudentForm) form.setFieldValue("classId", undefined);
    if (isClassForm) form.setFieldValue("teacherId", undefined);
  };

  const isSelectDisabled = (field: FieldConfig) => (isStudentForm && field.key === "classId" && !departmentId) || (isClassForm && field.key === "teacherId" && !departmentId);

  return (
    <Modal
      title={`${record ? (readOnly ? "Chi tiết" : "Cập nhật") : "Tạo"} ${singular}`}
      open={open} onCancel={onClose} onOk={() => form.validateFields().then(onSave)}
      okText={record ? "Lưu thay đổi" : "Tạo mới"} cancelText="Đóng"
      okButtonProps={{ style: readOnly ? { display: "none" } : undefined }} forceRender
    >
      {readOnly && <div className="modal-hint">Bạn có quyền xem nhưng không có quyền chỉnh sửa dữ liệu này.</div>}
      {isStudentForm && <div className="modal-hint">Chọn khoa trước. Danh sách lớp chỉ hiển thị các lớp thuộc khoa đã chọn.</div>}
      {isUserForm && (position === "teacher" || position === "student") && (
        <div className="modal-hint">
          {record ? (
            <>Tên đăng nhập: <strong>{String(record.username)}</strong> - Tên hiển thị: <strong>{String(record.name)}</strong></>
          ) : (
            <>Tên đăng nhập và tên hiển thị tạo tự động<br />Sinh viên: <strong>username = MSSV</strong><br />Giáo viên: <strong>username = mã giáo viên</strong></>
          )}
        </div>
      )}

      <Form form={form} layout="vertical" disabled={readOnly} preserve={false}>
        {visibleFields.map((field) => {
          let label = field.label;
          if (isUserForm && field.key === "referenceCode") {
            if (position === "student") label = "Mã sinh viên";
            if (position === "teacher") label = "Mã giáo viên";
          }
          const lowerLabel = label.toLowerCase();
          const required = field.key === "referenceCode" ? position !== "admin" : field.required && !(record && field.key === "password");

          return (
            <Form.Item key={field.key} name={field.key} label={label} rules={required ? [{ required: true, message: `Nhập ${lowerLabel}` }] : undefined}>
              {field.type === "select" ? (
                <Select showSearch optionFilterProp="label" options={optionsFor(field)} disabled={Boolean(isSelectDisabled(field))}
                  placeholder={(isStudentForm && field.key === "classId" && !departmentId) || (isClassForm && field.key === "teacherId" && !departmentId) ? "Chọn khoa trước" : `Chọn ${lowerLabel}`}
                  onChange={() => onSelectedChange(field)} />
              ) : field.type === "number" ? (
                <InputNumber min={1} max={10} style={{ width: "100%" }} />
              ) : field.type === "password" ? (
                <Input.Password placeholder={record ? "Để trống nếu không đổi mật khẩu" : `Nhập ${lowerLabel}`} />
              ) : (
                <Input type={field.type === "email" ? "email" : "text"} placeholder={`Nhập ${lowerLabel}`} />
              )}
            </Form.Item>
          );
        })}
      </Form>
    </Modal>
  );
}