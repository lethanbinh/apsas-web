# APSAS Web - Hệ Thống Đánh Giá Lập Trình Tự Động

## 📋 Mục Lục

1. [Giới Thiệu](#giới-thiệu)
2. [Tính Năng Chính](#tính-năng-chính)
3. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
4. [Cài Đặt và Cấu Hình](#cài-đặt-và-cấu-hình)
5. [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
6. [Hướng Dẫn Sử Dụng](#hướng-dẫn-sử-dụng)
7. [API và Services](#api-và-services)
8. [Phát Triển](#phát-triển)
9. [Triển Khai](#triển-khai)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Giới Thiệu

**APSAS (Automated Programming Skill Assessment System)** là một hệ thống web hiện đại được xây dựng để tự động hóa quá trình đánh giá mã nguồn, đánh giá kỹ năng lập trình và cung cấp phản hồi cá nhân hóa. Hệ thống giúp nâng cao trải nghiệm học tập cho sinh viên và giảm tải công việc cho giảng viên.

### Mục Tiêu

- **Tự động hóa quá trình đánh giá**: Tích hợp phân tích mã tĩnh, thực thi mã động và đánh giá test case thông qua các API như Judge0 hoặc Piston
- **Phản hồi tức thì và thông tin**: Sử dụng AI (Gemini) để tạo phản hồi tự động, giúp sinh viên nhanh chóng hiểu lỗi và cải thiện
- **Hỗ trợ học tập và phát triển kỹ năng**: Dashboard hiển thị tiến độ theo thời gian, bài tập sắp tới và truy cập tài nguyên học tập

### Công Nghệ Sử Dụng

- **Frontend**: Next.js 15.5.7, React 19.1.0, TypeScript
- **UI Framework**: Ant Design 5.27.1
- **State Management**: Redux Toolkit, React Query (TanStack Query)
- **Authentication**: Firebase Auth, Google OAuth
- **AI Integration**: Google Gemini API
- **File Processing**: Excel (XLSX), DOCX, ZIP
- **Charts**: Recharts
- **Build Tool**: Turbopack (Next.js)

---

## ✨ Tính Năng Chính

### 🔐 Xác Thực và Phân Quyền

- **Đăng nhập/Đăng xuất**: Hỗ trợ đăng nhập bằng email/password và Google OAuth
- **Quên mật khẩu**: Gửi OTP qua email để reset mật khẩu
- **Role-Based Access Control (RBAC)**: 5 vai trò với quyền truy cập khác nhau:
  - **Admin (0)**: Quản lý toàn hệ thống
  - **Lecturer (1)**: Giảng viên
  - **Student (2)**: Sinh viên
  - **HOD (3)**: Trưởng khoa
  - **Examiner (4)**: Giám khảo

### 👨‍💼 Admin

#### Dashboard
- **Overview Tab**: Tổng quan hệ thống với các thống kê tổng hợp
  - Tổng số người dùng, lớp học, khóa học, đánh giá
  - Biểu đồ thống kê theo thời gian
  - Lọc theo ngày tháng, lớp học, khóa học, học kỳ
- **Users Tab**: Thống kê người dùng theo vai trò
- **Academic Tab**: Thống kê học thuật (lớp học, khóa học, học kỳ)
- **Academic Performance Tab**: Hiệu suất học tập
  - Tỷ lệ đậu/rớt
  - Điểm trung bình theo lớp, khóa học, học kỳ
  - Phân bố điểm (A, B, C, D, F)
  - Top sinh viên và lớp học
  - Tỷ lệ nộp bài và hoàn thành chấm điểm
- **Assessments Tab**: Thống kê đánh giá
- **Grading Tab**: Thống kê chấm điểm
- **Submissions Tab**: Thống kê bài nộp

#### Quản Lý Người Dùng
- **Xem danh sách người dùng**: Phân trang, tìm kiếm, lọc theo vai trò
- **Tạo người dùng mới**: Form tạo tài khoản với đầy đủ thông tin
- **Chỉnh sửa người dùng**: Cập nhật thông tin cá nhân
- **Xóa người dùng**: Xóa với xác nhận
- **Import/Export Excel**:
  - Import người dùng từ file Excel
  - Export danh sách người dùng ra Excel
  - Download template Excel để import
  - Validate dữ liệu khi import

### 👨‍🏫 Lecturer (Giảng Viên)

#### My Classes
- Xem danh sách các lớp học được phân công
- Chọn lớp để xem chi tiết

#### Class Info
- Thông tin chi tiết về lớp học
- Thông tin khóa học và học kỳ

#### Assignments (Bài Tập)
- Xem danh sách bài tập của lớp
- Tạo bài tập mới
- Xem chi tiết bài tập
- Quản lý deadline
- Xem danh sách bài nộp

#### Labs (Thực Hành)
- Xem danh sách lab
- Quản lý lab
- Xem bài nộp lab
- Export điểm lab ra Excel
- Download tất cả bài nộp của lab

#### Members (Thành Viên)
- Xem danh sách thành viên trong lớp
- Thông tin sinh viên

#### Tasks (Nhiệm Vụ)
- **Quản lý Assessment Templates**:
  - Tạo template mới
  - Chỉnh sửa template (khi status = 1, 3, 4)
  - Xem chi tiết template
  - Import/Export template (JSON)
  - Upload file (SQL, Postman Collection)
  - Quản lý Papers (đề thi):
    - Tạo paper mới
    - Chỉnh sửa paper
    - Xóa paper
  - Quản lý Questions (câu hỏi):
    - Tạo question mới
    - Chỉnh sửa question
    - Xóa question
    - Quản lý Rubric Items (tiêu chí chấm điểm)
  - Quản lý Files:
    - Upload database file (.sql)
    - Upload Postman collection
    - Xóa file

#### Grading (Chấm Điểm)
- **My Grading Group**: Xem danh sách nhóm chấm điểm được phân công
- **Assignment Grading**: Chấm điểm bài tập
  - Xem thông tin submission
  - Xem code và file nộp
  - Chấm điểm theo rubric
  - Nhập điểm cho từng rubric item
  - Thêm comment cho từng question
  - Auto Grading (tích hợp AI)
  - Lưu điểm
  - Xem lịch sử chấm điểm
  - Xem lịch sử feedback
- **Grading Group Detail**: Chi tiết nhóm chấm điểm
  - Xem danh sách submissions
  - Chấm điểm từng submission
  - Export điểm ra Excel
  - Submit grade sheet

#### Approval (Phê Duyệt)
- Xem danh sách template cần phê duyệt (vai trò Approver Lecturer)
- Xem chi tiết template
- Phê duyệt/Từ chối template
- Thêm comment cho từng question

### 🎓 Student (Sinh Viên)

#### My Classes
- Xem danh sách lớp học đã tham gia
- Tham gia lớp mới bằng class code

#### Class Detail
- Thông tin lớp học
- Thông tin khóa học

#### Assignments
- Xem danh sách bài tập
- Xem deadline
- Nộp bài (upload file ZIP)
- Xem điểm và feedback
- Xem lịch sử nộp bài

#### Labs
- Xem danh sách lab
- Nộp lab (upload file ZIP)
- Xem điểm và feedback

#### Assignment Grading
- Xem chi tiết điểm của bài nộp
- Xem điểm theo từng question và rubric
- Xem comment của giảng viên
- Xem feedback được format bởi AI
- Export báo cáo điểm ra Excel

#### Members
- Xem danh sách thành viên trong lớp

### 🏛️ HOD (Trưởng Khoa)

#### Semester Plans (Kế Hoạch Học Kỳ)
- Xem danh sách học kỳ
- Xem chi tiết kế hoạch học kỳ
- Xem danh sách khóa học trong học kỳ
- Xem course elements (bài tập, lab, exam)
- Tạo assign request cho giảng viên
- Xem trạng thái assign request

#### Approval (Phê Duyệt)
- Xem danh sách template cần phê duyệt
- Xem chi tiết template
- Phê duyệt/Từ chối template
- Gán Approver Lecturer
- Thêm comment cho từng question

#### Semester Management (Quản Lý Học Kỳ)
- Xem danh sách học kỳ
- Tạo học kỳ mới
- Chỉnh sửa học kỳ (chỉ khi chưa bắt đầu)
- Xóa học kỳ (chỉ khi chưa bắt đầu)
- Thông tin: semester code, academic year, start date, end date, note

#### Course Management (Quản Lý Khóa Học)
- Xem danh sách khóa học
- Lọc theo học kỳ
- Tạo khóa học mới
- Chỉnh sửa khóa học
- Xóa khóa học
- Gán khóa học vào học kỳ

### 👨‍⚖️ Examiner (Giám Khảo)

#### Grading Groups (Nhóm Chấm Điểm)
- Xem danh sách nhóm chấm điểm
- Tạo nhóm chấm điểm mới
- Chỉnh sửa nhóm chấm điểm
- Xóa nhóm chấm điểm
- Gán submissions cho giảng viên
- Xem danh sách submissions trong nhóm

#### Submissions
- Xem chi tiết submission
- Xem code và file nộp

#### Templates
- Xem danh sách template
- Xem chi tiết template

---

## 🏗️ Kiến Trúc Hệ Thống

### Frontend Architecture

```
┌─────────────────────────────────────┐
│         Next.js App Router          │
├─────────────────────────────────────┤
│  Pages (App Router)                 │
│  - /login                            │
│  - /admin/*                          │
│  - /lecturer/*                       │
│  - /student/*                        │
│  - /hod/*                            │
│  - /examiner/*                       │
├─────────────────────────────────────┤
│  Components                          │
│  - Layout (Header, Sidebar, Footer)  │
│  - Role-specific components          │
│  - Common components                 │
│  - Modals                            │
├─────────────────────────────────────┤
│  Services Layer                      │
│  - API services                      │
│  - Business logic                    │
├─────────────────────────────────────┤
│  State Management                    │
│  - Redux (Auth state)                │
│  - React Query (Server state)        │
├─────────────────────────────────────┤
│  Middleware                          │
│  - Authentication                    │
│  - Authorization (RBAC)              │
└─────────────────────────────────────┘
```

### Data Flow

1. **User Action** → Component
2. **Component** → Service (API call)
3. **Service** → Backend API
4. **Response** → React Query Cache
5. **Component** → Re-render với data mới

### Authentication Flow

1. User đăng nhập → `/login`
2. Backend trả về JWT token
3. Token được lưu trong cookie và localStorage
4. Middleware kiểm tra token trên mỗi request
5. Decode JWT để lấy role
6. Middleware kiểm tra quyền truy cập route

---

## ⚙️ Cài Đặt và Cấu Hình

### Yêu Cầu Hệ Thống

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 hoặc **yarn**: >= 1.22.0
- **Git**: Để clone repository

### Cài Đặt Dependencies

```bash
# Clone repository
git clone <repository-url>
cd apsas-web

# Install dependencies
npm install
# hoặc
yarn install
```

### Cấu Hình Environment Variables

Tạo file `.env.local` trong thư mục root với các biến sau:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://aspas-edu.site/api

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Gemini AI Configuration
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.5-pro
```

### Chạy Development Server

```bash
# Sử dụng Turbopack (khuyến nghị, nhanh hơn)
npm run dev

# Hoặc sử dụng Webpack
npm run dev:webpack
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

### Build Production

```bash
# Build production
npm run build

# Start production server
npm start
```

### Bundle Analysis

```bash
# Phân tích bundle size
npm run analyze
```

---

## 📁 Cấu Trúc Dự Án

```
apsas-web/
├── public/                          # Static files
│   ├── images/                      # Hình ảnh
│   ├── classes/                     # Assets cho classes
│   └── logo/                        # Logo
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── admin/                   # Admin pages
│   │   │   ├── dashboard/           # Dashboard với các tabs
│   │   │   └── manage-users/        # Quản lý người dùng
│   │   ├── lecturer/                # Lecturer pages
│   │   │   ├── tasks/               # Quản lý tasks/templates
│   │   │   ├── assignment-grading/  # Chấm điểm bài tập
│   │   │   ├── grading-group/       # Nhóm chấm điểm
│   │   │   ├── my-grading-group/    # Nhóm chấm điểm của tôi
│   │   │   ├── labs/                # Quản lý lab
│   │   │   ├── approval/            # Phê duyệt
│   │   │   └── ...
│   │   ├── student/                 # Student pages
│   │   │   ├── assignments/         # Bài tập
│   │   │   ├── labs/                 # Lab
│   │   │   ├── assignment-grading/  # Xem điểm
│   │   │   └── ...
│   │   ├── hod/                     # HOD pages
│   │   │   ├── semester-plans/      # Kế hoạch học kỳ
│   │   │   ├── approval/             # Phê duyệt
│   │   │   ├── semester-management/ # Quản lý học kỳ
│   │   │   └── course-management/   # Quản lý khóa học
│   │   ├── examiner/                 # Examiner pages
│   │   │   ├── grading-groups/      # Nhóm chấm điểm
│   │   │   ├── submissions/         # Bài nộp
│   │   │   └── templates/           # Templates
│   │   ├── classes/                 # Classes pages
│   │   ├── login/                   # Đăng nhập
│   │   ├── reset-password/          # Reset mật khẩu
│   │   ├── profile/                 # Profile
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Home page
│   │
│   ├── components/                 # React components
│   │   ├── admin/                   # Admin components
│   │   ├── lecturer/                # Lecturer components
│   │   ├── student/                 # Student components
│   │   ├── hod/                     # HOD components
│   │   ├── examiner/                # Examiner components
│   │   ├── layout/                   # Layout components
│   │   ├── sidebar/                  # Sidebar components
│   │   ├── modals/                   # Modal components
│   │   ├── features/                 # Feature components
│   │   ├── common/                   # Common components
│   │   ├── ui/                       # UI components
│   │   └── providers/                # Context providers
│   │
│   ├── services/                    # API services
│   │   ├── api.ts                    # API client
│   │   ├── authService.ts            # Authentication
│   │   ├── accountService.ts         # Account management
│   │   ├── adminService.ts           # Admin operations
│   │   ├── classService.ts           # Class management
│   │   ├── assessmentTemplateService.ts
│   │   ├── gradingService.ts         # Grading operations
│   │   ├── submissionService.ts      # Submission management
│   │   ├── geminiService.ts          # AI feedback
│   │   └── ...
│   │
│   ├── hooks/                        # Custom hooks
│   │   ├── useAuth.ts                # Authentication hook
│   │   ├── useQueryClient.ts        # Query client hook
│   │   └── ...
│   │
│   ├── lib/                          # Utilities & config
│   │   ├── config/                   # Configuration
│   │   ├── constants/                # Constants
│   │   ├── react-query/              # React Query config
│   │   └── utils/                    # Utility functions
│   │
│   ├── store/                        # Redux store
│   │   └── slices/                   # Redux slices
│   │
│   ├── types/                        # TypeScript types
│   │   └── index.ts
│   │
│   ├── utils/                        # Utility functions
│   │   ├── excelUtils.ts             # Excel operations
│   │   ├── exportGradeReport.ts      # Grade export
│   │   └── userUtils.ts              # User utilities
│   │
│   └── middleware.ts                 # Next.js middleware
│
├── next.config.ts                    # Next.js config
├── tsconfig.json                     # TypeScript config
├── package.json                       # Dependencies
└── README.md                          # Documentation
```

---

## 📖 Hướng Dẫn Sử Dụng

### Đăng Nhập

1. Truy cập `/login`
2. Nhập email và mật khẩu, hoặc
3. Đăng nhập bằng Google (nếu đã cấu hình)

### Admin

#### Quản Lý Người Dùng

1. Vào **Manage Users** từ sidebar
2. **Tạo người dùng mới**:
   - Click "Create User"
   - Điền form thông tin
   - Chọn role
   - Click "Create"
3. **Import từ Excel**:
   - Click "Download Template" để lấy template
   - Điền thông tin vào template
   - Click "Import" và chọn file Excel
4. **Export danh sách**:
   - Click "Export All" để xuất ra Excel
5. **Chỉnh sửa/Xóa**:
   - Click icon Edit/Delete trên từng dòng

#### Dashboard

1. Vào **Dashboard** từ sidebar
2. Chọn tab muốn xem (Overview, Users, Academic, ...)
3. Sử dụng filters để lọc dữ liệu:
   - Chọn lớp học
   - Chọn khóa học
   - Chọn học kỳ
   - Chọn khoảng thời gian

### Lecturer

#### Tạo Assessment Template

1. Vào **Tasks** từ navigation
2. Chọn task (assign request) cần tạo template
3. Click "Create Template" hoặc chọn template có sẵn
4. **Tạo Papers**:
   - Click "Add Paper"
   - Điền tên và mô tả
   - Lưu
5. **Tạo Questions**:
   - Chọn paper
   - Click "Add Question"
   - Điền thông tin câu hỏi
   - Lưu
6. **Thêm Rubric Items**:
   - Trong question detail, thêm rubric items
   - Đặt điểm cho mỗi rubric
7. **Upload Files** (nếu cần):
   - Upload database file (.sql)
   - Upload Postman collection
8. **Submit** để gửi lên HOD phê duyệt

#### Chấm Điểm

1. Vào **My Grading Group** hoặc **Assignment Grading**
2. Chọn submission cần chấm
3. Xem code và file nộp
4. **Chấm điểm thủ công**:
   - Nhập điểm cho từng rubric item
   - Thêm comment cho question
5. **Auto Grading** (nếu có):
   - Click "Auto Grading"
   - Hệ thống sẽ tự động chấm và tạo feedback
6. Click "Save Grade" để lưu

#### Export Điểm

1. Vào **Labs** hoặc **Grading Group**
2. Click "Export Grade Report"
3. Chọn các lab/assignment muốn export
4. File Excel sẽ được tải về

### Student

#### Nộp Bài

1. Vào **Assignments** hoặc **Labs**
2. Chọn bài tập cần nộp
3. Click "Submit"
4. Upload file ZIP (chứa code)
5. Click "Confirm Submit"

#### Xem Điểm

1. Vào **Assignment Grading**
2. Chọn bài đã nộp
3. Xem điểm chi tiết:
   - Điểm theo từng question
   - Điểm theo từng rubric
   - Comment của giảng viên
   - AI-formatted feedback
4. Export báo cáo điểm ra Excel

### HOD

#### Tạo Semester Plan

1. Vào **Semester Plans**
2. Chọn học kỳ
3. Xem danh sách khóa học
4. **Tạo Assign Request**:
   - Chọn course element
   - Chọn giảng viên
   - Gửi request

#### Phê Duyệt Template

1. Vào **Approval**
2. Xem danh sách template chờ phê duyệt
3. Click vào template để xem chi tiết
4. **Gán Approver Lecturer** (nếu cần)
5. **Phê duyệt** hoặc **Từ chối**:
   - Nếu từ chối, nhập lý do
   - Có thể thêm comment cho từng question

#### Quản Lý Học Kỳ

1. Vào **Semester Management**
2. **Tạo học kỳ mới**:
   - Click "Create Semester"
   - Điền thông tin (code, year, dates)
3. **Chỉnh sửa**: Chỉ có thể chỉnh sửa khi học kỳ chưa bắt đầu
4. **Xóa**: Chỉ có thể xóa khi học kỳ chưa bắt đầu

#### Quản Lý Khóa Học

1. Vào **Course Management**
2. Lọc theo học kỳ (nếu cần)
3. **Tạo khóa học mới**:
   - Click "Create Course"
   - Điền thông tin
   - Gán vào học kỳ
4. **Chỉnh sửa/Xóa** khóa học

### Examiner

#### Tạo Grading Group

1. Vào **Grading Groups**
2. Click "Create Grading Group"
3. Điền thông tin:
   - Tên nhóm
   - Chọn template
   - Chọn submissions
4. Lưu

#### Gán Submissions

1. Vào **Grading Groups**
2. Chọn nhóm
3. Click "Assign Submissions"
4. Chọn submissions và giảng viên
5. Gán

---

## 🔌 API và Services

### API Base URL

Mặc định: `https://aspas-edu.site/api`

Có thể cấu hình qua `NEXT_PUBLIC_API_URL`

### Services Chính

#### Authentication Service (`authService.ts`)
- `login(credentials)`: Đăng nhập
- `googleLogin(idToken)`: Đăng nhập bằng Google
- `forgotPassword(email)`: Quên mật khẩu
- `verifyOtp(email, otp)`: Xác thực OTP
- `resetPassword(data)`: Reset mật khẩu

#### Account Service (`accountService.ts`)
- `getAccountList(params)`: Lấy danh sách tài khoản
- `getAccountById(id)`: Lấy thông tin tài khoản
- `updateProfile(data)`: Cập nhật profile

#### Admin Service (`adminService.ts`)
- `createAccount(data)`: Tạo tài khoản mới
- `updateAccount(id, data)`: Cập nhật tài khoản
- `deleteAccount(id)`: Xóa tài khoản
- `updateAssignRequestStatus(id, payload)`: Cập nhật trạng thái assign request

#### Class Service (`classService.ts`)
- `getClassList(params)`: Lấy danh sách lớp
- `getClassById(id)`: Lấy thông tin lớp
- `joinClass(classCode)`: Tham gia lớp

#### Assessment Template Service (`assessmentTemplateService.ts`)
- `getTemplates(params)`: Lấy danh sách template
- `getTemplateById(id)`: Lấy chi tiết template
- `createTemplate(data)`: Tạo template
- `updateTemplate(id, data)`: Cập nhật template
- `deleteTemplate(id)`: Xóa template

#### Grading Service (`gradingService.ts`)
- `getGradingSessions(params)`: Lấy danh sách grading session
- `createGrading(data)`: Tạo grading session
- `updateGradingSession(id, data)`: Cập nhật grading session

#### Submission Service (`submissionService.ts`)
- `getSubmissions(params)`: Lấy danh sách submission
- `getSubmissionById(id)`: Lấy chi tiết submission
- `createSubmission(data)`: Tạo submission
- `updateSubmission(id, data)`: Cập nhật submission

#### Gemini Service (`geminiService.ts`)
- `formatFeedback(rawFeedback)`: Format feedback bằng AI
  - Phân tích feedback thô
  - Tổ chức thành các phần: overall, strengths, weaknesses, code quality, etc.
  - Cache kết quả để tối ưu

### API Interceptors

- **Request Interceptor**: Tự động thêm JWT token vào header
- **Response Interceptor**: 
  - Xử lý lỗi 401 (unauthorized) → redirect về login
  - Log requests/responses (development)

---

## 🛠️ Phát Triển

### Scripts

```bash
# Development với Turbopack
npm run dev

# Development với Webpack
npm run dev:webpack

# Build production
npm run build

# Start production server
npm start

# Bundle analysis
npm run analyze
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Được cấu hình trong Next.js
- **Prettier**: (nếu có) Format code tự động

### Best Practices

1. **Component Structure**:
   - Tách logic vào custom hooks
   - Sử dụng React Query cho server state
   - Sử dụng Redux cho global state (auth)

2. **API Calls**:
   - Luôn sử dụng services, không gọi API trực tiếp
   - Sử dụng React Query để cache và refetch
   - Handle errors properly

3. **Type Safety**:
   - Định nghĩa types/interfaces cho tất cả data
   - Sử dụng TypeScript strict mode
   - Tránh `any` type

4. **Performance**:
   - Sử dụng `useMemo` và `useCallback` khi cần
   - Lazy load components lớn
   - Optimize images với Next.js Image

### Testing

(Chưa có test setup - có thể thêm sau)

---

## 🚀 Triển Khai

### Build Production

```bash
npm run build
```

Output sẽ ở thư mục `.next/`

### Deploy lên Vercel (Khuyến Nghị)

1. Push code lên GitHub/GitLab
2. Import project vào Vercel
3. Cấu hình environment variables
4. Deploy

### Deploy lên Server

1. Build project:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

3. Sử dụng PM2 để quản lý process:
   ```bash
   pm2 start npm --name "apsas-web" -- start
   ```

### Environment Variables trong Production

Đảm bảo set tất cả environment variables trong hosting platform:
- Vercel: Project Settings → Environment Variables
- Server: `.env.production` hoặc system environment variables

---

## 🔧 Troubleshooting

### Lỗi Thường Gặp

#### 1. "Cannot find module" hoặc import errors

**Nguyên nhân**: Dependencies chưa được install hoặc TypeScript paths chưa đúng

**Giải pháp**:
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 2. API calls fail với 401

**Nguyên nhân**: Token hết hạn hoặc không hợp lệ

**Giải pháp**:
- Đăng xuất và đăng nhập lại
- Kiểm tra token trong localStorage/cookie
- Kiểm tra `NEXT_PUBLIC_API_URL` có đúng không

#### 3. Build fails với "Module not found"

**Nguyên nhân**: Import path sai hoặc file không tồn tại

**Giải pháp**:
- Kiểm tra import paths (phải dùng `@/` prefix)
- Kiểm tra file có tồn tại không
- Clear Next.js cache: `rm -rf .next`

#### 4. Gemini API errors

**Nguyên nhân**: API key chưa set hoặc quota hết

**Giải pháp**:
- Kiểm tra `NEXT_PUBLIC_GEMINI_API_KEY` trong `.env.local`
- Kiểm tra quota trên Google Cloud Console
- Hệ thống sẽ fallback về format thủ công nếu API fail

#### 5. File upload fails

**Nguyên nhân**: File quá lớn hoặc format không đúng

**Giải pháp**:
- Kiểm tra file size (max 100MB cho SQL files)
- Kiểm tra file format:
  - Submissions: ZIP only
  - Database: SQL only
  - Postman: JSON only

#### 6. Excel import/export errors

**Nguyên nhân**: Format file không đúng hoặc thiếu columns

**Giải pháp**:
- Download template và sử dụng template đó
- Kiểm tra tất cả required columns có đầy đủ không
- Kiểm tra data format (dates, numbers, etc.)

### Debug Mode

Enable debug logs trong development:

```typescript
// Trong code, sử dụng console.log với prefix
console.log('📤 API Request:', method, url);
console.log('✅ API Response:', status, url);
console.error('❌ API Error:', error);
```

### Performance Issues

1. **Slow page load**:
   - Kiểm tra bundle size với `npm run analyze`
   - Lazy load components lớn
   - Optimize images

2. **Slow API calls**:
   - Kiểm tra network tab trong DevTools
   - Kiểm tra backend performance
   - Sử dụng React Query caching

3. **Memory leaks**:
   - Kiểm tra cleanup trong useEffect
   - Unsubscribe từ event listeners
   - Clear intervals/timeouts

---

## 📝 Changelog

### Version 0.1.0
- Initial release
- Basic authentication
- Role-based access control
- Admin dashboard
- Lecturer features (tasks, grading)
- Student features (assignments, labs)
- HOD features (semester plans, approval)
- Examiner features (grading groups)
- AI-powered feedback (Gemini)
- Excel import/export

---

## 🤝 Đóng Góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

---

## 📄 License

(Thêm license information nếu có)

---

## 👥 Liên Hệ

(Thêm thông tin liên hệ nếu cần)

---

## 🙏 Acknowledgments

- Next.js team
- Ant Design team
- TanStack Query team
- Google Gemini API

---

**Lưu ý**: Tài liệu này được tạo tự động dựa trên codebase hiện tại. Một số tính năng có thể đang trong quá trình phát triển hoặc có thể thay đổi trong tương lai.

