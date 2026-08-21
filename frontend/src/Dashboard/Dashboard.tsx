import { Layout } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resourceConfigs } from "../config";
import EntityModal from "../EntityModal";
import type { Action, CurrentUser, DataRecord, ResourceKey } from "../types";
import DashboardHeader from "./DashboardHeader";
import DashboardOverview from "./DashboardOverview";
import DashboardSidebar from "./DashboardSidebar";
import ResourceTable from "./ResourceTable";
import ResourceToolbar from "./ResourceToolbar";
import PermissionManagement from "./PermissionManagement";
import { useExcelActions } from "./useExcelActions";
import { useResourceData } from "./useResourceData";
import ChangePasswordModal from "../ChangePasswordModal";
const { Content } = Layout;

type Props = {
  user: CurrentUser;
  onLogout: () => void;
};

export default function Dashboard({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathKey = location.pathname.split("/")[1] as ResourceKey;
  const [collapsed, setCollapsed] = useState(false);
  const [changePasswordOpen,setChangePasswordOpen]=useState(false);
const permissions=user.permissions??[];
  const can = (action: Action, resource: ResourceKey) =>
    permissions.includes("*")|| permissions.includes(`${resource}.${action}`);

  const visibleResources = (
    Object.keys(resourceConfigs) as ResourceKey[]
  ).filter((key) => can("view", key));

  const activeResource = visibleResources.includes(pathKey)
    ? pathKey
    : (visibleResources[0] ?? "students");

  const config = resourceConfigs[activeResource] || {};

  const resource = useResourceData({
    activeResource,
    config,
  });

  const excel = useExcelActions({
    activeResource,
    config,
    classFilter: resource.classFilter,
    loadRows: resource.loadRows,
    loadLookups: resource.loadLookups,
  });

  const currentClass =
    activeResource === "students" && user.position === "student"
      ? (resource.rows[0]?.schoolClass as DataRecord | undefined)
      : undefined;

  return (
    <Layout className="app-shell">
      <DashboardSidebar
        collapsed={collapsed}
        activeResource={activeResource}
        visibleResources={visibleResources}
        showChangePassword={user.position==="teacher"||user.position==="student"}
        onChangePassword={()=>setChangePasswordOpen(true)}
        onNavigate={(key) => navigate(`/${key}`)}
      />

      <Layout className={`app-layout ${collapsed ? "collapsed" : ""}`}>
        <DashboardHeader
          collapsed={collapsed}
          user={user}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          onLogout={onLogout}
        />

        <Content className="app-content">
          {activeResource !== "permissions" && (
            <DashboardOverview
              config={config}
              activeResource={activeResource}
              user={user}
              currentClass={currentClass}
              rowsCount={resource.rows.length}
              can={can}
            />
          )}

          {activeResource === "permissions" ? (
            <PermissionManagement />
          ) : (
            <section className="table-card">
              <ResourceToolbar
                config={config}
                activeResource={activeResource}
                user={user}
                can={can}
                departments={resource.departments}
                departmentFilter={resource.departmentFilter}
                onDepartmentFilterChange={(value)=>{
                  resource.setDepartmentFilter(value);
                  if(activeResource==="students"){
                    resource.setClassFilter(undefined);
                  }
                }}
                classes={resource.classes}
                classFilter={resource.classFilter}
                onClassFilterChange={resource.setClassFilter}
                selected={resource.selected}
                search={resource.search}
                onSearchChange={resource.setSearch}
                onExport={() => void excel.downloadExcel(false)}
                onDownloadTemplate={() => void excel.downloadExcel(true)}
                onImport={excel.importExcel}
                onDelete={resource.softDelete}
                onCreate={() => {
                  resource.setEditing(null);
                  resource.setModalOpen(true);
                }}
              />

              <ResourceTable
                config={config}
                activeResource={activeResource}
                rows={resource.filteredRows}
                loading={resource.loading}
                selected={resource.selected}
                can={can}
                onSelectedChange={resource.setSelected}
                onEdit={(record) => {
                  resource.setEditing(record);
                  resource.setModalOpen(true);
                }}
              />
            </section>
          )}
        </Content>
      </Layout>

      
      {visibleResources.length > 0 && activeResource !== "permissions" && (
        <EntityModal
          open={resource.modalOpen}
          singular={config.singular}
          fields={config.fields}
          record={resource.editing}
          readOnly={Boolean(
            resource.editing && !can("update", activeResource),
          )}
          departments={resource.departments}
          classes={resource.classes}
          teachers={resource.teachers}
          onClose={() => resource.setModalOpen(false)}
          onSave={resource.save}
        />
      )}

      <ChangePasswordModal 
      open={changePasswordOpen}
      onClose={()=>setChangePasswordOpen(false)}
      onSuccess={()=>{setChangePasswordOpen(false);onLogout();}}
      />
    </Layout>
  );
}