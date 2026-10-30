import React from 'react';
import { FileText, Zap, Users, DollarSign, ArrowRight } from 'lucide-react';

export const HowItWorksSection = () => {
  const steps = [
    {
      icon: FileText,
      number: '01',
      title: 'Submit Application',
      description: 'Displaced individuals submit emergency assistance applications with required documentation through our secure platform.'
    },
    {
      icon: Zap,
      number: '02',
      title: 'AI Verification',
      description: 'Advanced algorithms instantly screen applications for eligibility while flagging potential fraud indicators.'
    },
    {
      icon: Users,
      number: '03',
      title: 'Human Review',
      description: 'Expert reviewers validate AI findings. Field volunteers verify claims on the ground for complete accuracy.'
    },
    {
      icon: DollarSign,
      number: '04',
      title: 'Instant Payout',
      description: 'Approved funds transfer directly to beneficiary accounts within hours, not days or weeks.'
    },
  ];

  return (
    <div className="space-y-12">
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-slate-900">How ReliefPay Works</h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">Simple, transparent process with AI verification and human oversight at every step</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Desktop: Horizontal Line */}
        <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200"></div>
        
        {/* Mobile: Vertical Line */}
        <div className="lg:hidden absolute top-24 left-8 bottom-0 w-1 bg-gradient-to-b from-emerald-200 via-emerald-400 to-emerald-200"></div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const colors = ['from-emerald-600 to-emerald-700', 'from-blue-600 to-blue-700', 'from-purple-600 to-purple-700', 'from-orange-600 to-orange-700'];
            
            return (
              <div key={idx} className="relative">
                {/* Circle Connector - Desktop */}
                <div className="hidden lg:flex absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className={`w-12 h-12 bg-gradient-to-br ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                    {step.number}
                  </div>
                </div>

                {/* Circle Connector - Mobile */}
                <div className="lg:hidden flex absolute -left-2 top-0">
                  <div className={`w-16 h-16 bg-gradient-to-br ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {step.number}
                  </div>
                </div>

                <div className="lg:mt-28 ml-20 lg:ml-0 space-y-4 lg:text-center bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 border border-slate-200 lg:border-0 lg:bg-transparent hover:shadow-lg transition lg:hover:shadow-none">
                  <div className={`w-14 h-14 bg-gradient-to-br ${colors[idx]} rounded-xl lg:rounded-2xl flex items-center justify-center text-white lg:mx-auto flex-shrink-0`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{step.title}</h3>
                    <p className="text-sm text-slate-600 mt-2">{step.description}</p>
                  </div>
                  
                  {/* Arrow to next step - Desktop */}
                  {idx < steps.length - 1 && (
                    <div className="hidden lg:flex justify-center absolute -right-6 top-20">
                      <div className="text-slate-400 opacity-50">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
