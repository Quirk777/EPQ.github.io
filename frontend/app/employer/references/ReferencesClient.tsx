'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Mail,
  Phone,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Plus,
  X,
  Shield,
  Star,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface ReferenceRequest {
  id: number;
  candidate_id: number;
  reference_name: string;
  reference_email: string;
  reference_phone?: string;
  relationship: string;
  company: string;
  status: string;
  sent_at?: string;
  completed_at?: string;
  reminder_count: number;
}

interface ReferenceResponse {
  id: number;
  question_id: string;
  question_text: string;
  response?: string;
  rating?: number;
  submitted_at: string;
}

interface EmploymentVerification {
  id: number;
  company: string;
  job_title: string;
  start_date?: string;
  end_date?: string;
  verified: boolean;
  verification_source: string;
  discrepancy_flag: boolean;
  discrepancy_notes?: string;
  created_at: string;
}

interface Candidate {
  id: number;
  name: string;
  email: string;
}

export default function ReferencesClient() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [references, setReferences] = useState<ReferenceRequest[]>([]);
  const [verifications, setVerifications] = useState<EmploymentVerification[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReference, setSelectedReference] = useState<number | null>(null);
  const [referenceDetails, setReferenceDetails] = useState<any>(null);

  // New reference form
  const [newReference, setNewReference] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: 'manager',
    company: ''
  });

  useEffect(() => {
    loadCandidates();
  }, []);

  useEffect(() => {
    if (selectedCandidate) {
      loadCandidateReferences();
    }
  }, [selectedCandidate]);

  const loadCandidates = async () => {
    try {
      const res = await fetch('/api/employer/candidates', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.slice(0, 20)); // Show recent candidates
        if (data.length > 0 && !selectedCandidate) {
          setSelectedCandidate(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
    }
  };

  const loadCandidateReferences = async () => {
    if (!selectedCandidate) return;

    setLoading(true);
    try {
      // Load reference requests
      const refRes = await fetch(
        `/api/employer/references/requests/${selectedCandidate}`,
        { credentials: 'include' }
      );
      if (refRes.ok) {
        const refData = await refRes.json();
        setReferences(refData.requests || []);
      }

      // Load verifications
      const verRes = await fetch(
        `/api/employer/references/verifications/${selectedCandidate}`,
        { credentials: 'include' }
      );
      if (verRes.ok) {
        const verData = await verRes.json();
        setVerifications(verData.verifications || []);
      }

      // Load statistics
      const statsRes = await fetch(
        `/api/employer/references/statistics/${selectedCandidate}`,
        { credentials: 'include' }
      );
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load references:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReference = async () => {
    if (!selectedCandidate || !newReference.name || !newReference.email) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const res = await fetch('/api/employer/references/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          candidate_id: selectedCandidate,
          ...newReference
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Reference request sent!\n\nEmail Subject: ${data.email.subject}\n\nReference link: ${data.email.reference_link}`);
        setShowAddModal(false);
        setNewReference({ name: '', email: '', phone: '', relationship: 'manager', company: '' });
        loadCandidateReferences();
      } else {
        alert('Failed to create reference request');
      }
    } catch (err) {
      console.error('Failed to create reference:', err);
      alert('Error creating reference request');
    }
  };

  const handleSendReminder = async (requestId: number) => {
    try {
      const res = await fetch(
        `/api/employer/references/reminder/${requestId}`,
        {
          method: 'POST',
          credentials: 'include'
        }
      );

      if (res.ok) {
        alert('Reminder sent successfully');
        loadCandidateReferences();
      } else {
        alert('Failed to send reminder');
      }
    } catch (err) {
      console.error('Failed to send reminder:', err);
    }
  };

  const loadReferenceDetails = async (requestId: number) => {
    try {
      const res = await fetch(
        `/api/employer/references/request/${requestId}`,
        { credentials: 'include' }
      );

      if (res.ok) {
        const data = await res.json();
        setReferenceDetails(data);
        setSelectedReference(requestId);
      }
    } catch (err) {
      console.error('Failed to load reference details:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'bounced': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship.toLowerCase()) {
      case 'manager': return '👔';
      case 'colleague': return '🤝';
      case 'hr': return '📋';
      default: return '👤';
    }
  };

  const selectedCandidateName = candidates.find(c => c.id === selectedCandidate)?.name || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      {/* Professional Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <UserCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reference Intelligence</h1>
            <p className="text-slate-600 mt-1">
              Automated reference verification with employment checks and discrepancy detection
            </p>
          </div>
        </div>
      </div>

      {/* Candidate Selector - Professional Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
          Select Candidate
        </label>
        <select
          value={selectedCandidate || ''}
          onChange={(e) => setSelectedCandidate(Number(e.target.value))}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
        >
          <option value="">-- Choose a candidate --</option>
          {candidates.map(candidate => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} ({candidate.email})
            </option>
          ))}
        </select>
      </div>

      {selectedCandidate && (
        <>
          {/* Statistics Cards - Premium Design */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Requested</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_requested}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl shadow-lg border border-emerald-200 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Completed</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-emerald-100 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full"
                      style={{ width: `${stats.completion_rate}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{stats.completion_rate}%</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-lg border border-amber-200 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Avg Rating</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{stats.average_rating}/5</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
                    <Star className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl shadow-lg border border-red-200 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">Discrepancies</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{stats.discrepancies_found}</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content - Premium Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reference Requests */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  Reference Requests
                </h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add Reference
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600"></div>
                  <p className="text-slate-500 mt-3">Loading references...</p>
                </div>
              ) : references.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No reference requests yet</p>
                  <p className="text-slate-400 text-sm mt-1">Click "Add Reference" to get started</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {references.map(ref => (
                    <div
                      key={ref.id}
                      className="border-2 border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-white"
                      onClick={() => loadReferenceDetails(ref.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{getRelationshipIcon(ref.relationship)}</div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg">{ref.reference_name}</h3>
                            <p className="text-sm text-slate-600 capitalize font-medium">{ref.relationship}</p>
                          </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(ref.status)}`}>
                          {ref.status}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4 text-indigo-500" />
                          <span className="font-medium">{ref.reference_email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building2 className="w-4 h-4 text-indigo-500" />
                          <span className="font-medium">{ref.company}</span>
                        </div>
                        {ref.sent_at && (
                          <div className="flex items-center gap-2 text-slate-500 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            Sent {new Date(ref.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </div>

                      {ref.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendReminder(ref.id);
                          }}
                          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-indigo-600 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all font-semibold"
                        >
                          <Send className="w-4 h-4" />
                          Send Reminder ({ref.reminder_count} sent)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Employment Verifications */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                Employment Verifications
              </h2>

              {verifications.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No verifications yet</p>
                  <p className="text-slate-400 text-sm mt-1">Verifications will appear here</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {verifications.map(ver => (
                    <div
                      key={ver.id}
                      className={`border-2 rounded-xl p-5 transition-all ${
                        ver.discrepancy_flag 
                          ? 'border-red-300 bg-gradient-to-br from-red-50 to-white shadow-md' 
                          : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">{ver.job_title}</h3>
                          <p className="text-sm text-slate-600 font-medium flex items-center gap-2 mt-1">
                            <Building2 className="w-4 h-4 text-indigo-500" />
                            {ver.company}
                          </p>
                        </div>
                        {ver.verified ? (
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                          </div>
                        )}
                      </div>

                      {(ver.start_date || ver.end_date) && (
                        <p className="text-sm text-slate-600 mb-3 font-medium">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {ver.start_date} - {ver.end_date || 'Present'}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-semibold">
                          {ver.verification_source}
                        </span>
                      </div>

                      {ver.discrepancy_flag && ver.discrepancy_notes && (
                        <div className="mt-4 p-4 bg-red-100 border-2 border-red-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-red-200 rounded-lg">
                              <AlertTriangle className="w-5 h-5 text-red-700" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-red-900 mb-1">Discrepancy Detected</p>
                              <p className="text-sm text-red-700">{ver.discrepancy_notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Reference Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Reference Request</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Name *
                </label>
                <input
                  type="text"
                  value={newReference.name}
                  onChange={(e) => setNewReference({ ...newReference, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newReference.email}
                  onChange={(e) => setNewReference({ ...newReference, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="john.smith@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={newReference.phone}
                  onChange={(e) => setNewReference({ ...newReference, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship *
                </label>
                <select
                  value={newReference.relationship}
                  onChange={(e) => setNewReference({ ...newReference, relationship: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="manager">Manager</option>
                  <option value="colleague">Colleague</option>
                  <option value="hr">HR Representative</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company *
                </label>
                <input
                  type="text"
                  value={newReference.company}
                  onChange={(e) => setNewReference({ ...newReference, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReference}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference Details Modal */}
      {selectedReference && referenceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Reference Responses</h3>
              <button
                onClick={() => {
                  setSelectedReference(null);
                  setReferenceDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Reference:</strong> {referenceDetails.request.reference_name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Relationship:</strong> {referenceDetails.request.relationship}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Company:</strong> {referenceDetails.request.company}
              </p>
            </div>

            {referenceDetails.responses && referenceDetails.responses.length > 0 ? (
              <div className="space-y-4">
                {referenceDetails.responses.map((resp: ReferenceResponse) => (
                  <div key={resp.id} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-2">{resp.question_text}</p>
                    {resp.rating ? (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= resp.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm text-gray-600">({resp.rating}/5)</span>
                      </div>
                    ) : (
                      <p className="text-gray-700">{resp.response || 'No response'}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No responses yet
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
