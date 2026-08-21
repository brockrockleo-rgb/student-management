import { BookOutlined,LockOutlined } from "@ant-design/icons";
import { Button, Layout, Menu } from "antd";
import { resourceConfigs } from "../config";
import type { ResourceKey } from "../types";

const { Sider } = Layout;

type Props = {
  collapsed: boolean;
  activeResource: ResourceKey;
  visibleResources: ResourceKey[];
  onNavigate: (resource: ResourceKey) => void;
  showChangePassword:boolean;
  onChangePassword:()=>void;

};


export default function DashboardSidebar({
  collapsed,
  activeResource,
  visibleResources,
  onNavigate,
  showChangePassword,
  onChangePassword,
}: Props) {
  return (
    <Sider
      className="app-sider"
      width={244}
      collapsedWidth={82}
      collapsed={collapsed}
      trigger={null}
    >
      <div className="sider-brand">
        <span className="sider-logo">
          <BookOutlined />
        </span>

        {!collapsed && (
          <span className="sider-title">
            Student Management
          </span>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[activeResource]}
        items={visibleResources.map((key) => ({
          key,
          icon: resourceConfigs[key].icon,
          label: resourceConfigs[key].menuLabel,
        }))}
        onClick={({ key }) => onNavigate(key as ResourceKey)}
      />
      {showChangePassword &&(
        <div className="sider-footer">
          <Button type="text"
          className="change-password-button"
          icon={<LockOutlined/>}
          onClick={onChangePassword}
          >{!collapsed&& "Đổi mật khẩu "}</Button>
        </div>

      )}
    </Sider>
  );
}
