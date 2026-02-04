'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Briefcase,
  Target,
  Shield,
  Zap,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3
} from 'lucide-react';

interface RiskCandidate {
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  risk_score: number;
  risk_level: string;
  assessed_at: string;
}

interface RiskAssessment {
  candidate_id: number;
  candidate_name: string;
  risk_score: number;
  risk_level: string;
  factors: RiskFactor[];
  recommendations: string[];
  assessed_at: string;
}

interface RiskFactor {
  factor: string;
  severity: string;
  description: string;
  value: any;
}

interface Candidate {
  id: number;
  name: string;
  email: string;
}

export default function AttritionClient() {
  const [highRiskCandidates, setHighRiskCandidates] = useState<RiskCandidate[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<RiskCandidate | null>(null);
  const [detailedAssessment, setDetailedAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assessingCandidate, setAssessingCandidate] = useState(false);

  useEffect(() => {
    loadHighRiskCandidates();
    loadStatistics();
    loadCandidates();
  }, []);

  const loadHighRiskCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employer/attrition/high-risk-candidates?limit=20', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setHighRiskCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error('Failed to load high risk candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await fetch('/api/employer/attrition/statistics', {
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

  const handleCalculateRisk = async (candidateId: number) => {
    setAssessingCandidate(true);
    try {
      const res = await fetch('/api/employer/attrition/calculate-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ candidate_id: candidateId })
      });

      if (res.ok) {
        const data = await res.json();
        setDetailedAssessment(data);
        loadHighRiskCandidates();
        loadStatistics();
      } else {
        alert('Failed to calculate risk score');
      }
    } catch (err) {
      console.error('Failed to calculate risk:', err);
      alert('Error calculating risk score');
    } finally {
      setAssessingCandidate(false);
    }
  };

  const loadDetailedAssessment = async (candidateId: number) => {
    try {
      const res = await fetch(`/api/employer/attrition/risk-assessment/${candidateId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setDetailedAssessment(data);
      }
    } catch (err) {
      console.error('Failed to load assessment:', err);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'medium': return <Activity className="w-5 h-5" />;
      case 'low': return <Shield className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 p-8">
      {/* Professional Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
            <AlertTriangle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Attrition Risk Intelligence</h1>
            <p className="text-slate-600 mt-1">
              ML-powered risk assessment and retention strategy recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards - Premium Design */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Assessed</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{statistics.total_assessed}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-blue-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Avg. Risk Score</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{statistics.average_risk_score}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2 font-semibold">Out of 100</p>
          </div>

          <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl shadow-lg border border-red-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">High Risk</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{statistics.high_risk_count}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-red-600 mt-2 font-semibold">Requires intervention</p>
          </div>

          <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl shadow-lg border border-emerald-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Low Risk</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {statistics.risk_distribution?.low || 0}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculate Risk Section - Professional */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Target className="w-5 h-5 text-orange-600" />
          </div>
          Calculate Risk Score
        </h2>
        <div className="flex items-center gap-4">
          <select
            onChange={(e) => e.target.value && handleCalculateRisk(Number(e.target.value))}
            className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
            disabled={assessingCandidate}
          >
            <option value="">-- Select candidate to assess --</option>
            {candidates.map(candidate => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} ({candidate.email})
              </option>
            ))}
          </select>
          {assessingCandidate && (
            <div className="flex items-center gap-2 text-indigo-600">
              <Activity className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Risk Candidates List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">High Risk Candidates</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : highRiskCandidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No risk assessments yet. Calculate risk scores to see candidates here.
            </div>
          ) : (
            <div className="space-y-3">
              {highRiskCandidates.map(candidate => (
                <div
                  key={candidate.candidate_id}
                  onClick={() => {
                    setSelectedCandidate(candidate);
                    loadDetailedAssessment(candidate.candidate_id);
                  }}
                  className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${getRiskColor(candidate.risk_level)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{candidate.candidate_name}</h3>
                      <p className="text-sm text-gray-600">{candidate.candidate_email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRiskIcon(candidate.risk_level)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Risk Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            candidate.risk_score >= 70 ? 'bg-red-600' :
                            candidate.risk_score >= 40 ? 'bg-yellow-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${candidate.risk_score}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold">{candidate.risk_score}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Assessed: {new Date(candidate.assessed_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Assessment Panel */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Risk Assessment Details</h2>
          
          {!detailedAssessment ? (
            <div className="text-center py-12 text-gray-500">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>Select a candidate to view detailed risk analysis</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className={`border-2 rounded-lg p-4 ${getRiskColor(detailedAssessment.risk_level)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium uppercase tracking-wide">
                    {detailedAssessment.risk_level} Risk
                  </span>
                  {getRiskIcon(detailedAssessment.risk_level)}
                </div>
                <p className="text-3xl font-bold">{detailedAssessment.risk_score}/100</p>
              </div>

              {/* Risk Factors */}
              {detailedAssessment.factors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Risk Factors</h3>
                  <div className="space-y-3">
                    {detailedAssessment.factors.map((factor, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <span className={`text-sm font-medium capitalize ${getSeverityColor(factor.severity)}`}>
                            {factor.factor.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            factor.severity === 'high' ? 'bg-red-100 text-red-700' :
                            factor.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {factor.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {detailedAssessment.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Retention Recommendations</h3>
                  <div className="space-y-2">
                    {detailedAssessment.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Assessment generated: {new Date(detailedAssessment.assessed_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Risk Factors */}
      {statistics && statistics.top_risk_factors && statistics.top_risk_factors.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Most Common Risk Factors</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statistics.top_risk_factors.map((item: any, idx: number) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {item.factor.replace(/_/g, ' ')}
                  </span>
                  <span className="text-2xl font-bold text-indigo-600">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${(item.count / statistics.total_assessed) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Distribution */}
      {statistics && statistics.risk_distribution && (
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Risk Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 border-2 border-green-200 rounded-lg bg-green-50">
              <Shield className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Low Risk</p>
              <p className="text-3xl font-bold text-green-600">
                {statistics.risk_distribution.low || 0}
              </p>
            </div>

            <div className="text-center p-6 border-2 border-yellow-200 rounded-lg bg-yellow-50">
              <Activity className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Medium Risk</p>
              <p className="text-3xl font-bold text-yellow-600">
                {statistics.risk_distribution.medium || 0}
              </p>
            </div>

            <div className="text-center p-6 border-2 border-red-200 rounded-lg bg-red-50">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600">High Risk</p>
              <p className="text-3xl font-bold text-red-600">
                {statistics.risk_distribution.high || 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
