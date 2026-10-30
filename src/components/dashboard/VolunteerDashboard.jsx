import React, { useState } from 'react';
import { MapPin, Clock, CheckCircle, AlertCircle, MessageCircle, Phone, Camera } from 'lucide-react';
import { INITIAL_VOLUNTEER_TASKS } from '../../data/mockData';

export const VolunteerDashboard = ({ currentUser }) => {
  const [tasks, setTasks] = useState(INITIAL_VOLUNTEER_TASKS);
  const [selectedTask, setSelectedTask] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ASSIGNED': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-5 h-5" />;
      case 'IN_PROGRESS': return <Clock className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const completionRate = Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Field Assessment Tasks</h1>
        <p className="text-amber-100">Verify beneficiaries and assess relief needs in the field</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Total Tasks</p>
          <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
          <p className="text-xs text-slate-500 mt-2">Assigned to you</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
          <p className="text-xs text-blue-600 mt-2">Currently active</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
          <p className="text-xs text-emerald-600 mt-2">Successfully verified</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Completion Rate</p>
          <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${completionRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* Active Tasks */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Active Tasks</h2>

        <div className="space-y-4">
          {tasks.filter(t => t.status !== 'COMPLETED').map((task) => (
            <div key={task.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
              {/* Task Header */}
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Task ID</p>
                    <p className="font-bold text-slate-900">{task.id}</p>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                    <span className="font-semibold text-sm">{task.status.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Beneficiary</p>
                    <p className="font-bold text-slate-900">{task.beneficiaryName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Location</p>
                    <p className="font-bold text-slate-900">{task.area}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Due Date</p>
                    <p className="font-bold text-slate-900">{task.dueDate}</p>
                  </div>
                </div>
              </div>

              {/* Task Details */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 mb-1">Assessment Notes</p>
                    <p className="text-sm text-slate-600">{task.notes}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 flex flex-wrap gap-3">
                {task.status === 'ASSIGNED' && (
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition">
                    <Clock className="w-4 h-4" />
                    Start Task
                  </button>
                )}
                <button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition">
                  <Camera className="w-4 h-4" />
                  Upload Evidence
                </button>
                <button className="flex-1 border border-slate-300 text-slate-900 hover:bg-slate-50 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition">
                  <MessageCircle className="w-4 h-4" />
                  Notes
                </button>
                <button className="px-4 border border-slate-300 text-slate-900 hover:bg-slate-50 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition">
                  <Phone className="w-4 h-4" />
                  Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed Tasks */}
      {tasks.filter(t => t.status === 'COMPLETED').length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Completed Tasks</h2>
          
          <div className="space-y-3">
            {tasks.filter(t => t.status === 'COMPLETED').map((task) => (
              <div key={task.id} className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">{task.beneficiaryName}</p>
                    <p className="text-xs text-slate-600">{task.area}</p>
                  </div>
                </div>
                <button className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm">View Details →</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
