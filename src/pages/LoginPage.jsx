import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Heart, AlertCircle, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [demoUsers] = useState([
    { email: 'alok.v@reliefpay.org', role: 'Admin', color: 'from-purple-600 to-purple-700' },
    { email: 's.jenkins@reliefpay.org', role: 'Reviewer', color: 'from-blue-600 to-blue-700' },
    { email: 'ayesha.k@gmail.com', role: 'Beneficiary', color: 'from-emerald-600 to-emerald-700' },
    { email: 'mehta.r@techcorp.in', role: 'Donor', color: 'from-pink-600 to-pink-700' },
    { email: 'vikram.s@reliefpay.org', role: 'Volunteer', color: 'from-amber-600 to-amber-700' },
    { email: 'elena@auditcore.org', role: 'Auditor', color: 'from-slate-600 to-slate-700' },
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  const handleDemoLogin = async (demoEmail) => {
    try {
      await login(demoEmail, 'password123');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#123B4A] to-[#087E83] flex items-center justify-center px-4 py-12">
      {/* Main Container */}
      <div className="w-full max-w-2xl">
        {/* Back Button */}
        <div className="mb-8">
          <BackButton to="/" label="Back to Home" isDark={true} />
        </div>
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/imgs/logo.png" alt="ReliefPay Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Welcome Back</h1>
          <p className="text-slate-200 text-lg">Sign in to access your relief dashboard</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Login Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Sign In</h2>

            {/* Error Messages */}
            {(error || authError) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Login Error</p>
                  <p className="text-sm text-red-700">{error || authError}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none transition"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-900 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none transition"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300" disabled={isLoading} />
                  <span className="text-slate-600">Remember me</span>
                </label>
                <button type="button" className="text-[#087E83] hover:text-[#123B4A] font-medium">
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#123B4A] to-[#087E83] hover:shadow-lg text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">New to ReliefPay?</span>
              </div>
            </div>

            {/* Sign Up Link - FIXED */}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              disabled={isLoading}
              className="w-full border-2 border-slate-300 text-slate-900 font-bold py-2.5 rounded-lg hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              Create Account
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Demo Accounts */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-6">Demo Accounts</h2>

            <p className="text-white/60 text-sm mb-4">
              Test different roles and features. All use password: <code className="bg-white/10 px-2 py-1 rounded font-mono text-yellow-200">password123</code>
            </p>

            <div className="space-y-3">
              {demoUsers.map((user) => (
                <button
                  key={user.email}
                  onClick={() => handleDemoLogin(user.email)}
                  disabled={isLoading}
                  className={`w-full bg-gradient-to-r ${user.color} hover:shadow-lg text-white p-4 rounded-xl transition disabled:opacity-50 group border border-white/10 hover:border-white/30`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="font-bold text-sm">{user.role}</p>
                      <p className="text-xs opacity-80 font-mono truncate">{user.email}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition" />
                  </div>
                </button>
              ))}
            </div>

            {/* Info Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mt-6">
              <p className="text-white/80 text-xs leading-relaxed">
                💡 <strong>Tip:</strong> Click any demo account to instantly login and explore that role's dashboard. Perfect for testing all features!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-white/60 text-xs">
            Protected by industry-standard security • Transparent data handling
          </p>
        </div>
      </div>
    </div>
  );
}
