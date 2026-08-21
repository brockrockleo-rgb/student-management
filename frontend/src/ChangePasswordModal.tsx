import { Form, Input, message, Modal } from "antd";
import { useState } from "react";
import { changePassword } from "./api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type ChangePasswordForm = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ChangePasswordModal({ open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm<ChangePasswordForm>();
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleSubmit = async (values: ChangePasswordForm) => {
    try {
      setLoading(true);
      await changePassword(values.oldPassword, values.newPassword, values.confirmPassword);
      message.success("Doi mat khau thanh cong. Vui long dang nhap lai.");
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ?? "Khong the doi mat khau";
      message.error(Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Doi mat khau"
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      okText="Cap nhat mat khau"
      cancelText="Huy"
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          name="oldPassword"
          label="Mat khau cu"
          rules={[{ required: true, message: "Vui long nhap mat khau cu" }]}
        >
          <Input.Password placeholder="Nhap mat khau hien tai" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="Mat khau moi"
          rules={[
            { required: true, message: "Vui long nhap mat khau moi" },
            { min: 6, message: "Mat khau phai co it nhat 6 ky tu" },
            { max: 18, message: "Mat khau toi da 18 ky tu" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (value && getFieldValue("oldPassword") === value) {
                  return Promise.reject(new Error("Mat khau moi khong duoc trung mat khau cu"));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input.Password placeholder="Nhap mat khau moi" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Nhap lai mat khau moi"
          dependencies={["newPassword"]}
          hasFeedback
          rules={[
            { required: true, message: "Vui long nhap lai mat khau moi" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Hai lan nhap mat khau khong giong nhau"));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Nhap lai mat khau moi" />
        </Form.Item>
      </Form>
    </Modal>
  );
}