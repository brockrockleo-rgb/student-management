import { BookOutlined, CheckCircleOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { App as AntApp, Button, Form, Input } from "antd";
import { useState } from "react";
import { login } from "./api";
import type { CurrentUser } from "./types";
import { useNavigate } from "react-router-dom";

export default function LoginPage({ onLogin }: { onLogin: (user: CurrentUser) => void }) {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const navigate=useNavigate();
  const submit = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      onLogin(await login(values.username.trim(), values.password));
      message.success("Đăng nhập thành công");
      navigate("/students",{replace: true});
    } catch (error: any) {
      message.error(error.response?.data?.message ?? "Không thể đăng nhập");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      
      <section className="login-panel">
        <div className="login-card">
          <h2>Đăng nhập</h2>
          <p className="login-subtitle">Sử dụng tài khoản đã được quản trị viên cấp.</p>
          <Form layout="vertical" onFinish={submit} initialValues={{ username: "admin", password: "admin123" }}>
            <Form.Item label="Tên đăng nhập" name="username" rules={[{ required: true, message: "Nhập tên đăng nhập" }]}>
              <Input prefix={<UserOutlined />} placeholder="Ví dụ: SV001" autoComplete="username" />
            </Form.Item>
            <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: "Nhập mật khẩu" }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>Đăng nhập hệ thống</Button>
          </Form>
          <div className="demo-accounts">
            <div className="demo-accounts-title">Tài khoản khởi tạo</div>
            <div className="demo-account-row"><span>Admin</span><code>admin / admin123</code></div>
            <div className="demo-account-row"><span>Giáo viên</span><code>teacher1 / teacher123</code></div>
            <div className="demo-account-row"><span>Sinh viên</span><code>student1 / student123</code></div>
          </div>
        </div>
      </section>
    </main>
  );
}
