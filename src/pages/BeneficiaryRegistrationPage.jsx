import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';
import { formatMoney } from '../lib/money';

export default function BeneficiaryRegistrationPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: '',
    email: '',
    mobileNumber: '',
    
    // Address
    residentialAddress: '',
    city: '',
    state: '',
    pinCode: '',
    
    // Household
    familySize: '',
    dependents: '',
    occupation: '',
    monthlyIncome: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const steps = [
    { number: 1, title: 'Personal Info', fields: ['fullName', 'email', 'mobileNumber'] },
    { number: 2, title: 'Address', fields: ['residentialAddress', 'city', 'state', 'pinCode'] },
    { number: 3, title: 'Household', fields: ['familySize', 'dependents', 'occupation', 'monthlyIncome'] },
    { number: 4, title: 'Emergency Contact', fields: ['emergencyContactName', 'emergencyContactPhone'] },
    { number: 5, title: 'Review & Confirm', fields: [] },
  ];

  const validateField = (name, value) => {
    const fieldErrors = {};
    
    switch (name) {
      case 'fullName':
        if (!value.trim()) fieldErrors.fullName = 'Full name is required';
        if (value.length < 3) fieldErrors.fullName = 'Name must be at least 3 characters';
        break;
      case 'email':
        if (!value) fieldErrors.email = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fieldErrors.email = 'Valid email required';
        break;
      case 'mobileNumber':
        if (!value) fieldErrors.mobileNumber = 'Mobile number is required';
        if (!/^\+?91?[0-9]{10}$/.test(value.replace(/\s/g, ''))) fieldErrors.mobileNumber = 'Valid Indian phone required';
        break;
      case 'residentialAddress':
        if (!value.trim()) fieldErrors.residentialAddress = 'Address is required';
        break;
      case 'city':
        if (!value.trim()) fieldErrors.city = 'City is required';
        break;
      case 'state':
        if (!value) fieldErrors.state = 'State is required';
        break;
      case 'pinCode':
        if (!value) fieldErrors.pinCode = 'PIN code is required';
        if (!/^[0-9]{6}$/.test(value)) fieldErrors.pinCode = 'Valid 6-digit PIN code required';
        break;
      case 'familySize':
        if (!value) fieldErrors.familySize = 'Family size is required';
        if (isNaN(value) || parseInt(value) < 1) fieldErrors.familySize = 'Valid family size required';
        break;
      case 'dependents':
        if (!value) fieldErrors.dependents = 'Number of dependents is required';
        if (isNaN(value) || parseInt(value) < 0) fieldErrors.dependents = 'Valid number required';
        break;
      case 'occupation':
        if (!value.trim()) fieldErrors.occupation = 'Occupation is required';
        break;
      case 'monthlyIncome':
        if (!value) fieldErrors.monthlyIncome = 'Monthly income is required';
        if (isNaN(value) || parseInt(value) < 0) fieldErrors.monthlyIncome = 'Valid income required';
        break;
      case 'emergencyContactName':
        if (!value.trim()) fieldErrors.emergencyContactName = 'Emergency contact name is required';
        break;
      case 'emergencyContactPhone':
        if (!value) fieldErrors.emergencyContactPhone = 'Emergency contact phone is required';
        if (!/^\+?91?[0-9]{10}$/.test(value.replace(/\s/g, ''))) fieldErrors.emergencyContactPhone = 'Valid phone required';
        break;
      default:
        break;
    }
    
    return fieldErrors;
  };

  const validateStep = (stepNumber) => {
    const stepFields = steps[stepNumber - 1].fields;
    const stepErrors = {};
    
    stepFields.forEach(field => {
      const fieldErrors = validateField(field, formData[field]);
      Object.assign(stepErrors, fieldErrors);
    });
    
    return stepErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length === 0) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      }
    } else {
      setErrors(stepErrors);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = () => {
    // Final validation of all fields
    const allErrors = {};
    steps.forEach(step => {
      step.fields.forEach(field => {
        const fieldErrors = validateField(field, formData[field]);
        Object.assign(allErrors, fieldErrors);
      });
    });

    if (Object.keys(allErrors).length === 0) {
      setSubmitted(true);
      // In real app, would submit to backend here
      console.log('Registration submitted:', formData);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } else {
      setErrors(allErrors);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Successful!</h2>
          <p className="text-slate-600 mb-6">
            Your beneficiary profile has been created. You can now apply for emergency assistance.
          </p>
          <p className="text-sm text-slate-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <BackButton to="/dashboard" label="Back to Dashboard" />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Beneficiary Registration</h1>
          <p className="text-slate-600">Complete your profile to apply for emergency assistance</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <React.Fragment key={step.number}>
                <button
                  onClick={() => {
                    // Only allow clicking on previous steps or current
                    if (step.number <= currentStep) {
                      setCurrentStep(step.number);
                    }
                  }}
                  className={`flex flex-col items-center ${
                    step.number <= currentStep ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-colors ${
                      step.number < currentStep
                        ? 'bg-emerald-500 text-white'
                        : step.number === currentStep
                        ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-300'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.number < currentStep ? <Check className="w-5 h-5" /> : step.number}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      step.number <= currentStep ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </button>

                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-colors ${
                      step.number < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  ></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Personal Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.fullName ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.email ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Number *</label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.mobileNumber ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="+91 98765 43210"
                />
                {errors.mobileNumber && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.mobileNumber}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Residential Address</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address *</label>
                <textarea
                  name="residentialAddress"
                  value={formData.residentialAddress}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition rows-3 ${
                    errors.residentialAddress ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Enter your residential address"
                  rows="3"
                />
                {errors.residentialAddress && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.residentialAddress}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                      errors.city ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="City name"
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {errors.city}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">State *</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                      errors.state ? 'border-red-500' : 'border-slate-300'
                    }`}
                  >
                    <option value="">Select State</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Assam">Assam</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Other">Other State</option>
                  </select>
                  {errors.state && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {errors.state}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">PIN Code *</label>
                <input
                  type="text"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.pinCode ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="400605"
                  maxLength="6"
                />
                {errors.pinCode && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.pinCode}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Household Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Family Size *</label>
                  <input
                    type="number"
                    name="familySize"
                    value={formData.familySize}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                      errors.familySize ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="Number of family members"
                    min="1"
                  />
                  {errors.familySize && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {errors.familySize}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Number of Dependents *</label>
                  <input
                    type="number"
                    name="dependents"
                    value={formData.dependents}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                      errors.dependents ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="Children, elderly, disabled"
                    min="0"
                  />
                  {errors.dependents && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {errors.dependents}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Occupation *</label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.occupation ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="e.g., Daily Laborer, Small Shop Owner"
                />
                {errors.occupation && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.occupation}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Monthly Household Income (USD) *</label>
                <input
                  type="number"
                  name="monthlyIncome"
                  value={formData.monthlyIncome}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.monthlyIncome ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Enter monthly household income"
                  min="0"
                />
                {errors.monthlyIncome && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.monthlyIncome}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Emergency Contact</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person Name *</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.emergencyContactName ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Name of emergency contact"
                />
                {errors.emergencyContactName && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.emergencyContactName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contact Phone Number *</label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.emergencyContactPhone ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="+91 98765 43210"
                />
                {errors.emergencyContactPhone && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.emergencyContactPhone}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> In case of emergency, we will contact this person.
                </p>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Review Your Information</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-3">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-600">Name:</span> <span className="font-medium">{formData.fullName}</span></p>
                    <p><span className="text-slate-600">Email:</span> <span className="font-medium">{formData.email}</span></p>
                    <p><span className="text-slate-600">Phone:</span> <span className="font-medium">{formData.mobileNumber}</span></p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-3">Address</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-600">Location:</span> <span className="font-medium">{formData.city}, {formData.state} {formData.pinCode}</span></p>
                    <p><span className="text-slate-600">Full Address:</span> <span className="font-medium">{formData.residentialAddress}</span></p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-3">Household</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-600">Family Size:</span> <span className="font-medium">{formData.familySize} members</span></p>
                    <p><span className="text-slate-600">Dependents:</span> <span className="font-medium">{formData.dependents}</span></p>
                    <p><span className="text-slate-600">Occupation:</span> <span className="font-medium">{formData.occupation}</span></p>
                    <p><span className="text-slate-600">Monthly Income:</span> <span className="font-medium">{formatMoney(parseInt(formData.monthlyIncome, 10))}</span></p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-3">Emergency Contact</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-600">Name:</span> <span className="font-medium">{formData.emergencyContactName}</span></p>
                    <p><span className="text-slate-600">Phone:</span> <span className="font-medium">{formData.emergencyContactPhone}</span></p>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-900">
                  <strong>Important:</strong> Please review all information carefully before submitting. You can edit details in the next step if needed.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8 border-t border-slate-200 pt-6">
            <button
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition ${
                currentStep === 1
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                className="ml-auto flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="ml-auto flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
              >
                <Check className="w-4 h-4" />
                Complete Registration
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
