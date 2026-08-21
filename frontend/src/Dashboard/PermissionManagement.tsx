import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
}
interface DepartmentInfo {
  id: string;
  code: string;
  name: string;
}
interface ClassInfo {
  id: string;
  code: string;
  name: string;
  department?: {
    id: string;
    code: string;
    name: string;
  };
}

interface UserWithPermissions {
  id: string;
  username: string;
  name: string;
  position: "teacher" | "student";
  referenceCode?: string;
  departmentId?: string;
  department?: {
    id: string;
    code: string;
    name: string;
  };
  classId?: string;
  schoolClass?: {
    id: string;
    code: string;
    name: string;
  };
  permissionCodes: string[];
}

const RESOURCE_LABELS: Record<string, string> = {
  students: "SINH VIEN",
  classes: "LOP",
  teachers: "GIAO VIEN",
  departments: "KHOA",
  users: "NGUOI DUNG",
  permissions: "PHAN QUYEN",
};

const ACTION_LABELS: Record<string, string> = {
  view: "Xem",
  create: "Them",
  update: "Sua",
  delete: "Xoa",
  manage: "Quan ly"
};

export default function PermissionManagement() {
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<"" | "teacher" | "student">("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catalogRes, usersRes, lookupsRes] = await Promise.all([
        api.get('/permissions/catalog'),
        api.get('/permissions/users'),
        api.get('/academic-lookups')
      ]);
      setCatalog(catalogRes.data);
      setUsers(usersRes.data);
      setDepartments(lookupsRes.data.departments ?? []);
      setClasses(lookupsRes.data.classes ?? []);
    } catch (error) {
      console.error(error);
      alert("Khong the tai du lieu. Vui long thu lai!");
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter((schoolClass) => schoolClass.department?.id === selectedDepartmentId);
  
  const filteredUsers = users.filter((user) => {
    if (!selectedDepartmentId || !selectedPosition) return false;

    const userDepId = user.departmentId || user.department?.id;
    if (userDepId !== selectedDepartmentId) return false;

    if (user.position !== selectedPosition) return false;
    
    if (selectedPosition === "student") {
      const userClsId = user.classId || user.schoolClass?.id;
      if (userClsId !== selectedClassId) return false;
    }
    
    return true;
  });

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setSelectedClassId("");
    setSelectedUserId("");
    setSelectedCodes([]);
  };

  const handlePositionChange = (position: "" | "teacher" | "student") => {
    setSelectedPosition(position);
    setSelectedClassId("");
    setSelectedUserId("");
    setSelectedCodes([]);
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedUserId("");
    setSelectedCodes([]);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedCodes(user.permissionCodes || []);
    } else {
      setSelectedCodes([]);
    }
  };

  const handleTogglePermission = (code: string) => {
    setSelectedCodes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    try {
      setLoading(true);
      await api.patch(`/permissions/users/${selectedUserId}`, { permissionCodes: selectedCodes });
      alert("Luu phan quyen thanh cong");
      await fetchData();
    } catch (error) {
      console.error("Loi khi luu phan quyen", error);
      alert("Co loi khi phan quyen");
    } finally {
      setLoading(false);
    }
  };

  const groupedCatalog = catalog.reduce((acc, perm) => {
    const [resource] = perm.code.split('.');
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Phan Quyen</h2>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Khoa</label>
          <select
            value={selectedDepartmentId}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            <option value="">Chon khoa</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code} - {department.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Chuc vu</label>
          <select
            value={selectedPosition}
            disabled={!selectedDepartmentId}
            onChange={(e) => handlePositionChange(e.target.value as "" | "teacher" | "student")}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: !selectedDepartmentId ? '#f3f4f6' : 'white' }}
          >
            <option value="">Chon chuc vu</option>
            <option value="teacher">Giao vien</option>
            <option value="student">Sinh vien</option>
          </select>
        </div>

        {selectedPosition === "student" && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Lop</label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="">Chon lop</option>
              {filteredClasses.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.code} - {schoolClass.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Nguoi dung</label>
          <select
            value={selectedUserId}
            disabled={Boolean(!selectedDepartmentId || !selectedPosition || (selectedPosition === "student" && !selectedClassId))}
            onChange={(e) => handleUserSelect(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '6px', 
              border: '1px solid #ccc', 
              backgroundColor: (!selectedDepartmentId || !selectedPosition || (selectedPosition === "student" && !selectedClassId)) ? '#f3f4f6' : 'white' 
            }}
          >
            <option value="">Chon user</option>
            {filteredUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.referenceCode ? `[${user.referenceCode}] ` : ""}
                {user.name} - {user.username}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedUserId && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            {Object.entries(groupedCatalog).map(([resource, perms]) => (
              <div
                key={resource}
                style={{ padding: '16px', border: '1px solid #eaeaea', borderRadius: '8px', backgroundColor: '#f9fafb' }}
              >
                <h4 style={{ textTransform: 'uppercase', marginBottom: '12px', fontWeight: 'bold', color: '#374151', fontSize: '15px' }}>
                  {RESOURCE_LABELS[resource] || resource}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {perms.map(perm => {
                    const action = perm.code.split('.')[1];
                    const actionLabel = ACTION_LABELS[action] || action;
                    const resourceLabel = RESOURCE_LABELS[resource] ? RESOURCE_LABELS[resource].toLowerCase() : resource;
                    return (
                      <label
                        key={perm.code}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                      >
                        <input
                          type='checkbox'
                          checked={selectedCodes.includes(perm.code)}
                          onChange={() => handleTogglePermission(perm.code)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '15px', userSelect: 'none' }}>{actionLabel} {resourceLabel}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            style={{ 
              marginTop: '32px', 
              padding: '14px 24px', 
              backgroundColor: loading ? '#9ca3af' : '#2563eb', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontSize: '16px', 
              fontWeight: '600', 
              width: '100%', 
              boxShadow: '0 4px 6px rgba(37,99,235,0.2)' 
            }}
          >
            {loading ? "Dang xu ly..." : "Luu phan quyen"}
          </button>
        </div>
      )}
    </div>
  );
}