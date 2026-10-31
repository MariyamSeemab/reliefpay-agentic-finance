import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import CampaignsPage from './pages/CampaignsPage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import BeneficiaryRegistrationPage from './pages/BeneficiaryRegistrationPage';
import EmergencyApplicationPage from './pages/EmergencyApplicationPage';
import ApplicationManagementPage from './pages/ApplicationManagementPage';
import AIVerificationPage from './pages/AIVerificationPage';
import AICommandCentrePage from './pages/AICommandCentrePage';
import PaymentAgentPage from './pages/PaymentAgentPage';

// Legacy components (kept for compatibility)
import { ReliefMap } from './components/map/ReliefMap';
import { BeneficiaryWizard } from './components/beneficiary/BeneficiaryWizard';
import { INITIAL_CAMPAIGNS, INITIAL_APPLICATIONS } from './data/mockData';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes - Home Page is default */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/beneficiary/registration"
            element={
              <ProtectedRoute>
                <BeneficiaryRegistrationPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/beneficiary/application/new"
            element={
              <ProtectedRoute>
                <EmergencyApplicationPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'REVIEWER']}>
                <ApplicationManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/ai-verification"
            element={
              <ProtectedRoute requiredRoles={['ADMIN', 'REVIEWER']}>
                <AIVerificationPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/ai-command-centre"
            element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <AICommandCentrePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/payment-agent"
            element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <PaymentAgentPage />
              </ProtectedRoute>
            }
          />

          {/* Legacy Routes - Will be removed after full migration */}
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <ReliefMap campaigns={INITIAL_CAMPAIGNS} applications={INITIAL_APPLICATIONS} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply"
            element={
              <ProtectedRoute>
                <BeneficiaryWizard campaigns={INITIAL_CAMPAIGNS} />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}