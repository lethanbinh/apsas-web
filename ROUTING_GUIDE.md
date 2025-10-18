# 🚀 Next.js App Router - Hướng dẫn Routing

## ✅ **Dự án đã chạy thành công!**

Server đang chạy tại: **http://localhost:3000**

## 📁 **Cấu trúc Routing đã tạo**

### **1. Static Routes (Tuyến tĩnh)**
```
/                    → src/app/page.tsx (Trang chủ)
/login              → src/app/login/page.tsx
/register           → src/app/register/page.tsx
/products           → src/app/products/page.tsx
/dashboard          → src/app/dashboard/page.tsx
/dashboard/profile  → src/app/dashboard/profile/page.tsx
/dashboard/settings → src/app/dashboard/settings/page.tsx
```

### **2. Dynamic Routes (Tuyến động)**
```
/products/[id]      → src/app/products/[id]/page.tsx
```

### **3. Route Groups (Nhóm tuyến)**
```
/(auth)/login       → src/app/(auth)/login/page.tsx (Layout riêng)
```

### **4. Nested Layouts (Layout lồng nhau)**
```
/dashboard/*        → src/app/dashboard/layout.tsx (Layout cho dashboard)
```

## 🎯 **Các trang đã tạo**

### **Trang chủ** (`/`)
- Hero section với CTA buttons
- Features showcase
- Responsive design với Ant Design

### **Authentication Pages**
- **Login** (`/login`) - Form đăng nhập với validation
- **Register** (`/register`) - Form đăng ký với validation
- **Auth Layout** - Layout riêng cho auth pages

### **Dashboard Pages**
- **Dashboard** (`/dashboard`) - Trang chính với statistics
- **Profile** (`/dashboard/profile`) - Quản lý hồ sơ cá nhân
- **Settings** (`/dashboard/settings`) - Cài đặt ứng dụng
- **Dashboard Layout** - Sidebar navigation

### **Product Pages**
- **Products List** (`/products`) - Danh sách sản phẩm
- **Product Detail** (`/products/[id]`) - Chi tiết sản phẩm (dynamic route)

## 🔧 **Navigation Components**

### **1. Header Component**
```tsx
// src/components/layout/Header.tsx
- User authentication state
- Navigation menu
- User dropdown with profile/logout
```

### **2. Sidebar Component**
```tsx
// src/components/layout/Sidebar.tsx
- Dashboard navigation
- Active route highlighting
- Logout functionality
```

### **3. Layout Components**
```tsx
// src/components/layout/Layout.tsx
- Main app layout
- Header + Footer wrapper
```

## 🛠️ **Navigation Utilities**

### **Navigation Helper**
```tsx
// src/lib/navigation.ts
import { navigation } from '@/lib/navigation';

// Static routes
navigation.home()        // '/'
navigation.login()       // '/login'
navigation.dashboard()   // '/dashboard'

// Dynamic routes
navigation.productDetail('123')  // '/products/123'

// Route checking
navigation.isActiveRoute('/dashboard', '/dashboard/profile')  // true

// Breadcrumbs
navigation.generateBreadcrumbs('/dashboard/profile')
```

## 📱 **Responsive Design**

Tất cả các trang đều được thiết kế responsive với:
- **Mobile First**: Tối ưu cho mobile
- **Tablet**: Layout 2 cột cho tablet
- **Desktop**: Layout đầy đủ cho desktop

## 🎨 **Styling & Theming**

### **Global Styles**
- `src/app/globals.css` - Global CSS
- Ant Design theme customization
- Responsive utilities

### **Component Styles**
- CSS Modules cho component-specific styles
- Ant Design components với custom styling
- Responsive breakpoints

## 🔐 **Authentication Flow**

### **Protected Routes**
```tsx
// Dashboard routes được bảo vệ
/dashboard/* → Yêu cầu authentication
```

### **Auth State Management**
```tsx
// Redux store quản lý auth state
const { user, isAuthenticated, login, logout } = useAuth();
```

## 🚀 **Cách sử dụng**

### **1. Truy cập các trang**
```
http://localhost:3000/              → Trang chủ
http://localhost:3000/login         → Đăng nhập
http://localhost:3000/register      → Đăng ký
http://localhost:3000/dashboard     → Dashboard
http://localhost:3000/products      → Danh sách sản phẩm
http://localhost:3000/products/1    → Chi tiết sản phẩm
```

### **2. Navigation trong code**
```tsx
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Link component
<Link href="/dashboard">Dashboard</Link>

// Programmatic navigation
const router = useRouter();
router.push('/dashboard');
```

### **3. Dynamic Routes**
```tsx
// Trong products/[id]/page.tsx
interface ProductPageProps {
  params: {
    id: string;
  };
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  const productId = params.id;
  // Sử dụng productId để fetch data
}
```

## 📋 **Best Practices**

### **1. File Naming**
- `page.tsx` - Trang chính
- `layout.tsx` - Layout cho route group
- `loading.tsx` - Loading UI
- `error.tsx` - Error UI
- `not-found.tsx` - 404 page

### **2. Route Organization**
- Nhóm các route liên quan
- Sử dụng route groups `(auth)` cho layout riêng
- Nested layouts cho complex apps

### **3. Performance**
- Lazy loading components
- Code splitting tự động
- Image optimization với Next.js Image

## 🎉 **Kết quả**

✅ **Server chạy thành công** tại http://localhost:3000
✅ **Không có lỗi linting**
✅ **Routing hoạt động đầy đủ**
✅ **Responsive design**
✅ **Authentication flow**
✅ **Dynamic routes**
✅ **Nested layouts**

Dự án của bạn đã sẵn sàng để phát triển thêm! 🚀
