import { App as AntApp, ConfigProvider,Spin } from "antd";
import { useState,useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getMe,logout } from "./api";
import { getStoredUser } from "./api";
import Dashboard from "./Dashboard";
import LoginPage from "./LoginPage";
import type { CurrentUser } from "./types";

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checkingAuth,setCheckingAuth]=useState(true);
  useEffect(()=>{const checkAuth=async()=>{const token=localStorage.getItem("access_token");
    if(!token){
      setCheckingAuth(false);
      return;
    }
    try{
      const CurrentUser=await getMe();
      setUser(CurrentUser);
    }catch{
      logout();
      setUser(null);
    }finally{
      setCheckingAuth(false);
    }

  };void checkAuth();},[]);
  useEffect(()=>{
    const handleAuthLogout=()=>{setUser(null);};
    window.addEventListener("auth:logout",handleAuthLogout);
    return ()=>{window.removeEventListener("auth:logout",handleAuthLogout);};
  },[]);
  const handleLogout=()=>{
    logout();
    setUser(null);
  };
  if(checkingAuth){
    return(
      <div style={{height:"100vh",display:"grid",placeItems:"center"}}><Spin size="large"/></div>
    );
  }
  return (
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: "#2464c7",
        borderRadius: 10,
        colorText: "#293b55",
        controlHeight: 40,
        fontFamily: "Arial, Helvetica, sans-serif",
      },
      components: {
        Button: { fontWeight: 600 },
        Table: { headerBg: "#fafbfd", rowHoverBg: "#f7faff" },
      },
    }}
  >
    <AntApp>
      {!user ? (
        <LoginPage onLogin={setUser} />
      ) : (
        <Routes>
          <Route path="/:resource" element={<Dashboard user={user} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/students" replace />} />
        </Routes>
      )}
    </AntApp>
  </ConfigProvider>
);
  
}
