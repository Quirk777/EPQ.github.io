"use client";

import { useState, useEffect } from "react";
import { 
  Users, TrendingUp, AlertCircle, CheckCircle, 
  Brain, Target, Zap, Award, BarChart3, Activity, UserPlus,
  Shield, Heart, Sparkles
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart
} from "recharts";

interface TeamProfile {
  team_size: number;
  averages: Record<string, number>;
  std_devs: Record<string, number>;
  members: Array<{
    id: string;
    name: string;
    scores: Record<string, number>;
  }>;
}

interface FitAnalysis {
  fit_score: number;
  candidate_name: string;
  team_size: number;
  construct_comparison: Record<string, {
    candidate_score: number;
    team_average: number;
    team_std_dev: number;
    difference: number;
    fit_score: number;
    interpretation: string;
  }>;
  diversity_impact: Record<string, {
    current_avg: number;
    new_avg: number;
    shift: number;
    direction: string;
    magnitude: string;
  }>;
  insights: {
    overall_assessment: string;
    strengths: Array<{ construct: string; message: string }>;
    concerns: Array<{ construct: string; message: string }>;
    diversity_note: string;
  };
}

const CONSTRUCT_NAMES: Record<string, string> = {
  SCL: "Structure",
  CCD: "Collaboration",
  CIL: "Innovation",
  CVL: "Communication",
  ERL: "Emotional Expression",
  MSD: "Values",
  ICI: "Work Style",
  AJL: "Autonomy"
};

export default function TeamFitClient() {
  const [teamProfile, setTeamProfile] = useState<TeamProfile | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis | null>(null);
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTeamProfile();
    loadCandidates();
  }, []);

  async function loadTeamProfile() {
    try {
      const res = await fetch("/api/employer/team-fit/profile", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTeamProfile(data);
      }
    } catch (error) {
      console.error("Failed to load team profile:", error);
    }
  }

  async function loadCandidates() {
    try {
      const res = await fetch("/api/employer/candidates", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error("Failed to load candidates:", error);
    }
  }

  async function analyzeCandidateFit(candidateId: string) {
    if (!candidateId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/employer/team-fit/candidate/${candidateId}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setFitAnalysis(data);
      }
    } catch (error) {
      console.error("Failed to analyze fit:", error);
    } finally {
      setLoading(false);
    }
  }

  function getRadarData() {
    if (!teamProfile || teamProfile.team_size === 0) return [];

    const constructs = Object.keys(CONSTRUCT_NAMES);
    return constructs.map(construct => {
      const data: Record<string, unknown> = {
        construct: CONSTRUCT_NAMES[construct],
        team: teamProfile.averages[construct] || 0
      };

      if (fitAnalysis) {
        const comparison = fitAnalysis.construct_comparison[construct];
        if (comparison) {
          data.candidate = comparison.candidate_score;
        }
      }

      return data;
    });
  }

  function getFitColor(score: number): string {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 55) return "text-yellow-600";
    return "text-red-600";
  }

  function getFitBgColor(score: number): string {
    if (score >= 85) return "bg-green-50 border-green-200";
    if (score >= 70) return "bg-blue-50 border-blue-200";
    if (score >= 55) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-pink-50/20">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 py-8">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-2xl shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Team Fit Intelligence
                </h1>
                <p className="text-slate-600 text-sm sm:text-base mt-1">
                  AI-powered environmental compatibility analysis for optimal team dynamics
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Overview Cards */}
        {teamProfile && teamProfile.team_size > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition"></div>
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                    <Users className="w-6 h-6 text-purple-700" />
                  </div>
                  <div className="flex items-center gap-1 text-purple-600">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">{teamProfile.team_size}</div>
                <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Team Members</div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-5/6 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition"></div>
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                    <Target className="w-6 h-6 text-blue-700" />
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">{Object.keys(teamProfile.averages).length}</div>
                <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Dimensions Analyzed</div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 w-full rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition"></div>
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-700" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">Active</div>
                <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Analysis Status</div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 w-full rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl p-8 mb-8 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <div>
                <div className="font-bold text-yellow-900 text-2xl mb-2">No Team Data Yet</div>
                <div className="text-sm text-yellow-700 mb-4">
                  Build your first team profile by hiring team members to enable intelligent fit analysis
                </div>
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Radar Chart */}
        {teamProfile && teamProfile.team_size > 0 && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                    <Target className="w-6 h-6 text-purple-700" />
                  </div>
                  Team Environmental Profile
                </h2>
                <p className="text-sm text-slate-600 mt-2">8-dimensional work environment preference analysis</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={getRadarData()}>
                    <PolarGrid stroke="#e2e8f0" strokeWidth={2} />
                    <PolarAngleAxis 
                      dataKey="construct" 
                      tick={{ fill: '#475569', fontSize: 13, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 10]} 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Team Average"
                      dataKey="team"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.4}
                      strokeWidth={3}
                    />
                    {fitAnalysis && (
                      <Radar
                        name={fitAnalysis.candidate_name}
                        dataKey="candidate"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.4}
                        strokeWidth={3}
                      />
                    )}
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'white'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Dimension Descriptions */}
              <div className="space-y-3">
                {Object.entries(CONSTRUCT_NAMES).map(([code, name]) => {
                  const avg = teamProfile.averages[code] || 0;
                  const color = avg > 7 ? 'from-green-500 to-emerald-500' : avg > 5 ? 'from-blue-500 to-cyan-500' : 'from-orange-500 to-red-500';
                  return (
                    <div key={code} className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-slate-900">{name}</div>
                        <div className="text-2xl font-bold text-slate-700">{avg.toFixed(1)}</div>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
                          style={{ width: `${(avg / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Candidate Analysis Section */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
              <Brain className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Analyze Candidate Compatibility</h2>
              <p className="text-sm text-slate-600 mt-1">Evaluate how well a candidate fits your team environment</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={selectedCandidate}
              onChange={(e) => {
                setSelectedCandidate(e.target.value);
                if (e.target.value) {
                  analyzeCandidateFit(e.target.value);
                } else {
                  setFitAnalysis(null);
                }
              }}
              className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium text-slate-900 bg-white shadow-sm"
            >
              <option value="">Select a candidate...</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            
            <button
              onClick={() => selectedCandidate && analyzeCandidateFit(selectedCandidate)}
              disabled={!selectedCandidate || loading}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Analyzing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Analyze Fit
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Fit Analysis Results */}
        {fitAnalysis && (
          <>
            {/* Overall Fit Score */}
            <div className={`rounded-2xl shadow-xl border-2 p-8 mb-8 ${getFitBgColor(fitAnalysis.fit_score)}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold text-slate-900">
                      {fitAnalysis.candidate_name}
                    </h2>
                    <span className="px-4 py-1.5 bg-white/70 rounded-full text-sm font-bold text-slate-700">
                      {fitAnalysis.team_size} Team Members
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium text-lg">
                    Team Environmental Compatibility Assessment
                  </p>
                </div>
                <div className="text-center">
                  <div className={`text-7xl font-bold ${getFitColor(fitAnalysis.fit_score)} mb-2`}>
                    {Math.round(fitAnalysis.fit_score)}
                  </div>
                  <div className="text-sm font-bold text-slate-600 uppercase tracking-wide">Fit Score</div>
                  <div className="mt-3">
                    {fitAnalysis.fit_score >= 85 ? (
                      <div className="flex items-center gap-1 text-green-700">
                        <Award className="w-5 h-5" />
                        <span className="font-bold">Excellent Fit</span>
                      </div>
                    ) : fitAnalysis.fit_score >= 70 ? (
                      <div className="flex items-center gap-1 text-blue-700">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-bold">Good Fit</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-700">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-bold">Moderate Fit</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200">
                <p className="text-slate-900 text-lg leading-relaxed">{fitAnalysis.insights.overall_assessment}</p>
              </div>
            </div>

            {/* Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Strengths */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                    <Shield className="w-6 h-6 text-green-700" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Key Strengths</h3>
                </div>
                <div className="space-y-3">
                  {fitAnalysis.insights.strengths.map((strength, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-slate-800 leading-relaxed">{strength.message}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Concerns */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl">
                    <Heart className="w-6 h-6 text-yellow-700" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Adaptation Areas
                  </h3>
                </div>
                <div className="space-y-3">
                  {fitAnalysis.insights.concerns.length > 0 ? (
                    fitAnalysis.insights.concerns.map((concern, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-slate-800 leading-relaxed">{concern.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                      <div className="text-sm text-slate-500 italic">
                        No significant concerns identified
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Diversity Impact */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Diversity Impact Analysis</h3>
                  <p className="text-sm text-slate-600 mt-1">How this hire would affect team composition</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 mb-6 border-2 border-purple-200">
                <p className="text-slate-900 text-lg leading-relaxed">{fitAnalysis.insights.diversity_note}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(fitAnalysis.diversity_impact).map(([construct, impact]) => (
                  <div key={construct} className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-5 border-2 border-slate-200 hover:shadow-lg transition-all">
                    <div className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">
                      {CONSTRUCT_NAMES[construct]}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-semibold">Current:</span>
                        <span className="text-lg font-bold text-slate-900">{impact.current_avg.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-semibold">With Hire:</span>
                        <span className="text-lg font-bold text-slate-900">{impact.new_avg.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t-2 border-slate-200">
                        <span className="text-xs text-slate-600 font-semibold">Change:</span>
                        <span className={`text-xl font-bold ${
                          impact.direction === 'increase' ? 'text-green-600' :
                          impact.direction === 'decrease' ? 'text-blue-600' :
                          'text-slate-400'
                        }`}>
                          {impact.shift > 0 ? '+' : ''}{impact.shift.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Construct Comparison */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Detailed Dimensional Comparison</h3>
                  <p className="text-sm text-slate-600 mt-1">In-depth analysis of each environmental dimension</p>
                </div>
              </div>
              
              <div className="space-y-5">
                {Object.entries(fitAnalysis.construct_comparison).map(([construct, data]) => (
                  <div key={construct} className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-5 border-2 border-slate-200 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-bold text-slate-900 text-lg">
                        {CONSTRUCT_NAMES[construct]}
                      </div>
                      <div className={`px-4 py-2 rounded-xl font-bold text-2xl ${getFitColor(data.fit_score)} bg-white shadow-sm`}>
                        {Math.round(data.fit_score)}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <span className="text-slate-600 font-semibold block mb-1">Candidate:</span>
                        <span className="text-2xl font-bold text-blue-600">{data.candidate_score.toFixed(1)}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <span className="text-slate-600 font-semibold block mb-1">Team Avg:</span>
                        <span className="text-2xl font-bold text-purple-600">{data.team_average.toFixed(1)}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <span className="text-slate-600 font-semibold block mb-1">Difference:</span>
                        <span className="text-2xl font-bold text-orange-600">{Math.abs(data.difference).toFixed(1)}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-slate-700 italic bg-white/70 p-3 rounded-lg mb-3">
                      {data.interpretation}
                    </div>
                    
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          data.fit_score >= 85 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          data.fit_score >= 70 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                          data.fit_score >= 55 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-red-500 to-rose-500'
                        }`}
                        style={{ width: `${data.fit_score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
