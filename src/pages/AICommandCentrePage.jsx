import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Zap, Loader, CheckCircle, AlertCircle, TrendingUp, MessageSquare, Target, DollarSign } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';
import { apiFetch } from '../lib/api';
import { formatMoney } from '../lib/money';

const MAX_HISTORY = 12;
const MAX_CONTENT = 2000;

const AI_ERROR_MESSAGES = {
  AI_NOT_CONFIGURED: 'The AI agent is not configured on the server (GROQ_API_KEY is missing).',
  AI_RATE_LIMITED: 'The Groq free tier rate limit was reached. Wait a moment and try again.',
  AI_ERROR: 'The AI service returned an error. Please try again.',
  INVALID_MESSAGES: 'The message could not be sent. Keep it under 2000 characters.',
};

export default function AICommandCentrePage() {
  const navigate = useNavigate();
  const nextId = useRef(2);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      text: 'ReliefPay AI Command Centre initialized. I can look up campaigns, applications and payout batches, and draft payout batches for approved applications. Releasing money always requires your authorization code on the Payment Agent page.',
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
    'Which campaigns have the least funds available?',
    'Show all critical applications awaiting review',
    'List approved applications for cmp-01',
    'Draft a payout batch for approved applications in cmp-01',
    'Show the status of recent payout batches',
    'How much has been raised across all campaigns?'
  ];

  const newId = () => nextId.current++;

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: newId(),
      type: 'user',
      text: text.trim(),
      timestamp: new Date()
    };
    const history = [...messages, userMessage]
      .filter((m) => (m.type === 'user' || m.type === 'agent') && m.text)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.text.slice(0, MAX_CONTENT) }));

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await apiFetch('/ai/chat', { method: 'POST', body: { messages: history } });
      const drafted = res.draftedBatches || [];
      setMessages(prev => [...prev, {
        id: newId(),
        type: 'agent',
        title: 'ReliefPay Agent',
        text: res.reply || '(no reply)',
        steps: res.steps || [],
        model: res.model,
        action: drafted.length > 0 ? 'REVIEW_PAYOUT' : null,
        summary: drafted
          .map((b) => `Drafted batch ${b.id} for ${formatMoney(b.total, b.currency)}. Release requires your authorization code.`)
          .join(' '),
        timestamp: new Date()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: newId(),
        type: 'system',
        isError: true,
        text: AI_ERROR_MESSAGES[err.code] || err.message || 'The AI agent could not answer.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
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
                      msg.isError ? (
                        <div className="flex gap-2 text-red-300">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-1" />
                          <p>{msg.text}</p>
                        </div>
                      ) : (
                        <p className="text-slate-200">{msg.text}</p>
                      )
                    )}

                    {msg.type === 'agent' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          <p className="font-semibold">{msg.title}</p>
                          {msg.model && <span className="text-xs text-slate-400 font-mono">{msg.model}</span>}
                        </div>

                        {msg.text && <p className="text-slate-300 mb-3 whitespace-pre-wrap">{msg.text}</p>}

                        {msg.steps?.length > 0 && (
                          <div className="space-y-1">
                            {msg.steps.map((step, i) => (
                              <p
                                key={i}
                                className={`font-mono text-xs px-2 py-1 rounded bg-slate-800 border border-slate-600 ${
                                  step.ok ? 'text-slate-300' : 'text-red-300'
                                }`}
                              >
                                {step.tool} → {step.summary}
                              </p>
                            ))}
                          </div>
                        )}

                        {msg.summary && <p className="text-emerald-300 text-sm">{msg.summary}</p>}

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
                          <button
                            onClick={() => navigate('/admin/payment-agent')}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded font-medium text-sm transition mt-3"
                          >
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
