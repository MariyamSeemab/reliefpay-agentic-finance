import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ChevronRight, ChevronLeft, Check, AlertCircle, Upload, FileText } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';

export default function EmergencyApplicationPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId] = useState(`RPA-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`);
  
  const [formData, setFormData] = useState({
    // Personal
    fullName: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
    
    // Application Type
    emergencyType: '',
    disasterType: '',
    disasterLocation: '',
    
    // Damage Assessment
    propertyDamageLevel: '',
    damageDescription: '',
    estimatedDamage: '',
    
    // Assistance Required
    assistanceCategory: '',
    requestedAmount: '',
    justification: '',
    
    // Bank Details
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    ifscCode: '',
    
    // Declaration
    acceptTerms: false,
    consentVerification: false,
  });

  const [errors, setErrors] = useState({});

  const steps = [
    { number: 1, title: 'Personal Info', fields: ['fullName', 'email', 'phone'] },
    { number: 2, title: 'Disaster Info', fields: ['emergencyType', 'disasterType', 'disasterLocation'] },
    { number: 3, title: 'Damage Assessment', fields: ['propertyDamageLevel', 'damageDescription', 'estimatedDamage'] },
    { number: 4, title: 'Assistance Needed', fields: ['assistanceCategory', 'requestedAmount', 'justification'] },
    { number: 5, title: 'Documents', fields: [] },
    { number: 6, title: 'Payment Details', fields: ['bankName', 'accountHolder', 'accountNumber', 'ifscCode'] },
    { number: 7, title: 'Review & Submit', fields: [] },
  ];

  const emergencyTypes = [
    'Flood relief',
    'Fire relief',
    'Earthquake assistance',
    'Medical emergency assistance',
    'Housing damage assistance',
    'Food and essential supplies',
    'Financial assistance',
    'Other emergency support'
  ];

  const assistanceCategories = [
    'Emergency shelter',
    'Food supplies',
    'Medical care',
    'Financial assistance',
    'Clothing & bedding',
    'Water & sanitation',
    'Infrastructure repair',
    'Livelihood support'
  ];

  const disasterTypes = [
    'Flash Flooding',
    'Riverine Flooding',
    'Landslide',
    'Earthquake',
    'Fire/Wildfire',
    'Storm/Cyclone',
    'Disease Outbreak',
    'Other'
  ];

  const validateField = (name, value) => {
    const fieldErrors = {};
    
    switch (name) {
      case 'fullName':
        if (!value.trim()) fieldErrors.fullName = 'Full name is required';
        break;
      case 'email':
        if (!value) fieldErrors.email = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fieldErrors.email = 'Valid email required';
        break;
      case 'phone':
        if (!value) fieldErrors.phone = 'Phone is required';
        if (!/^\+?91?[0-9]{10}$/.test(value.replace(/\s/g, ''))) fieldErrors.phone = 'Valid phone required';
        break;
      case 'emergencyType':
        if (!value) fieldErrors.emergencyType = 'Emergency type is required';
        break;
      case 'disasterType':
        if (!value) fieldErrors.disasterType = 'Disaster type is required';
        break;
      case 'disasterLocation':
        if (!value.trim()) fieldErrors.disasterLocation = 'Location is required';
        break;
      case 'propertyDamageLevel':
        if (!value) fieldErrors.propertyDamageLevel = 'Damage level is required';
        break;
      case 'damageDescription':
        if (!value.trim()) fieldErrors.damageDescription = 'Damage description is required';
        break;
      case 'estimatedDamage':
        if (!value) fieldErrors.estimatedDamage = 'Estimated damage is required';
        if (isNaN(value) || parseInt(value) < 0) fieldErrors.estimatedDamage = 'Valid amount required';
        break;
      case 'assistanceCategory':
        if (!value) fieldErrors.assistanceCategory = 'Assistance category is required';
        break;
      case 'requestedAmount':
        if (!value) fieldErrors.requestedAmount = 'Requested amount is required';
        if (isNaN(value) || parseInt(value) < 1000) fieldErrors.requestedAmount = 'Minimum amount is ₹1,000';
        break;
      case 'justification':
        if (!value.trim()) fieldErrors.justification = 'Please explain why you need this assistance';
        if (value.length < 20) fieldErrors.justification = 'Please provide more detail (min 20 characters)';
        break;
      case 'bankName':
        if (!value.trim()) fieldErrors.bankName = 'Bank name is required';
        break;
      case 'accountHolder':
        if (!value.trim()) fieldErrors.accountHolder = 'Account holder name is required';
        break;
      case 'accountNumber':
        if (!value) fieldErrors.accountNumber = 'Account number is required';
        if (!/^[0-9]{9,18}$/.test(value)) fieldErrors.accountNumber = 'Valid account number required';
        break;
      case 'ifscCode':
        if (!value) fieldErrors.ifscCode = 'IFSC code is required';
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) fieldErrors.ifscCode = 'Valid IFSC code required';
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
    
    if (stepNumber === 5 && uploadedFiles.length === 0) {
      stepErrors.documents = 'Please upload at least one document';
    }
    
    return stepErrors;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      id: Math.random(),
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (errors.documents) {
      const newErrors = { ...errors };
      delete newErrors.documents;
      setErrors(newErrors);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
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
    if (!formData.acceptTerms || !formData.consentVerification) {
      setErrors({
        declaration: 'You must accept all terms and consent to proceed'
      });
      return;
    }

    setSubmitted(true);
    console.log('Application submitted:', { ...formData, applicationId, documents: uploadedFiles });
    // In real app, would submit to backend
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-slate-600 mb-2">
            Your emergency assistance application has been successfully received.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600">Application Reference:</p>
            <p className="text-lg font-mono font-bold text-blue-600">{applicationId}</p>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            You will receive updates via SMS and email. Our AI verification team will review your application within 24-48 hours.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <BackButton to="/dashboard" label="Back to Dashboard" />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Emergency Assistance Application</h1>
          <p className="text-slate-600">Apply for emergency aid and relief assistance</p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border border-slate-200 overflow-x-auto">
          <div className="flex gap-2 min-w-min">
            {steps.map((step, idx) => (
              <React.Fragment key={step.number}>
                <button
                  onClick={() => {
                    if (step.number < currentStep) setCurrentStep(step.number);
                  }}
                  className={`flex flex-col items-center flex-shrink-0 ${
                    step.number < currentStep ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-colors whitespace-nowrap ${
                      step.number < currentStep
                        ? 'bg-emerald-500 text-white'
                        : step.number === currentStep
                        ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-300'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step.number < currentStep ? <Check className="w-5 h-5" /> : step.number}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    step.number <= currentStep ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </span>
                </button>

                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 min-w-4 rounded transition-colors ${
                      step.number < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  ></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form */}
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
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.phone ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="+91 98765 43210"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Disaster Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type of Emergency *</label>
                <select
                  name="emergencyType"
                  value={formData.emergencyType}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.emergencyType ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select emergency type</option>
                  {emergencyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.emergencyType && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.emergencyType}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Disaster Type *</label>
                <select
                  name="disasterType"
                  value={formData.disasterType}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.disasterType ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select disaster type</option>
                  {disasterTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.disasterType && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.disasterType}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Location Affected *</label>
                <input
                  type="text"
                  name="disasterLocation"
                  value={formData.disasterLocation}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.disasterLocation ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="e.g., Mumbra Sector 4, Thane"
                />
                {errors.disasterLocation && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.disasterLocation}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Damage Assessment</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Level of Property Damage *</label>
                <select
                  name="propertyDamageLevel"
                  value={formData.propertyDamageLevel}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.propertyDamageLevel ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select damage level</option>
                  <option value="Minimal">Minimal (Minor damage)</option>
                  <option value="Moderate">Moderate (Partial damage)</option>
                  <option value="Severe">Severe (Significant damage)</option>
                  <option value="Total">Total (Complete loss)</option>
                </select>
                {errors.propertyDamageLevel && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.propertyDamageLevel}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description of Damage *</label>
                <textarea
                  name="damageDescription"
                  value={formData.damageDescription}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.damageDescription ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Describe the damage caused by the disaster"
                  rows="4"
                />
                {errors.damageDescription && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.damageDescription}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Estimated Damage Amount (₹) *</label>
                <input
                  type="number"
                  name="estimatedDamage"
                  value={formData.estimatedDamage}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.estimatedDamage ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="0"
                  min="0"
                />
                {errors.estimatedDamage && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.estimatedDamage}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Assistance Required</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type of Assistance *</label>
                <select
                  name="assistanceCategory"
                  value={formData.assistanceCategory}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.assistanceCategory ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select assistance category</option>
                  {assistanceCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.assistanceCategory && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.assistanceCategory}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Amount Requested (₹) *</label>
                <input
                  type="number"
                  name="requestedAmount"
                  value={formData.requestedAmount}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.requestedAmount ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Minimum ₹1,000"
                  min="1000"
                />
                {errors.requestedAmount && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.requestedAmount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Justification *</label>
                <textarea
                  name="justification"
                  value={formData.justification}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.justification ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Explain why you need this assistance and how it will help you"
                  rows="4"
                />
                {errors.justification && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.justification}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Document Uploads</h2>
              <p className="text-slate-600">Upload supporting documents to strengthen your application</p>
              
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-400 transition">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="fileUpload"
                />
                <label htmlFor="fileUpload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-700 font-medium">Drag and drop files or click to browse</p>
                  <p className="text-slate-500 text-sm">Accepted: PDF, JPG, PNG (Max 5MB each)</p>
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-900">Uploaded Files ({uploadedFiles.length})</h3>
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {errors.documents && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.documents}
                </p>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Suggested documents:</strong> Identity proof, address proof, income proof, damage photographs, medical documents, certificates
                </p>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Bank Account Details</h2>
              <p className="text-slate-600">This is where assistance funds will be transferred</p>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name *</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.bankName ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="e.g., HDFC Bank, SBI"
                />
                {errors.bankName && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.bankName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Account Holder Name *</label>
                <input
                  type="text"
                  name="accountHolder"
                  value={formData.accountHolder}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                    errors.accountHolder ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Name as per bank records"
                />
                {errors.accountHolder && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.accountHolder}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Account Number *</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                      errors.accountNumber ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="Account number"
                  />
                  {errors.accountNumber && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {errors.accountNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">IFSC Code *</label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition ${
                      errors.ifscCode ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="e.g., HDFC0001234"
                    maxLength="11"
                  />
                  {errors.ifscCode && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {errors.ifscCode}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900">
                  <strong>Important:</strong> All bank details must match your government ID. We never share this information publicly.
                </p>
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Review & Submit Application</h2>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-900">
                  <strong>Application Reference:</strong> {applicationId}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2 text-sm">Disaster Details</h3>
                  <div className="text-sm space-y-1 text-slate-600">
                    <p><span className="font-medium">Type:</span> {formData.emergencyType}</p>
                    <p><span className="font-medium">Disaster:</span> {formData.disasterType}</p>
                    <p><span className="font-medium">Location:</span> {formData.disasterLocation}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2 text-sm">Assistance Details</h3>
                  <div className="text-sm space-y-1 text-slate-600">
                    <p><span className="font-medium">Category:</span> {formData.assistanceCategory}</p>
                    <p><span className="font-medium">Amount:</span> ₹{parseInt(formData.requestedAmount || 0).toLocaleString('en-IN')}</p>
                    <p><span className="font-medium">Damage Level:</span> {formData.propertyDamageLevel}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2 text-sm">Bank Account</h3>
                  <div className="text-sm space-y-1 text-slate-600">
                    <p><span className="font-medium">Bank:</span> {formData.bankName}</p>
                    <p><span className="font-medium">Holder:</span> {formData.accountHolder}</p>
                    <p><span className="font-medium">Account:</span> ****{formData.accountNumber?.slice(-4)}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2 text-sm">Documents</h3>
                  <div className="text-sm space-y-1 text-slate-600">
                    <p><span className="font-medium">Files Uploaded:</span> {uploadedFiles.length}</p>
                    {uploadedFiles.slice(0, 2).map((file, idx) => (
                      <p key={idx} className="text-xs truncate">• {file.name}</p>
                    ))}
                    {uploadedFiles.length > 2 && (
                      <p className="text-xs">+ {uploadedFiles.length - 2} more...</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleInputChange}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">
                    I certify that the information provided is true and accurate to the best of my knowledge. I understand that providing false information may result in disqualification.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consentVerification"
                    checked={formData.consentVerification}
                    onChange={handleInputChange}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">
                    I consent to ReliefPay conducting verification, document review, AI analysis, and field checks. I authorize sharing my information with authorized personnel.
                  </span>
                </label>

                {errors.declaration && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {errors.declaration}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
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
                Submit Application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
