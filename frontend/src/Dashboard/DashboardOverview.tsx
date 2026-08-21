import { SafetyCertificateOutlined,TeamOutlined,UserOutlined } from "@ant-design/icons";
import type { CurrentUser,DataRecord,ResourceKey } from "../types";
import type { PermissionChecker,ResourceConfig } from "./dashboard.types";
import { roleLabels } from "./dashboard.utils";
type Props={
  config:ResourceConfig;
  activeResource:ResourceKey;
  user:CurrentUser;
  currentClass?:DataRecord;
  rowsCount:number;
  can:PermissionChecker;

};
export default function DashboardOverview({
  config,
  activeResource,
  user,
  currentClass,
  rowsCount,
  can,
}:Props){
  const permission=user.permissions??[];
  const actionCount=permission.includes("*")? 4:(
    [
      "view",
      "create",
      "update",
      "delete",
    ]as const
  ).filter((action)=>can(action,activeResource),).length;
  return(
    <>
    <div className="page-intro">
      <div>
        <p className="eyebrow">he thong quan ly</p>
        <h1>{config.label}</h1>
        <p className="page-intro-description">{config.description}</p>
      </div>
      <div className="permission-badge">
        {
          currentClass?(<>
          <strong>
            lop{""}
            {String(currentClass.code)}:
          </strong>
          {""}
          {String(currentClass.name)}
          {".GVCN:"}
          {String((currentClass.homeroomTeacher as |DataRecord|undefined)?.name??"Chưa phân công")}
          </>):(
            <>
            <strong>quyen hien tai:</strong>
            {" "}{ permission.includes("*")?"Toàn quyền hệ thống":permission.length>0?permission.join(","):"Chưa có quyền"}
            </>
          )
        }
      </div>
    </div>
    </>
  )
}




