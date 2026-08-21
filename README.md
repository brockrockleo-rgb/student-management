# Student Management — MongoDB

Ứng dụng quản lý đào tạo full-stack:

- Frontend: React 19, TypeScript, Vite, Ant Design, React Router, Axios.
- Backend: NestJS 11, MikroORM 7, JWT, bcrypt, Permission Guard.
- Database: MongoDB 8 chạy local bằng Docker hoặc MongoDB Atlas.
- Xóa dữ liệu bằng soft delete (`deleted = true`).

## Chức năng

Có 6 màn hình danh sách:

1. Sinh viên
2. Giáo viên
3. Khoa
4. Lớp
5. User
6. Quyền

Mỗi màn hình dùng Ant Design Table, tìm kiếm, checkbox chọn nhiều dòng, nút tạo mới và modal xem/sửa khi click vào dòng. Nút xóa chỉ xuất hiện khi đã chọn dữ liệu và người dùng có quyền xóa.

## Phân quyền

| Vai trò | Phạm vi |
| --- | --- |
| Admin | Toàn quyền CRUD mọi collection và tạo tài khoản |
| Giáo viên | Xem các lớp mình chủ nhiệm; lọc theo lớp; thêm, sửa, soft delete sinh viên thuộc các lớp đó |
| Sinh viên | Chỉ xem danh sách sinh viên cùng lớp và giáo viên chủ nhiệm của lớp |

Frontend ẩn menu và nút theo quyền. Backend luôn kiểm tra lại bằng `JwtAuthGuard`, `PermissionsGuard` và kiểm tra phạm vi dữ liệu; sửa request thủ công cũng không vượt quyền được.

## Mô hình MongoDB

MongoDB gồm các collection:

- `departments`, `classes`, `students`, `teachers`.
- `classes.homeroomTeacher` liên kết trực tiếp lớp với giáo viên chủ nhiệm.
- `users` liên kết một tài khoản với `teacher` hoặc `student`.
- `permissions`, `position_permissions` lưu quyền theo vai trò.

Mỗi document có `_id: ObjectId`; MikroORM trả thêm `id` dạng string cho frontend. Chi tiết tại `database/mongodb-model.md`.

Không tạo collection `admin` chứa mật khẩu riêng. Tất cả tài khoản đăng nhập nằm trong `users`; mật khẩu được hash bằng bcrypt.

## Chạy dự án bằng MongoDB local

Yêu cầu: Node.js 22+, npm và Docker Desktop.

### 1. Khởi động MongoDB

```bash
docker compose up -d mongo
```

Kiểm tra container:

```bash
docker compose ps
```

### 2. Cài dependency

Tại thư mục gốc:

```bash
npm run install:all
```

### 3. Tạo file môi trường

Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

macOS/Linux:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env` mặc định kết nối MongoDB local:

```env
MONGODB_URI=mongodb://localhost:27017/student_management
MONGODB_DB_NAME=student_management
```

### 4. Chạy backend

Mở terminal 1:

```bash
npm run dev:backend
```

Backend kết nối MongoDB, tự tạo collection/index và seed dữ liệu lần đầu. API chạy tại `http://localhost:3000/api`.

### 5. Chạy frontend

Mở terminal 2:

```bash
npm run dev:frontend
```

Mở `http://localhost:5173`.

## Kết nối MongoDB Atlas

1. Tạo cluster và database user trên MongoDB Atlas.
2. Cho phép IP máy chạy backend truy cập cluster.
3. Thay URI trong `backend/.env`:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER/student_management?retryWrites=true&w=majority
MONGODB_DB_NAME=student_management
```

Nếu mật khẩu có ký tự đặc biệt, cần URL-encode mật khẩu. Không commit file `.env` lên GitHub.

## Tài khoản seed

| Vai trò | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Giáo viên | `teacher1` | `teacher123` |
| Sinh viên | `student1` | `student123` |

Hãy đổi mật khẩu seed và `JWT_SECRET` trước khi triển khai thật.

## Luồng API

### Đăng nhập

1. React gửi `POST /api/auth/login`.
2. Backend so sánh bcrypt hash.
3. Backend trả JWT và danh sách quyền.
4. Axios tự gắn `Authorization: Bearer <token>`.

### Tạo hoặc sửa

1. Ant Design Form kiểm tra trường bắt buộc.
2. NestJS DTO validation kiểm tra lại request.
3. Guard kiểm tra quyền.
4. Với giáo viên, backend xác nhận lớp thuộc danh sách lớp giáo viên đang chủ nhiệm.
5. MikroORM ghi document và các ObjectId tham chiếu vào MongoDB.

### Soft delete nhiều dòng

Frontend gửi:

```http
DELETE /api/students
Content-Type: application/json

{ "ids": ["66b...", "66c..."] }
```

Backend cập nhật `deleted = true`; document không bị xóa vật lý. Danh sách chỉ query `{ deleted: false }`.

### Admin tạo user

- `admin`: không cần mã liên kết.
- `teacher`: `referenceCode` phải là `teacherCode` tồn tại và chưa có tài khoản.
- `student`: `referenceCode` phải là `studentCode` tồn tại và chưa có tài khoản.

## API chính

- `POST /api/auth/login`, `GET /api/auth/me`.
- CRUD + soft delete: `/api/students`, `/api/teachers`, `/api/departments`, `/api/classes`, `/api/users`, `/api/permissions`.
- Dữ liệu select theo phạm vi: `GET /api/academic-lookups`.

## Build production

```bash
npm run build
```

Backend build vào `backend/dist`; frontend build vào `frontend/dist`.

Kiểm tra cấu hình MikroORM đã nhận đúng MongoDriver, 7 entity và ObjectId:

```bash
npm run check:mongodb
```
"# student-management" 
