import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: 'Who can apply for emergency assistance?',
      answer: 'Any individual who has been displaced or affected by a registered disaster and meets our eligibility criteria can apply. This includes loss of livelihood, home damage, or immediate medical needs.'
    },
    {
      question: 'How long does the approval process take?',
      answer: 'Most applications are processed within 24-48 hours. Simple cases with complete documentation may be approved within 2-4 hours. You\'ll receive real-time status updates.'
    },
    {
      question: 'How is my data protected?',
      answer: 'We use military-grade encryption for all data. Personal information is masked in reports, and we comply with all privacy regulations. Your data is never sold or shared.'
    },
    {
      question: 'Can I track where my donation goes?',
      answer: 'Yes! Every donation is tracked in real-time. You receive detailed reports showing which beneficiaries were helped, verification status, and impact metrics.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept bank transfers, digital wallets (UPI, NEFT), credit/debit cards, and corporate donations. All transactions are secure and verified.'
    },
    {
      question: 'How can I volunteer with ReliefPay?',
      answer: 'Join our volunteer network! We need field assessors, document verifiers, and community liaisons. Sign up on our platform and complete our training program.'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
        <p className="text-sm text-slate-600">Everything you need to know</p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden transition hover:shadow-md"
          >
            <button
              onClick={() => setOpenIndex(openIndex === idx ? -1 : idx)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
            >
              <span className="font-semibold text-slate-900">{faq.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-slate-600 transition transform ${
                  openIndex === idx ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openIndex === idx && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                <p className="text-sm text-slate-700 leading-relaxed">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Support */}
      <div className="bg-gradient-to-r from-[#087E83]/5 to-[#16845B]/5 border border-slate-200 rounded-lg p-4 text-center">
        <p className="text-sm text-slate-700 mb-3">Didn't find your answer?</p>
        <button className="text-[#087E83] font-semibold text-sm hover:underline">
          Contact our support team →
        </button>
      </div>
    </div>
  );
};
