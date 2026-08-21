import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Layout, Tooltip } from "antd";
import { logout } from "../api";
import type { CurrentUser } from "../types";
import { roleLabels } from "./dashboard.utils";

const { Header } = Layout;

type Props = {
  collapsed: boolean;
  user: CurrentUser;
  onToggleCollapsed: () => void;
  onLogout: () => void;
};

export default function DashboardHeader({
  collapsed,
  user,
  onToggleCollapsed,
  onLogout,
}: Props) {
  return (
    <Header className="app-header">
      <div className="header-left">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggleCollapsed}
        />

        <div className="header-context">
          
        </div>
      </div>

      <div className="header-actions">
        <div className="user-chip">
          <Avatar
            style={{ background: "#e8f1ff", color: "#245fb8" }}
            icon={<UserOutlined />}
          />

          <div className="user-copy">
            <strong>{user.name}</strong>
            <span>{roleLabels[user.position]}</span>
          </div>
        </div>

        <Tooltip title="Đăng xuất">
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              onLogout();
            }}
          />
        </Tooltip>
      </div>
    </Header>
  );
}
