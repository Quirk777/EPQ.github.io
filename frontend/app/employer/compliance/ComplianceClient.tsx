'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  Users,
  Trash2,
  Download,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  Lock,
  UserX
} from 'lucide-react';

interface AuditLog {
  id: number;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: number;
  ip_address?: string;
  timestamp: string;
  details?: any;
}

interface DeletionRequest {
  id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  requested_at: string;
  processed_at?: string;
  status: string;
  processed_by?: string;
  notes?: string;
}

interface AnonymizedProfile {
  id: number;
  candidate_id: number;
  anonymized_name: string;
  anonymized_email: string;
  skills: string[];
  experience_years: number;
  education_level: string;
  created_at: string;
}

export default function ComplianceClient() {
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'gdpr' | 'anonymized'>('overview');
  const [complianceReport, setComplianceReport] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [anonymizedProfiles, setAnonymizedProfiles] = useState<AnonymizedProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadComplianceReport();
    loadAuditLogs();
    loadDeletionRequests();
    loadAnonymizedProfiles();
  }, []);

  const loadComplianceReport = async () => {
    try {
      const res = await fetch('/api/employer/compliance/report', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setComplianceReport(data);
      }
    } catch (err) {
      console.error('Failed to load compliance report:', err);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employer/compliance/audit-logs/recent?limit=100', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletionRequests = async () => {
    try {
      const res = await fetch('/api/employer/compliance/deletion-requests', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setDeletionRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load deletion requests:', err);
    }
  };

  const loadAnonymizedProfiles = async () => {
    try {
      const res = await fetch('/api/employer/compliance/anonymized-profiles', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAnonymizedProfiles(data.profiles || []);
      }
    } catch (err) {
      console.error('Failed to load anonymized profiles:', err);
    }
  };

  const handleProcessDeletion = async (requestId: number, approved: boolean) => {
    if (!confirm(`Are you sure you want to ${approved ? 'APPROVE' : 'REJECT'} this deletion request?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/employer/compliance/deletion-request/${requestId}/process`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ approved })
        }
      );

      if (res.ok) {
        alert(`Deletion request ${approved ? 'approved' : 'rejected'}`);
        loadDeletionRequests();
        loadAuditLogs();
      } else {
        alert('Failed to process deletion request');
      }
    } catch (err) {
      console.error('Failed to process deletion:', err);
      alert('Error processing deletion request');
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('remove')) return 'text-red-600';
    if (action.includes('create') || action.includes('add')) return 'text-green-600';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600';
    if (action.includes('view') || action.includes('export')) return 'text-purple-600';
    return 'text-gray-600';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('delete')) return <Trash2 className="w-4 h-4" />;
    if (action.includes('export')) return <Download className="w-4 h-4" />;
    if (action.includes('anonymize')) return <EyeOff className="w-4 h-4" />;
    if (action.includes('consent')) return <CheckCircle className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50 p-8">
      {/* Professional Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Compliance & Data Governance</h1>
            <p className="text-slate-600 mt-1">
              GDPR compliance, audit trails, and data protection management
            </p>
          </div>
        </div>
      </div>

      {/* Professional Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-2 mb-6 inline-flex gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Audit Logs
            </div>
          </button>
          <button
            onClick={() => setActiveTab('gdpr')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
              activeTab === 'gdpr'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              GDPR Requests
            </div>
          </button>
          <button
            onClick={() => setActiveTab('anonymized')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
              activeTab === 'anonymized'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4" />
              Blind Screening
            </div>
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && complianceReport && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Audit Logs</p>
                  <p className="text-2xl font-bold text-gray-900">{complianceReport.total_audit_logs}</p>
                </div>
                <Activity className="w-10 h-10 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Anonymized Profiles</p>
                  <p className="text-2xl font-bold text-gray-900">{complianceReport.anonymized_profiles_count}</p>
                </div>
                <EyeOff className="w-10 h-10 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Deletion Requests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(complianceReport.deletion_requests?.pending || 0) + 
                     (complianceReport.deletion_requests?.approved || 0) +
                     (complianceReport.deletion_requests?.rejected || 0)}
                  </p>
                </div>
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {complianceReport.deletion_requests?.pending || 0} pending
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Old Applications</p>
                  <p className="text-2xl font-bold text-yellow-600">{complianceReport.old_applications_count}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-yellow-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                &gt;2 years old
              </p>
            </div>
          </div>

          {/* Recent Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Actions (Last 30 Days)</h2>
            <div className="space-y-3">
              {Object.entries(complianceReport.recent_actions || {}).map(([action, count]: [string, any]) => (
                <div key={action} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={getActionColor(action)}>
                      {getActionIcon(action)}
                    </div>
                    <span className="font-medium text-gray-900 capitalize">
                      {action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-gray-700">{count}</span>
                </div>
              ))}
              {Object.keys(complianceReport.recent_actions || {}).length === 0 && (
                <p className="text-center text-gray-500 py-4">No recent actions</p>
              )}
            </div>
          </div>

          {/* Consent Statistics */}
          {complianceReport.consent_statistics && Object.keys(complianceReport.consent_statistics).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Consent Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(complianceReport.consent_statistics).map(([type, stats]: [string, any]) => (
                  <div key={type} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2 capitalize">
                      {type.replace(/_/g, ' ')}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-600">
                          {stats.granted} granted
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-gray-600">
                          {stats.revoked} revoked
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Audit Trail</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-2 ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          <span className="text-sm font-medium capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.resource_type} {log.resource_id && `#${log.resource_id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.details ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            View
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* GDPR Tab */}
      {activeTab === 'gdpr' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Data Deletion Requests</h2>
          
          {deletionRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No deletion requests</div>
          ) : (
            <div className="space-y-4">
              {deletionRequests.map(request => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{request.candidate_name}</h3>
                      <p className="text-sm text-gray-600">{request.candidate_email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      Requested: {new Date(request.requested_at).toLocaleString()}
                    </div>
                    {request.processed_at && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="w-4 h-4" />
                        Processed: {new Date(request.processed_at).toLocaleString()}
                      </div>
                    )}
                    {request.processed_by && (
                      <div className="text-gray-600">
                        By: {request.processed_by}
                      </div>
                    )}
                    {request.notes && (
                      <div className="p-3 bg-gray-50 rounded text-gray-700">
                        {request.notes}
                      </div>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleProcessDeletion(request.id, true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve Deletion
                      </button>
                      <button
                        onClick={() => handleProcessDeletion(request.id, false)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Anonymized Profiles Tab */}
      {activeTab === 'anonymized' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Blind Screening Profiles</h2>
            <p className="text-sm text-gray-600 mt-1">
              Anonymized candidate profiles for bias-free initial screening
            </p>
          </div>
          
          {anonymizedProfiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No anonymized profiles yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anonymizedProfiles.map(profile => (
                <div
                  key={profile.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <UserX className="w-8 h-8 text-gray-400" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{profile.anonymized_name}</h3>
                        <p className="text-xs text-gray-500">{profile.anonymized_email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Experience:</span>
                      <span className="font-medium text-gray-900">
                        {profile.experience_years} years
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Education:</span>
                      <span className="font-medium text-gray-900">
                        {profile.education_level}
                      </span>
                    </div>
                  </div>

                  {profile.skills.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {profile.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-3">
                    Created: {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Audit Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Action</label>
                <p className="text-gray-900">{selectedLog.action}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">User</label>
                <p className="text-gray-900">{selectedLog.user_email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Timestamp</label>
                <p className="text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
              </div>
              {selectedLog.details && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Details</label>
                  <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
