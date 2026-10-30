import React, { useState } from 'react';
import { Send, Zap, Loader, CheckCircle, AlertCircle, TrendingUp, MessageSquare, Target, DollarSign } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';

export default function AICommandCentrePage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      text: 'ReliefPay AI Command Centre initialized. I can help you with relief operations, fund allocation, beneficiary verification, payment processing, and reporting. What would you like to do?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agents] = useState([
    { id: 'orchestrator', name: 'Orchestrator', status: 'active', icon: '🎯' },
    { id: 'verification', name: 'Verification Agent', status: 'idle', icon: '✓' },
    { id: 'allocation', name: 'Allocation Agent', status: 'idle', icon: '💰' },
    { id: 'payment', name: 'Payment Agent', status: 'idle', icon: '💳' },
    { id: 'procurement', name: 'Procurement Agent', status: 'idle', icon: '📦' }
  ]);

  const suggestedPrompts = [
    'Show all critical applications awaiting review',
    'Prepare a disbursement plan for remaining campaign budget',
    'Find campaigns with insufficient funding',
    'Identify failed payments from yesterday',
    'Generate a report of completed beneficiary payments',
    'Find volunteers available for tomorrow'
  ];

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse = generateAIResponse(text);
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (prompt) => {
    const responses = {
      'critical applications': {
        type: 'data',
        title: 'Critical Applications Awaiting Review',
        data: [
          { id: 'RPA-2026-0001', beneficiary: 'Rahim Shaikh', amount: '₹20,000', priority: 'CRITICAL', location: 'Mumbra' },
          { id: 'RPA-2026-0003', beneficiary: 'Priya Nair', amount: '₹18,500', priority: 'CRITICAL', location: 'Wayanad' },
          { id: 'RPA-2026-0005', beneficiary: 'Ajay Kumar', amount: '₹22,000', priority: 'CRITICAL', location: 'Assam' }
        ]
      },
      'disbursement plan': {
        type: 'action',
        title: 'Disbursement Plan Generated',
        action: 'REVIEW_PAYOUT',
        summary: 'I\'ve analyzed the remaining campaign budget and identified 5 eligible beneficiaries. Total payout: ₹87,500. Would you like me to prepare payment details?'
      },
      'insufficient funding': {
        type: 'data',
        title: 'Campaigns with Funding Gaps',
        data: [
          { campaign: 'Kerala Flash Floods', target: '₹12,00,000', collected: '₹9,50,000', gap: '₹2,50,000', progress: '79%' },
          { campaign: 'Assam Relief Fund', target: '₹8,00,000', collected: '₹5,20,000', gap: '₹2,80,000', progress: '65%' }
        ]
      },
      'failed payments': {
        type: 'data',
        title: 'Failed Payments (Last 24 Hours)',
        data: [
          { txnId: 'TXN-880203', beneficiary: 'Vikram Singh', amount: '₹15,000', reason: 'Invalid bank account', status: 'RETRY_NEEDED' },
          { txnId: 'TXN-880204', beneficiary: 'Anjali Devi', amount: '₹12,000', reason: 'Account blocked', status: 'ESCALATE' }
        ]
      },
      'completed payments': {
        type: 'data',
        title: 'Completed Beneficiary Payments',
        data: [
          { txnId: 'TXN-880192', beneficiary: 'Rahim Shaikh', amount: '₹20,000', date: '2026-10-26', campaign: 'Mumbra Relief' },
          { txnId: 'TXN-880195', beneficiary: 'Rajesh Patel', amount: '₹18,000', date: '2026-10-27', campaign: 'Kerala Relief' }
        ]
      },
      'volunteers available': {
        type: 'data',
        title: 'Volunteers Available Tomorrow',
        data: [
          { name: 'Vikram Singh', specialization: 'Field Assessment', location: 'Mumbra', availability: 'Full Day' },
          { name: 'Sarah Jenkins', specialization: 'Document Verification', location: 'Remote', availability: '4 Hours' },
          { name: 'Pradeep Kumar', specialization: 'Field Assessment', location: 'Wayanad', availability: 'Full Day' }
        ]
      }
    };

    let response = null;
    for (const [key, value] of Object.entries(responses)) {
      if (prompt.toLowerCase().includes(key)) {
        response = value;
        break;
      }
    }

    if (!response) {
      response = {
        type: 'text',
        text: 'I understand you\'re asking about ' + prompt + '. Let me analyze the current data and prepare a comprehensive report for you.'
      };
    }

    return {
      id: Date.now(),
      type: 'agent',
      ...response,
      timestamp: new Date()
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="flex h-screen">
        {/* Sidebar - Agents */}
        <div className="w-64 bg-slate-950 border-r border-slate-700 p-6 overflow-y-auto">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Active Agents
          </h3>

          <div className="space-y-3">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`w-full p-3 rounded-lg text-left transition ${
                  selectedAgent === agent.id
                    ? 'bg-emerald-600 border border-emerald-500'
                    : 'bg-slate-800 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{agent.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{agent.name}</p>
                      <p className="text-xs text-slate-400">{agent.status}</p>
                    </div>
                  </div>
                  {agent.status === 'active' && (
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-700">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              System Status
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Agents Running:</span>
                <span className="text-emerald-400">5/5</span>
              </div>
              <div className="flex justify-between">
                <span>Tasks Pending:</span>
                <span className="text-yellow-400">3</span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span className="text-blue-400">99.8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-slate-800 border-b border-slate-700 px-8 py-6">
            <div className="mb-4">
              <BackButton to="/dashboard" label="Back to Dashboard" isDark={true} />
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
              ReliefPay AI Command Centre
            </h1>
            <p className="text-slate-400 text-sm mt-1">Control relief operations with natural language commands</p>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'user' ? (
                  <div className="max-w-xl bg-emerald-600 rounded-lg p-4 rounded-tr-none">
                    <p>{msg.text}</p>
                    <p className="text-xs text-emerald-100 mt-2 opacity-70">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ) : (
                  <div className="max-w-2xl bg-slate-700 border border-slate-600 rounded-lg p-4 rounded-tl-none">
                    {msg.type === 'system' && (
                      <p className="text-slate-200">{msg.text}</p>
                    )}

                    {msg.type === 'agent' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <p className="font-semibold">{msg.title}</p>
                        </div>

                        {msg.text && <p className="text-slate-300 mb-3">{msg.text}</p>}

                        {msg.data && (
                          <div className="space-y-2">
                            {msg.data.map((item, i) => (
                              <div key={i} className="bg-slate-800 p-3 rounded border border-slate-600">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                  {Object.entries(item).map(([key, value]) => (
                                    <div key={key}>
                                      <p className="text-slate-500 capitalize text-xs">{key}</p>
                                      <p className="font-medium text-slate-100">{value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {msg.action === 'REVIEW_PAYOUT' && (
                          <button className="w-full bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded font-medium text-sm transition mt-3">
                            Review & Authorize Payout
                          </button>
                        )}

                        <p className="text-xs text-slate-400 mt-3 opacity-70">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}

                    {msg.type === 'data' && (
                      <div className="space-y-2">
                        {msg.data.map((item, i) => (
                          <div key={i} className="bg-slate-800 p-2 rounded text-xs">
                            {JSON.stringify(item)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2">
                <Loader className="w-5 h-5 animate-spin text-emerald-400" />
                <p className="text-slate-400">AI Agent processing your request...</p>
              </div>
            )}
          </div>

          {/* Suggested Prompts */}
          {messages.length < 3 && (
            <div className="bg-slate-800 border-t border-slate-700 px-8 py-4">
              <p className="text-xs text-slate-400 mb-3">Try asking:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left text-sm bg-slate-700 hover:bg-slate-600 p-3 rounded border border-slate-600 hover:border-slate-500 transition"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="bg-slate-800 border-t border-slate-700 px-8 py-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(input)}
                placeholder="Type your command... e.g., 'Show critical applications'"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                onClick={() => handleSendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              💡 Tip: Be specific with your requests. The AI will execute authorized operations only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
