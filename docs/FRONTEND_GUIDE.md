# ReliefPay Frontend - Complete Developer Guide

## 📖 Introduction

This is a complete rewrite and enhancement of the ReliefPay frontend. All pages have been modernized with professional UI/UX, proper authentication, role-based dashboards, and a complete landing page.

## 🗺️ Application Flow

### 1. **Public Routes** (No Authentication Required)
```
/ (Home/Landing)
  ├── Hero Section
  ├── Stats Section
  ├── How It Works
  ├── Testimonials
  ├── FAQ
  └── CTA Section

/login (Login Page)
  └── Demo account buttons

/signup (Signup Page)
  └── Role selection

/404 (Not Found)
/403 (Unauthorized)
```

### 2. **Protected Routes** (Authentication Required)
```
/dashboard (Dashboard)
  ├── Admin/Reviewer View
  ├── Beneficiary View
  └── Donor View

/map (Relief Map)
/apply (Beneficiary Application)
```

## 👤 User Roles & Their Features

### 1. **Admin**
- Full system access
- Campaign management
- Application review
- Transaction oversight
- Volunteer task assignment
- Audit log access

**Demo Account**: `alok.v@reliefpay.org`

### 2. **Reviewer**
- Application review and approval
- Beneficiary verification
- Document assessment
- Interview scheduling

**Demo Account**: `s.jenkins@reliefpay.org`

### 3. **Beneficiary**
- Submit applications
- Track application status
- Download documents
- Contact reviewer
- View timeline

**Demo Account**: `ayesha.k@gmail.com`

### 4. **Donor**
- View campaigns
- Make donations
- Track contributions
- Download tax receipts
- View impact reports

**Demo Account**: `mehta.r@techcorp.in`

### 5. **Volunteer** (Coming Soon)
- Field assessments
- Document verification
- Community outreach

### 6. **Auditor** (Coming Soon)
- Financial audits
- Compliance checks
- Transparency reports

## 🔐 Authentication Flow

### Login Process
1. User enters email & password
2. System validates credentials
3. Creates auth token
4. Stores in context
5. Redirects to dashboard

```javascript
// Example: Using useAuth hook
const { login, isLoading, error } = useAuth();

const handleLogin = async (email, password) => {
  try {
    await login(email, password);
    navigate('/dashboard');
  } catch (err) {
    setError(err.message);
  }
};
```

### Signup Process
1. User fills registration form
2. Selects role
3. System creates account
4. Auto-login user
5. Redirect to dashboard

## 🎨 Component Architecture

### Hierarchical Structure

```
App (Router Setup)
├── AuthProvider (Global State)
│
├── Public Pages
│   ├── HomePage
│   │   ├── Navigation
│   │   ├── HeroSection
│   │   ├── StatsSection
│   │   ├── HowItWorksSection
│   │   ├── TestimonialSection
│   │   ├── FAQSection
│   │   └── Footer
│   ├── LoginPage
│   ├── SignupPage
│   └── NotFoundPage
│
└── Protected Pages (ProtectedRoute)
    ├── DashboardPage
    │   ├── AdminDashboard
    │   ├── BeneficiaryDashboard
    │   └── DonorDashboard
    ├── ReliefMap
    └── BeneficiaryWizard
```

## 📱 Responsive Design

All components are fully responsive:

```
Mobile    (< 640px)  : Single column, touch-optimized
Tablet    (640-1024px): 2-3 columns
Desktop   (> 1024px)  : Full layout with sidebar
```

Example:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Responsive grid */}
</div>
```

## 🎯 Key Features Walkthrough

### 1. **Login Flow**
- Navigate to `/login`
- Enter demo credentials (password: `password123`)
- Click "Sign In" or use demo buttons
- Automatically redirected to dashboard

### 2. **Dashboard**
- View role-specific interface
- Switch roles (in sidebar)
- Access quick actions
- Logout option

### 3. **Beneficiary Applications**
- View all applications
- See status and timeline
- Track AI findings
- Download documents

### 4. **Donor Tracking**
- View donation history
- See impact metrics
- Download tax receipts
- Browse recommended campaigns

### 5. **Landing Page**
- Fully responsive hero
- Scrollable sections
- Call-to-action buttons
- FAQ with expandable items

## 🛠️ Development Workflow

### 1. **Running Locally**
```bash
npm install          # Install dependencies
npm run dev         # Start dev server (http://localhost:5173)
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run linter
```

### 2. **Adding New Components**

**Step 1**: Create component file
```jsx
// src/components/feature/NewComponent.jsx
export const NewComponent = ({ prop1, prop2 }) => {
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

**Step 2**: Import and use in parent
```jsx
import { NewComponent } from './components/feature/NewComponent';

export default function ParentComponent() {
  return <NewComponent prop1="value" />;
}
```

### 3. **Adding New Pages**

**Step 1**: Create page component
```jsx
// src/pages/NewPage.jsx
export default function NewPage() {
  return <div>{/* Page content */}</div>;
}
```

**Step 2**: Add route in App.jsx
```jsx
<Route 
  path="/new-page" 
  element={
    <ProtectedRoute>
      <NewPage />
    </ProtectedRoute>
  } 
/>
```

### 4. **Using Authentication**
```jsx
import { useAuth } from '../hooks/useAuth';

export default function MyComponent() {
  const { currentUser, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return (
    <div>
      <p>Welcome, {currentUser.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## 📊 State Management

### AuthContext
Manages global authentication state:
- `currentUser` - Current logged-in user
- `isLoading` - Loading state
- `error` - Error messages
- `isAuthenticated` - Authentication status
- `login()` - Login function
- `signup()` - Signup function
- `logout()` - Logout function

### Usage Example
```jsx
const { currentUser, logout } = useAuth();
```

## 🎨 Styling

Uses **Tailwind CSS** with custom colors:

### Primary Colors
```css
--primary: #087E83 (Teal)
--primary-dark: #123B4A (Dark Teal)
--success: #16845B (Green)
--bg: #F6F8F9 (Light Gray)
```

### Common Patterns
```jsx
// Button styles
className="bg-[#087E83] hover:bg-[#123B4A] text-white font-semibold px-4 py-2 rounded-lg"

// Card styles
className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"

// Text styles
className="text-2xl font-bold text-slate-900"
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login with all demo accounts
- [ ] Signup as new user
- [ ] Logout functionality
- [ ] Role switching (in dashboard)
- [ ] All navigation links work
- [ ] Responsive on mobile
- [ ] Error pages display correctly
- [ ] Protected routes redirect unauthenticated users

### Test Demo Accounts
```
Email                    Role          Password
─────────────────────────────────────────────────
alok.v@reliefpay.org    Admin         password123
s.jenkins@reliefpay.org Reviewer      password123
ayesha.k@gmail.com      Beneficiary   password123
mehta.r@techcorp.in     Donor         password123
```

## 🐛 Debugging

### Browser Console
1. Open DevTools (F12)
2. Check Console tab for errors
3. Look at Network tab for API calls
4. Use Redux DevTools if added

### Common Issues

**Issue**: Page redirects to login
**Solution**: Check if route is protected, ensure you're authenticated

**Issue**: Demo login fails
**Solution**: Ensure email matches exactly, password is `password123`

**Issue**: Styling looks wrong
**Solution**: Clear cache (Ctrl+Shift+Delete), restart dev server

## 📈 Performance Tips

1. **Code Splitting**
   ```jsx
   const LazyComponent = lazy(() => import('./Component'));
   ```

2. **Memoization**
   ```jsx
   export const Component = memo(({ prop }) => {...});
   ```

3. **Image Optimization**
   - Use WebP format
   - Lazy load images
   - Use appropriate sizes

4. **Bundle Analysis**
   ```bash
   npm run build -- --analyze
   ```

## 🔒 Security Checklist

- [ ] HTTPS enforced in production
- [ ] API keys not exposed in frontend
- [ ] User tokens stored securely
- [ ] CORS properly configured
- [ ] Input validation on all forms
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Password hashed on backend

## 📚 Dependencies

### Core Libraries
- `react@18.2.0` - UI library
- `react-dom@18.2.0` - DOM rendering
- `react-router-dom@6+` - Routing (NEW)

### UI & Styling
- `tailwindcss@3.4.1` - Styling
- `lucide-react@0.344.0` - Icons

### Maps
- `leaflet@1.9.4` - Mapping library
- `react-leaflet@4.2.1` - React wrapper

### Utilities
- `clsx@2.1.0` - Class merging
- `tailwind-merge@2.2.1` - Tailwind merging

### Dev Dependencies
- `vite@5.1.4` - Build tool
- `eslint` - Code quality
- `tailwindcss` - CSS framework

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

## 📞 Support & Resources

### Internal Documentation
- `PROJECT_DOCUMENTATION.md` - Full feature roadmap
- `IMPROVEMENTS_SUMMARY.md` - What changed

### External Resources
- [React Docs](https://react.dev)
- [Tailwind Docs](https://tailwindcss.com)
- [React Router Docs](https://reactrouter.com)

## 🎓 Next Steps

### Phase 2 Implementation Order
1. Form validation (React Hook Form)
2. Payment gateway integration
3. Advanced search & filtering
4. Notification system
5. Analytics dashboard
6. Backend API integration
7. Testing suite
8. Accessibility audit

### Recommended Stack Addition
```bash
npm install react-hook-form zod sonner recharts @tanstack/react-query
```

---

**Happy Coding! 🚀**

For questions or issues, refer to the codebase comments or open an issue in the repository.
