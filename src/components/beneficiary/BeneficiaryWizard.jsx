import React, { useState } from 'react';
import { Send, CheckCircle, FileUp, User, MapPin, DollarSign } from 'lucide-react';

export const BeneficiaryWizard = ({ campaigns, onAddApplication, setActiveTab }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    beneficiaryName: '',
    phone: '',
    campaignId: campaigns[0]?.id || '',
    area: '',
    householdMembers: 4,
    disasterType: 'Monsoon Flood Damage',
    requestedAmount: 15000,
    emergencyDescription: ''
  });

  const [submittedId, setSubmittedId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newId = `RPA-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newApp = {
      id: newId,
      ...formData,
      coordinates: [19.1796, 73.0231],
      approvedAmount: formData.requestedAmount,
      priority: 'HIGH',
      status: 'UNDER_REVIEW',
      submittedAt: new Date().toLocaleString(),
      aiFindings: [
        { id: 'aif-new', severity: 'INFO', title: 'New Intake Processed', reason: 'Identity matches phone record. Pending human case officer verification.', fields: [] }
      ],
      timeline: [
        { title: 'Application Submitted', date: new Date().toLocaleString(), actor: `${formData.beneficiaryName} (Beneficiary)` }
      ],
      documents: ['Aadhaar_Upload_Front.pdf', 'Disaster_Site_Proof.jpg']
    };

    onAddApplication(newApp);
    setSubmittedId(newId);
    setStep(4);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-bold text-slate-900">Emergency Assistance Application</h2>
        <p className="text-xs text-slate-500 mt-1">Submit your aid request for fast human-in-the-loop review and direct payout.</p>
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 mt-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= s ? 'bg-[#087E83] text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {s}
              </div>
              <span className="text-xs font-medium text-slate-600 hidden sm:inline">
                {s === 1 ? 'Personal' : s === 2 ? 'Emergency' : 'Uploads'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {step < 4 ? (
        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); setStep(step + 1); }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Step 1: Personal & Contact Information</h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input 
                  type="text"
                  required
                  value={formData.beneficiaryName}
                  onChange={(e) => setFormData({...formData, beneficiaryName: e.target.value})}
                  placeholder="e.g. Ayesha Khan"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#087E83] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number</label>
                <input 
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+91 98200 00000"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#087E83] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Sector / Area</label>
                <input 
                  type="text"
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                  placeholder="e.g. Mumbra Sector 4, Thane"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#087E83] outline-none"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Step 2: Emergency & Grant Breakdown</h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Relief Campaign</label>
                <select
                  value={formData.campaignId}
                  onChange={(e) => setFormData({...formData, campaignId: e.target.value})}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#087E83] outline-none"
                >
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.title} ({c.location})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Assistance Amount (₹)</label>
                <input 
                  type="number"
                  required
                  min="1000"
                  max="100000"
                  value={formData.requestedAmount}
                  onChange={(e) => setFormData({...formData, requestedAmount: Number(e.target.value)})}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#087E83] outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brief Statement of Emergency Need</label>
                <textarea 
                  rows={3}
                  required
                  value={formData.emergencyDescription}
                  onChange={(e) => setFormData({...formData, emergencyDescription: e.target.value})}
                  placeholder="Describe flood damage, medical needs, or lost shelter..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#087E83] outline-none"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Step 3: Identity & Proof Attachments</h3>
              
              <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl text-center space-y-2">
                <FileUp className="w-8 h-8 text-[#087E83] mx-auto" />
                <div className="text-xs font-semibold text-slate-800">Upload Aadhaar ID / Ration Card / Photo Proof</div>
                <p className="text-[11px] text-slate-400">PDF, PNG, or JPG up to 10MB (Simulated)</p>
                <div className="pt-2">
                  <span className="inline-block bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-lg text-xs font-mono">
                    Aadhaar_Card_Masked.pdf (Attached)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
            ) : <div />}

            <button
              type="submit"
              className="bg-[#123B4A] hover:bg-[#087E83] text-white px-6 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow transition"
            >
              <span>{step === 3 ? 'Submit Assistance Request' : 'Continue'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

        </form>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-[#16845B] mx-auto" />
          <h3 className="text-xl font-bold text-slate-900">Application Submitted Successfully</h3>
          <p className="text-xs text-slate-600">Your claim has been logged into the ReliefPay human-in-the-loop review queue.</p>
          
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-xs text-slate-800 font-semibold border">
            Reference Tracking ID: <span className="text-[#087E83] font-bold">{submittedId}</span>
          </div>

          <button
            onClick={() => setActiveTab('landing')}
            className="bg-[#123B4A] text-white px-6 py-2 rounded-xl text-xs font-semibold"
          >
            Return to Dashboard
          </button>
        </div>
      )}

    </div>
  );
};