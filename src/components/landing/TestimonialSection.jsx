import React from 'react';
import { Star, Quote } from 'lucide-react';

export const TestimonialSection = () => {
  const testimonials = [
    {
      name: 'Ayesha Khan',
      role: 'Beneficiary - Mumbra Flood Relief',
      content: 'ReliefPay helped my family during the hardest time. The process was transparent and I received assistance within days. Thank you for restoring hope.',
      rating: 5,
      avatar: '🙏'
    },
    {
      name: 'Dr. Rajesh Patel',
      role: 'NGO Director',
      content: 'The platform\'s AI screening reduced our verification time by 60%. We can now help more people with the same resources. Incredible system.',
      rating: 5,
      avatar: '👨‍⚕️'
    },
    {
      name: 'Rohan Mehta',
      role: 'Donor',
      content: 'For the first time, I can see exactly where my donation goes. The audit trails and impact reports make me confident in this platform.',
      rating: 5,
      avatar: '💼'
    },
    {
      name: 'Sarah Jenkins',
      role: 'Field Operations Lead',
      content: 'The volunteer task system streamlined our field work completely. We reduced duplicate visits and improved coverage by 40%.',
      rating: 5,
      avatar: '👩‍🔬'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">What People Say</h2>
        <p className="text-sm text-slate-600">Real stories from our community</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testimonials.map((testimonial, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
            {/* Quote Icon */}
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Quote className="w-5 h-5 text-emerald-600" />
              </div>
              {/* Stars */}
              <div className="flex gap-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>

            {/* Content */}
            <p className="text-slate-700 leading-relaxed italic">"{testimonial.content}"</p>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="text-2xl">{testimonial.avatar}</div>
              <div>
                <p className="font-semibold text-slate-900">{testimonial.name}</p>
                <p className="text-xs text-slate-500">{testimonial.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
