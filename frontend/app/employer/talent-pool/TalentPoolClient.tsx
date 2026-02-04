'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Mail,
  TrendingUp,
  Clock,
  Send,
  Plus,
  X,
  BarChart3,
  Target,
  Zap,
  MessageCircle,
  AlertTriangle
} from 'lucide-react';

interface PoolCandidate {
  id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  pool_type: string;
  status: string;
  engagement_score: number;
  last_contacted?: string;
  next_touchpoint?: string;
  tags: string[];
  notes?: string;
  created_at: string;
}

interface Campaign {
  campaign_id: number;
  name: string;
  description?: string;
  campaign_type: string;
  pool_type: string;
  active: boolean;
  created_at: string;
  sequence?: { step: number; delay_days: number; subject: string; template_id: string }[];
  enrollments?: { candidate_id: string; status: string }[];
  email_metrics?: { sent?: number; opened?: number; clicked?: number; replied?: number };
}

interface Candidate {
  id: number;
  name: string;
  email: string;
}

export default function TalentPoolClient() {
  const [activeTab, setActiveTab] = useState<'pool' | 'campaigns' | 'analytics'>('pool');
  const [poolCandidates, setPoolCandidates] = useState<PoolCandidate[]>([]);
  const [selectedPool, setSelectedPool] = useState<string>('all');
  const [poolTypes, setPoolTypes] = useState<{ id: string; name: string; count: number }[]>([]);
  const [statistics, setStatistics] = useState<{ pool_sizes?: Record<string, number>; total_candidates?: number; total_active_candidates?: number; average_engagement_score?: string; active_campaigns?: number; monthly_touchpoints?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  // Add candidate form
  const [newPoolCandidate, setNewPoolCandidate] = useState({
    candidate_id: 0,
    pool_type: 'silver_medalist',
    tags: '',
    notes: ''
  });

  useEffect(() => {
    loadPoolTypes();
    loadPoolCandidates();
    loadStatistics();
    loadCandidates();
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedPool !== 'all') {
      loadPoolCandidates(selectedPool);
    } else {
      loadPoolCandidates();
    }
  }, [selectedPool]);

  const loadPoolTypes = async () => {
    try {
      const res = await fetch('/api/employer/talent-pool/pool-types');
      if (res.ok) {
        const data = await res.json();
        setPoolTypes(data.pool_types || []);
      }
    } catch (err) {
      console.error('Failed to load pool types:', err);
    }
  };

  const loadPoolCandidates = async (poolType?: string) => {
    setLoading(true);
    try {
      const url = poolType 
        ? `/api/employer/talent-pool/candidates?pool_type=${poolType}`
        : '/api/employer/talent-pool/candidates';
      
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPoolCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error('Failed to load pool candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await fetch('/api/employer/talent-pool/statistics', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setStatistics(data);
      }
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  const loadCandidates = async () => {
    try {
      const res = await fetch('/api/employer/candidates', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.slice(0, 50));
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await fetch('/api/employer/talent-pool/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    }
  };

  const handleAddToPool = async () => {
    if (!newPoolCandidate.candidate_id) {
      alert('Please select a candidate');
      return;
    }

    try {
      const res = await fetch('/api/employer/talent-pool/add-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          candidate_id: newPoolCandidate.candidate_id,
          pool_type: newPoolCandidate.pool_type,
          tags: newPoolCandidate.tags ? newPoolCandidate.tags.split(',').map(t => t.trim()) : [],
          notes: newPoolCandidate.notes || null
        })
      });

      if (res.ok) {
        alert('Candidate added to talent pool!');
        setShowAddModal(false);
        setNewPoolCandidate({ candidate_id: 0, pool_type: 'silver_medalist', tags: '', notes: '' });
        loadPoolCandidates();
        loadStatistics();
      } else {
        alert('Failed to add candidate to pool');
      }
    } catch (err) {
      console.error('Failed to add to pool:', err);
      alert('Error adding candidate to pool');
    }
  };

  const getPoolTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      silver_medalist: 'bg-purple-100 text-purple-700',
      passive: 'bg-blue-100 text-blue-700',
      future_opportunity: 'bg-green-100 text-green-700',
      referral: 'bg-yellow-100 text-yellow-700',
      alumni: 'bg-indigo-100 text-indigo-700',
      pipeline: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPoolTypeIcon = (type: string) => {
    switch (type) {
      case 'silver_medalist': return '🥈';
      case 'passive': return '💤';
      case 'future_opportunity': return '🔮';
      case 'referral': return '🤝';
      case 'alumni': return '🎓';
      default: return '💼';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 p-8">
      {/* Professional Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Talent Pool Management</h1>
            <p className="text-slate-600 mt-1">
              Nurture candidates, manage engagement campaigns, and build your pipeline
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards - Premium Design */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-white to-cyan-50 rounded-2xl shadow-lg border border-cyan-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cyan-700 uppercase tracking-wide">Active Candidates</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{statistics.total_active_candidates}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl shadow-lg border border-emerald-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Avg. Engagement</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{statistics.average_engagement_score}</p>
                <p className="text-xs text-slate-500 mt-2">Out of 100</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.active_campaigns}</p>
              </div>
              <Mail className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Touchpoints</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.monthly_touchpoints}</p>
              </div>
              <Send className="w-10 h-10 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('pool')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pool'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Talent Pool
              </div>
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'campaigns'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Nurture Campaigns
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Pool Tab */}
      {activeTab === 'pool' && (
        <div>
          {/* Pool Type Filter */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Filter by Pool:</label>
                <select
                  value={selectedPool}
                  onChange={(e) => setSelectedPool(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Pools</option>
                  {poolTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add to Pool
              </button>
            </div>
          </div>

          {/* Candidate Grid */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading candidates...</div>
          ) : poolCandidates.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No candidates in talent pool yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add First Candidate
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {poolCandidates.map(candidate => (
                <div
                  key={candidate.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getPoolTypeIcon(candidate.pool_type)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{candidate.candidate_name}</h3>
                        <p className="text-sm text-gray-600">{candidate.candidate_email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getPoolTypeColor(candidate.pool_type)}`}>
                      {candidate.pool_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Engagement Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              candidate.engagement_score >= 70 ? 'bg-green-600' :
                              candidate.engagement_score >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${candidate.engagement_score}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${getEngagementColor(candidate.engagement_score)}`}>
                          {candidate.engagement_score}
                        </span>
                      </div>
                    </div>

                    {candidate.last_contacted && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        Last contact: {new Date(candidate.last_contacted).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {candidate.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {candidate.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {candidate.notes && (
                    <p className="text-sm text-gray-600 italic line-clamp-2">
                      {candidate.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((campaign, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{campaign.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                </div>
                <Mail className="w-8 h-8 text-indigo-600" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    {campaign.sequence?.length || 0} email sequence
                  </span>
                </div>
                
                <div className="border-l-2 border-gray-200 pl-4 space-y-2">
                  {campaign.sequence?.map((step, stepIdx) => (
                    <div key={stepIdx} className="text-sm">
                      <div className="flex items-center gap-2 text-gray-900 font-medium">
                        <MessageCircle className="w-3 h-3" />
                        Step {step.step}: Day {step.delay_days}
                      </div>
                      <p className="text-gray-600 text-xs mt-1">{step.subject}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button className="mt-4 w-full px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && statistics && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Pool Distribution</h2>
            <div className="space-y-4">
              {Object.entries(statistics.pool_sizes || {}).map(([type, count]: [string, number]) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ 
                        width: `${(count / (statistics.total_active_candidates || 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Zap className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600">High Engagement</p>
              <p className="text-3xl font-bold text-gray-900">
                {poolCandidates.filter(c => c.engagement_score >= 70).length}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Clock className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Medium Engagement</p>
              <p className="text-3xl font-bold text-gray-900">
                {poolCandidates.filter(c => c.engagement_score >= 40 && c.engagement_score < 70).length}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Low Engagement</p>
              <p className="text-3xl font-bold text-gray-900">
                {poolCandidates.filter(c => c.engagement_score < 40).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add to Pool Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Candidate to Pool</h3>
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
                  Select Candidate *
                </label>
                <select
                  value={newPoolCandidate.candidate_id}
                  onChange={(e) => setNewPoolCandidate({ ...newPoolCandidate, candidate_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>-- Choose a candidate --</option>
                  {candidates.map(candidate => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} ({candidate.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pool Type *
                </label>
                <select
                  value={newPoolCandidate.pool_type}
                  onChange={(e) => setNewPoolCandidate({ ...newPoolCandidate, pool_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {poolTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newPoolCandidate.tags}
                  onChange={(e) => setNewPoolCandidate({ ...newPoolCandidate, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="senior, engineering, remote"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newPoolCandidate.notes}
                  onChange={(e) => setNewPoolCandidate({ ...newPoolCandidate, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Strong candidate, reached final round..."
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
                onClick={handleAddToPool}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add to Pool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
