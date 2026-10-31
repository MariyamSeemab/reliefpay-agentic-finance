import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { BeneficiaryDashboard } from '../components/dashboard/BeneficiaryDashboard';
import { DonorDashboard } from '../components/dashboard/DonorDashboard';
import { VolunteerDashboard } from '../components/dashboard/VolunteerDashboard';
import { AuditorDashboard } from '../components/dashboard/AuditorDashboard';
import { Heart, LogOut, Settings, User, Menu, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatMoney } from '../lib/money';

const STAFF_ROLES = ['ADMIN', 'REVIEWER'];

// Flattens payout batch items into one row per beneficiary payment.
function payoutTransactions(batches) {
  return batches.flatMap((batch) =>
    batch.items.map((item) => ({
      id: item.id,
      beneficiaryName: item.beneficiaryName,
      campaignTitle: batch.campaignTitle,
      amount: item.amount,
      currency: batch.currency,
      status: item.status,
      timestamp: batch.releasedAt || batch.createdAt,
    })),
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [campaigns, setCampaigns] = useState([]);
  const [applications, setApplications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffError, setStaffError] = useState('');

  const isStaff = STAFF_ROLES.includes(currentUser?.role) || !currentUser?.role;
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (!isStaff) return undefined;
    let cancelled = false;
    setStaffLoading(true);
    setStaffError('');
    Promise.all([
      apiFetch('/campaigns', { auth: false }),
      apiFetch('/applications'),
      // Payout batches are visible to ADMIN and AUDITOR only.
      isAdmin ? apiFetch('/payouts') : Promise.resolve({ batches: [] }),
    ])
      .then(([campaignRes, applicationRes, payoutRes]) => {
        if (cancelled) return;
        setCampaigns(campaignRes.campaigns);
        setApplications(applicationRes.applications);
        setTransactions(payoutTransactions(payoutRes.batches));
      })
      .catch((err) => { if (!cancelled) setStaffError(err.message || 'Could not load dashboard data'); })
      .finally(() => { if (!cancelled) setStaffLoading(false); });
    return () => { cancelled = true; };
  }, [isStaff, isAdmin]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderAdminDashboard = () => {
    if (staffLoading || staffError) {
      return (
        <div className={`bg-white rounded-2xl border border-slate-200 p-8 text-center ${staffError ? 'text-red-700' : 'text-slate-600'}`}>
          {staffError || 'Loading dashboard data…'}
        </div>
      );
    }
    return <AdminDashboard campaigns={campaigns} applications={applications} transactions={transactions} />;
  };

  const renderDashboard = () => {
    switch (currentUser?.role) {
      case 'ADMIN':
      case 'REVIEWER':
        return renderAdminDashboard();
      case 'BENEFICIARY':
        return <BeneficiaryDashboard currentUser={currentUser} />;
      case 'DONOR':
        return <DonorDashboard currentUser={currentUser} />;
      case 'VOLUNTEER':
        return <VolunteerDashboard currentUser={currentUser} />;
      case 'AUDITOR':
        return <AuditorDashboard currentUser={currentUser} />;
      default:
        return renderAdminDashboard();
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      ADMIN: 'bg-purple-100 text-purple-700',
      REVIEWER: 'bg-blue-100 text-blue-700',
      BENEFICIARY: 'bg-emerald-100 text-emerald-700',
      DONOR: 'bg-pink-100 text-pink-700',
      VOLUNTEER: 'bg-amber-100 text-amber-700',
      AUDITOR: 'bg-slate-100 text-slate-700',
    };
    return colors[role] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-[#F6F8F9]">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Sidebar Toggle */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <img src="/imgs/logo.png" alt="ReliefPay Logo" className="h-10 w-auto" />
              </button>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{currentUser?.name}</p>
                  <p className={`text-xs px-2 py-0.5 rounded ${getRoleColor(currentUser?.role)}`}>
                    {currentUser?.role}
                  </p>
                </div>
              </div>

              <button className="p-2 hover:bg-slate-100 rounded-lg">
                <Settings className="w-5 h-5 text-slate-600" />
              </button>

              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 rounded-lg text-red-600"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="hidden lg:block w-64 bg-white border-r border-slate-200 min-h-screen p-6 space-y-8">
            {/* User Profile Card */}
            <div className="bg-gradient-to-br from-[#123B4A] to-[#087E83] rounded-2xl p-6 text-white space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold">{currentUser?.name}</p>
                <p className="text-sm opacity-75">{currentUser?.org}</p>
              </div>
              <div className="pt-3 border-t border-white/20">
                <p className="text-xs opacity-75">Role</p>
                <p className="font-semibold">{currentUser?.role}</p>
              </div>
            </div>

            {/* Main Navigation */}
            <div className="space-y-3">
              <button 
                onClick={() => setActiveSection('dashboard')}
                className={`w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition border ${
                  activeSection === 'dashboard'
                    ? 'bg-slate-100 text-slate-900 border-slate-300'
                    : 'text-slate-900 hover:bg-slate-100 border-slate-200'
                }`}
              >
                Dashboard
              </button>
            </div>

            {/* Additional Links by Role */}
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'REVIEWER') && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-slate-500 px-3">Management & Verification</p>
                <button 
                  onClick={() => navigate('/admin/applications')}
                  className="w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition text-slate-900 hover:bg-slate-100 border border-slate-200"
                >
                  Applications
                </button>
                <button 
                  onClick={() => navigate('/admin/ai-verification')}
                  className="w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition text-slate-900 hover:bg-slate-100 border border-slate-200"
                >
                  AI Verification
                </button>
                <button 
                  onClick={() => navigate('/admin/ai-command-centre')}
                  className="w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition text-slate-900 hover:bg-slate-100 border border-slate-200"
                >
                  AI Command Centre
                </button>
                <button 
                  onClick={() => navigate('/admin/payment-agent')}
                  className="w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition text-slate-900 hover:bg-slate-100 border border-slate-200"
                >
                  Payment Agent
                </button>
              </div>
            )}

            {currentUser?.role === 'BENEFICIARY' && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-slate-500 px-3">Applications</p>
                <button 
                  onClick={() => navigate('/beneficiary/registration')}
                  className="w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition text-slate-900 hover:bg-slate-100 border border-slate-200"
                >
                  Register
                </button>
                <button 
                  onClick={() => navigate('/beneficiary/application/new')}
                  className="w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition text-slate-900 hover:bg-slate-100 border border-slate-200"
                >
                  New Application
                </button>
                <button 
                  onClick={() => setActiveSection('my-records')}
                  className={`w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition border ${
                    activeSection === 'my-records'
                      ? 'bg-slate-100 text-slate-900 border-slate-300'
                      : 'text-slate-900 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  My Records
                </button>
              </div>
            )}

            {currentUser?.role === 'DONOR' && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-slate-500 px-3">Donations</p>
                <button 
                  onClick={() => navigate('/campaigns')}
                  className="w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition text-slate-900 hover:bg-slate-100 border border-slate-200"
                >
                  Browse Campaigns
                </button>
                <button 
                  onClick={() => setActiveSection('my-donations')}
                  className={`w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition border ${
                    activeSection === 'my-donations'
                      ? 'bg-slate-100 text-slate-900 border-slate-300'
                      : 'text-slate-900 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  My Donations
                </button>
                <button 
                  onClick={() => setActiveSection('receipts')}
                  className={`w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition border ${
                    activeSection === 'receipts'
                      ? 'bg-slate-100 text-slate-900 border-slate-300'
                      : 'text-slate-900 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  Tax Receipts
                </button>
              </div>
            )}

            {currentUser?.role === 'VOLUNTEER' && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-slate-500 px-3">Field Work</p>
                <button 
                  onClick={() => setActiveSection('tasks')}
                  className={`w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition border ${
                    activeSection === 'tasks'
                      ? 'bg-slate-100 text-slate-900 border-slate-300'
                      : 'text-slate-900 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  My Tasks
                </button>
                <button 
                  onClick={() => setActiveSection('evidence')}
                  className={`w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition border ${
                    activeSection === 'evidence'
                      ? 'bg-slate-100 text-slate-900 border-slate-300'
                      : 'text-slate-900 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  Upload Evidence
                </button>
              </div>
            )}

            {currentUser?.role === 'AUDITOR' && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-slate-500 px-3">Compliance</p>
                <button 
                  onClick={() => setActiveSection('audit-logs')}
                  className={`w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition border ${
                    activeSection === 'audit-logs'
                      ? 'bg-slate-100 text-slate-900 border-slate-300'
                      : 'text-slate-900 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  Audit Logs
                </button>
                <button 
                  onClick={() => setActiveSection('reports')}
                  className={`w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition border ${
                    activeSection === 'reports'
                      ? 'bg-slate-100 text-slate-900 border-slate-300'
                      : 'text-slate-900 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  Export Reports
                </button>
              </div>
            )}

            {/* Logout */}
            <div className="pt-6 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-[calc(100vh-64px)]">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Show dashboard by default or when dashboard is selected */}
            {activeSection === 'dashboard' && renderDashboard()}
            
            {/* Admin/Reviewer: Applications section */}
            {activeSection === 'applications' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'REVIEWER') && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">Applications</h2>
                {renderAdminDashboard()}
              </div>
            )}

            {/* Admin/Reviewer: Transactions section */}
            {activeSection === 'transactions' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'REVIEWER') && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">Transactions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {transactions.map((txn) => (
                    <div key={txn.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <p className="font-bold text-slate-900">{txn.beneficiaryName}</p>
                        <span className={`text-xs font-bold px-3 py-1 rounded ${
                          txn.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {txn.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{txn.campaignTitle}</p>
                      <p className="text-2xl font-bold text-slate-900 mb-2">{formatMoney(txn.amount, txn.currency)}</p>
                      <p className="text-xs text-slate-500">{txn.timestamp ? new Date(txn.timestamp).toLocaleString() : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Beneficiary: My Records section */}
            {activeSection === 'my-records' && currentUser?.role === 'BENEFICIARY' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">My Application Records</h2>
                <BeneficiaryDashboard currentUser={currentUser} />
              </div>
            )}

            {/* Donor: Tax Receipts */}
            {activeSection === 'receipts' && currentUser?.role === 'DONOR' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">Tax Receipts</h2>
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                  <p className="text-slate-600 mb-4">Download your tax receipts for donations</p>
                  <button className="bg-[#087E83] hover:bg-[#123B4A] text-white font-bold px-6 py-2 rounded-lg transition">
                    📥 Download All Receipts
                  </button>
                </div>
              </div>
            )}

            {/* Donor: My Donations */}
            {activeSection === 'my-donations' && currentUser?.role === 'DONOR' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">My Donations</h2>
                <DonorDashboard currentUser={currentUser} />
              </div>
            )}

            {/* Volunteer: My Tasks */}
            {activeSection === 'tasks' && currentUser?.role === 'VOLUNTEER' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">My Field Tasks</h2>
                <VolunteerDashboard currentUser={currentUser} />
              </div>
            )}

            {/* Volunteer: Upload Evidence */}
            {activeSection === 'evidence' && currentUser?.role === 'VOLUNTEER' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">Upload Evidence</h2>
                <div className="bg-white rounded-2xl border border-slate-200 p-8">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
                    <p className="text-slate-600 mb-4">📸 Drag and drop photos or click to upload</p>
                    <button className="bg-[#087E83] hover:bg-[#123B4A] text-white font-bold px-6 py-2 rounded-lg transition">
                      Choose Files
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Auditor: Audit Logs */}
            {activeSection === 'audit-logs' && currentUser?.role === 'AUDITOR' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">Audit Logs</h2>
                <AuditorDashboard currentUser={currentUser} />
              </div>
            )}

            {/* Auditor: Export Reports */}
            {activeSection === 'reports' && currentUser?.role === 'AUDITOR' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900">Export Reports</h2>
                <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
                  <button className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:shadow-lg text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                    📊 Compliance Report
                  </button>
                  <button className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:shadow-lg text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                    💰 Financial Summary
                  </button>
                  <button className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:shadow-lg text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                    📈 Performance Metrics
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
