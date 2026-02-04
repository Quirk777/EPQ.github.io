"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, TrendingDown, Users, Clock, Target, BarChart3, 
  Calendar, Filter, Download, RefreshCw, Zap, AlertCircle,
  PieChart, Activity, Award, Brain, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  ResponsiveContainer,
  LabelList,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from "recharts";

interface FunnelStage {
  stage: string;
  stage_name: string;
  count: number;
  conversion_from_previous: number;
  conversion_from_start: number;
}

interface DropOff {
  from_stage: string;
  to_stage: string;
  drop_off_count: number;
  drop_off_rate: number;
}

interface FunnelData {
  funnel_stages: FunnelStage[];
  drop_offs: DropOff[];
  total_views: number;
  total_hired: number;
  overall_conversion: number;
}

interface ABVariant {
  id: string;
  name: string;
  title: string;
  views: number;
  applications: number;
  completions: number;
  conversion_rate: number;
}

interface ABTestResults {
  variants: ABVariant[];
  best_variant: ABVariant | null;
  total_variants: number;
}

export default function AnalyticsClient() {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [abResults, setAbResults] = useState<ABTestResults | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [roles, setRoles] = useState<Array<{ id: string; title: string }>>([]);
  const [, setLoading] = useState(false);
  const [showABTestModal, setShowABTestModal] = useState(false);
  const [variantA, setVariantA] = useState({ title: "", description: "" });
  const [variantB, setVariantB] = useState({ title: "", description: "" });

  useEffect(() => {
    loadRoles();
    loadFunnelData();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadFunnelData(selectedRole);
      loadABResults(selectedRole);
    }
  }, [selectedRole]);

  async function loadRoles() {
    try {
      const res = await fetch("/api/employer/roles", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error("Failed to load roles:", error);
    }
  }

  async function loadFunnelData(roleId?: string) {
    setLoading(true);
    try {
      const url = roleId 
        ? `/api/employer/analytics/funnel?role_id=${roleId}`
        : "/api/employer/analytics/funnel";
      
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFunnelData(data);
      }
    } catch (error) {
      console.error("Failed to load funnel:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadABResults(roleId: string) {
    try {
      const res = await fetch(`/api/employer/analytics/ab-test/${roleId}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setAbResults(data);
      }
    } catch (error) {
      console.error("Failed to load A/B results:", error);
    }
  }

  async function createABTest() {
    if (!selectedRole || !variantA.title || !variantB.title) {
      alert("Please fill in all variant details");
      return;
    }

    try {
      const res = await fetch("/api/employer/analytics/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role_id: selectedRole,
          variants: [
            { name: "A", ...variantA },
            { name: "B", ...variantB }
          ]
        })
      });

      if (res.ok) {
        setShowABTestModal(false);
        setVariantA({ title: "", description: "" });
        setVariantB({ title: "", description: "" });
        loadABResults(selectedRole);
        alert("A/B test created successfully!");
      }
    } catch (error) {
      console.error("Failed to create A/B test:", error);
    }
  }

  function getFunnelChartData() {
    if (!funnelData) return [];
    
    return funnelData.funnel_stages.map(stage => ({
      name: stage.stage_name,
      value: stage.count,
      fill: getStageColor(stage.stage)
    }));
  }

  function getStageColor(stage: string): string {
    const colors: Record<string, string> = {
      viewed: "#8b5cf6",
      applied: "#6366f1",
      started_assessment: "#3b82f6",
      completed_assessment: "#0ea5e9",
      reviewed: "#06b6d4",
      interviewed: "#14b8a6",
      offered: "#10b981",
      hired: "#22c55e"
    };
    return colors[stage] || "#64748b";
  }

  const [timeRange, setTimeRange] = useState("30d");
  const [selectedMetric, setSelectedMetric] = useState<string>("all");

  // Mock data for demonstration (in real app, fetch from API)
  const trendData = [
    { month: "Jan", applications: 45, interviews: 22, hires: 5 },
    { month: "Feb", applications: 52, interviews: 28, hires: 7 },
    { month: "Mar", applications: 61, interviews: 31, hires: 8 },
    { month: "Apr", applications: 58, interviews: 29, hires: 6 },
    { month: "May", applications: 71, interviews: 38, hires: 10 },
    { month: "Jun", applications: 78, interviews: 42, hires: 12 }
  ];

  const sourceData = [
    { name: "LinkedIn", value: 35, color: "#0077B5" },
    { name: "Indeed", value: 28, color: "#2164F3" },
    { name: "Referral", value: 22, color: "#10B981" },
    { name: "Company Site", value: 15, color: "#8B5CF6" }
  ];

  const timeToHireData = [
    { stage: "Applied", days: 0 },
    { stage: "Screening", days: 3 },
    { stage: "Assessment", days: 7 },
    { stage: "Interview", days: 14 },
    { stage: "Offer", days: 21 },
    { stage: "Hired", days: 28 }
  ];

  const demographicData = [
    { category: "0-2 yrs", count: 24 },
    { category: "2-5 yrs", count: 45 },
    { category: "5-10 yrs", count: 31 },
    { category: "10+ yrs", count: 18 }
  ];

  const COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-blue-50/20">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 py-8">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 rounded-2xl shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Analytics & Insights
                </h1>
                <p className="text-slate-600 text-sm sm:text-base mt-1">
                  Deep dive into hiring metrics, conversion funnels, and predictive analytics
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-700">Filter by Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
              <Calendar className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-700">Time Range:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        {funnelData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition"></div>
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                    <Users className="w-6 h-6 text-purple-700" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                    <ArrowUpRight className="w-4 h-4" />
                    +12.5%
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">
                  {funnelData.total_views.toLocaleString()}
                </div>
                <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Views</div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-3/4 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition"></div>
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                    <Target className="w-6 h-6 text-blue-700" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                    <ArrowUpRight className="w-4 h-4" />
                    +8.3%
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">
                  {funnelData.overall_conversion.toFixed(1)}%
                </div>
                <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Conversion Rate</div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 w-2/3 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition"></div>
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                    <Award className="w-6 h-6 text-green-700" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                    <ArrowUpRight className="w-4 h-4" />
                    +15.2%
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">
                  {funnelData.total_hired.toLocaleString()}
                </div>
                <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Hired</div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 w-5/6 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition"></div>
              <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-orange-700" />
                  </div>
                  <div className="flex items-center gap-1 text-red-600 text-sm font-bold">
                    <ArrowDownRight className="w-4 h-4" />
                    {funnelData.drop_offs.length}
                  </div>
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-1">
                  {funnelData.drop_offs.length}
                </div>
                <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Major Drop-offs</div>
                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 w-1/3 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trend Over Time */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Hiring Trends
                </h2>
                <p className="text-sm text-slate-600 mt-1">Application, interview, and hiring trends over time</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="applications" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorApplications)" strokeWidth={2} />
                <Area type="monotone" dataKey="interviews" stroke="#3B82F6" fillOpacity={1} fill="url(#colorInterviews)" strokeWidth={2} />
                <Area type="monotone" dataKey="hires" stroke="#10B981" fillOpacity={1} fill="url(#colorHires)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Source Attribution */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Candidate Sources
                </h2>
                <p className="text-sm text-slate-600 mt-1">Where your best candidates come from</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (${entry.value}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {sourceData.map((source) => (
                <div key={source.name} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }}></div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-600">{source.name}</div>
                    <div className="text-lg font-bold text-slate-900">{source.value}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time to Hire */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  Time to Hire
                </h2>
                <p className="text-sm text-slate-600 mt-1">Average days at each stage of hiring</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeToHireData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fill: '#64748b', fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="days" radius={[8, 8, 0, 0]}>
                  {timeToHireData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList dataKey="days" position="top" fill="#475569" fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Experience Demographics */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Experience Breakdown
                </h2>
                <p className="text-sm text-slate-600 mt-1">Candidate experience distribution</p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demographicData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis dataKey="category" type="category" tick={{ fill: '#64748b', fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[0, 8, 8, 0]}>
                  <LabelList dataKey="count" position="right" fill="#475569" fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Professional Role Filter Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-900 mb-2.5">
                Filter by Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-slate-900 font-medium shadow-sm"
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.title}</option>
                ))}
              </select>
            </div>
            {selectedRole && (
              <button
                onClick={() => setShowABTestModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
              >
                Create A/B Test
              </button>
            )}
          </div>
        </div>

        {/* Professional Key Metrics Grid */}
        {funnelData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="p-1.5 bg-green-100 rounded-full">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{funnelData.total_views.toLocaleString()}</div>
              <div className="text-sm font-medium text-slate-600">Total Views</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div className="p-1.5 bg-green-100 rounded-full">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{funnelData.total_hired.toLocaleString()}</div>
              <div className="text-sm font-medium text-slate-600">Total Hired</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="p-1.5 bg-green-100 rounded-full">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {funnelData.overall_conversion.toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-slate-600">Overall Conversion</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div className="p-1.5 bg-red-100 rounded-full">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{funnelData.drop_offs.length.toLocaleString()}</div>
              <div className="text-sm font-medium text-slate-600">Major Drop-offs</div>
            </div>
          </div>
        )}

        {/* Conversion Funnel */}
        {funnelData && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                    <Target className="w-6 h-6 text-purple-700" />
                  </div>
                  Conversion Funnel Analysis
                </h2>
                <p className="text-sm text-slate-600 mt-2">Stage-by-stage conversion tracking with drop-off analysis</p>
              </div>
              {selectedRole && (
                <button
                  onClick={() => setShowABTestModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                >
                  + Create A/B Test
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Funnel Visualization */}
              <div className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getFunnelChartData()} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      angle={-15}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'white'
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {getFunnelChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="value" position="top" fill="#1e293b" fontWeight="bold" fontSize={14} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stage Details Cards */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {funnelData.funnel_stages.map((stage, idx) => (
                  <div 
                    key={stage.stage}
                    className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border-2 border-slate-200 hover:border-purple-300 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-slate-900 text-sm">{stage.stage_name}</div>
                      <div className="text-2xl font-bold" style={{ color: getStageColor(stage.stage) }}>
                        {stage.count}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      {idx > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">From previous:</span>
                          <span className={`font-bold px-2 py-1 rounded-full ${
                            stage.conversion_from_previous >= 70 ? 'bg-green-100 text-green-700' :
                            stage.conversion_from_previous >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {stage.conversion_from_previous.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">From start:</span>
                        <span className="font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {stage.conversion_from_start.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${stage.conversion_from_start}%`,
                          backgroundColor: getStageColor(stage.stage)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Drop-off Analysis */}
        {funnelData && funnelData.drop_offs.length > 0 && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-red-100 to-red-200 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-700" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Critical Drop-off Points</h2>
                <p className="text-sm text-slate-600 mt-1">Identify where candidates are leaving your funnel</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {funnelData.drop_offs.map((dropOff, idx) => (
                <div 
                  key={idx}
                  className="group relative overflow-hidden rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-5 hover:shadow-lg transition-all"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-red-200 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="font-bold text-red-900 text-sm">
                          {dropOff.from_stage} → {dropOff.to_stage}
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                        HIGH RISK
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div>
                        <div className="text-xs text-red-700 font-medium mb-1">Candidates Lost</div>
                        <div className="text-2xl font-bold text-red-900">{dropOff.drop_off_count}</div>
                      </div>
                      <div>
                        <div className="text-xs text-red-700 font-medium mb-1">Drop-off Rate</div>
                        <div className="text-2xl font-bold text-red-900">{dropOff.drop_off_rate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* A/B Test Results */}
        {abResults && abResults.total_variants > 0 && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                <Zap className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">A/B Test Results</h2>
                <p className="text-sm text-slate-600 mt-1">Compare variant performance to optimize your job postings</p>
              </div>
            </div>

            {abResults.best_variant && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500 rounded-xl shadow-md">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-green-900 text-lg mb-1">
                      🏆 Best Performing: Variant {abResults.best_variant.name}
                    </div>
                    <div className="text-sm text-green-700 font-medium">
                      {abResults.best_variant.conversion_rate.toFixed(2)}% conversion rate • {abResults.best_variant.completions} completions
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {abResults.variants.map(variant => (
                <div 
                  key={variant.id}
                  className={`rounded-xl p-6 border-2 transition-all ${
                    variant.id === abResults.best_variant?.id
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-lg'
                      : 'bg-gradient-to-br from-slate-50 to-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xl font-bold text-slate-900">
                      Variant {variant.name}
                    </div>
                    {variant.id === abResults.best_variant?.id && (
                      <div className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold">
                        WINNER
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-slate-700 mb-5 italic bg-white/70 p-3 rounded-lg border border-slate-200">
                    &quot;{variant.title}&quot;
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 font-semibold mb-1 uppercase">Views</div>
                      <div className="text-2xl font-bold text-slate-900">{variant.views}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 font-semibold mb-1 uppercase">Applications</div>
                      <div className="text-2xl font-bold text-slate-900">{variant.applications}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="text-xs text-slate-600 font-semibold mb-1 uppercase">Completions</div>
                      <div className="text-2xl font-bold text-slate-900">{variant.completions}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-3 border border-green-300">
                      <div className="text-xs text-green-800 font-semibold mb-1 uppercase">Conversion</div>
                      <div className="text-2xl font-bold text-green-700">
                        {variant.conversion_rate.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* A/B Test Creation Modal */}
        {showABTestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Create A/B Test</h2>
                <button
                  onClick={() => setShowABTestModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Variant A */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Variant A</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={variantA.title}
                        onChange={(e) => setVariantA({ ...variantA, title: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Senior Software Engineer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={variantA.description}
                        onChange={(e) => setVariantA({ ...variantA, description: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        rows={4}
                        placeholder="Job description..."
                      />
                    </div>
                  </div>
                </div>

                {/* Variant B */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Variant B</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={variantB.title}
                        onChange={(e) => setVariantB({ ...variantB, title: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Lead Developer - Engineering Team"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={variantB.description}
                        onChange={(e) => setVariantB({ ...variantB, description: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        rows={4}
                        placeholder="Job description..."
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={createABTest}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Start A/B Test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
