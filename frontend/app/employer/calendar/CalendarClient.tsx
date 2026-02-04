"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Clock, Video, MapPin, Bot,
  Calendar as CalendarIcon, Plus,
  X,
  CheckCircle, Sparkles
} from "lucide-react";

type ViewMode = "day" | "week" | "month";

interface Interview {
  id: string;
  candidate_name: string;
  candidate_id: string;
  role_title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location?: string;
  meeting_link?: string;
  interviewer_names: string[];
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  ai_suggested: boolean;
  notes?: string;
}

export default function CalendarClient() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const getViewStartDate = useCallback((): Date => {
    const date = new Date(currentDate);
    if (viewMode === "week") {
      const day = date.getDay();
      date.setDate(date.getDate() - day); // Start of week (Sunday)
    } else if (viewMode === "month") {
      date.setDate(1);
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }, [currentDate, viewMode]);

  const getViewEndDate = useCallback((): Date => {
    const date = new Date(currentDate);
    if (viewMode === "day") {
      date.setHours(23, 59, 59, 999);
    } else if (viewMode === "week") {
      const day = date.getDay();
      date.setDate(date.getDate() + (6 - day));
      date.setHours(23, 59, 59, 999);
    } else if (viewMode === "month") {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
    }
    return date;
  }, [currentDate, viewMode]);

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      const res = await fetch(
        `/api/employer/calendar/interviews?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setInterviews(data.interviews || []);
      }
    } catch (error) {
      console.error("Failed to load interviews:", error);
    } finally {
      setLoading(false);
    }
  }, [getViewStartDate, getViewEndDate]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  function navigatePrevious() {
    const newDate = new Date(currentDate);
    if (viewMode === "day") newDate.setDate(newDate.getDate() - 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === "month") newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  }

  function navigateNext() {
    const newDate = new Date(currentDate);
    if (viewMode === "day") newDate.setDate(newDate.getDate() + 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === "month") newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  }

  function navigateToday() {
    setCurrentDate(new Date());
  }

  function getHeaderText(): string {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
    } else if (viewMode === "week") {
      const start = getViewStartDate();
      const end = getViewEndDate();
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    }
  }

  function getInterviewsForDate(date: Date): Interview[] {
    return interviews.filter(interview => {
      const interviewDate = new Date(interview.start_time);
      return interviewDate.toDateString() === date.toDateString();
    });
  }

  function getInterviewsForHour(date: Date, hour: number): Interview[] {
    return interviews.filter(interview => {
      const interviewDate = new Date(interview.start_time);
      return (
        interviewDate.toDateString() === date.toDateString() &&
        interviewDate.getHours() === hour
      );
    });
  }

  function renderDayView() {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="min-w-[700px]">
          {/* Time slot indicator */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-blue-200 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Clock className="w-4 h-4" />
              {currentDate.toLocaleDateString("en-US", { 
                weekday: "long", 
                month: "long", 
                day: "numeric",
                year: "numeric"
              })}
            </div>
          </div>

          {hours.map(hour => {
            const hourInterviews = getInterviewsForHour(currentDate, hour);
            const isPastHour = new Date().getHours() > hour && 
                               new Date().toDateString() === currentDate.toDateString();
            const isCurrentHour = new Date().getHours() === hour &&
                                   new Date().toDateString() === currentDate.toDateString();
            
            return (
              <div 
                key={hour} 
                className={`border-b border-slate-100 min-h-[80px] transition-colors ${
                  isPastHour ? 'bg-slate-50/50' : 'bg-white'
                } ${isCurrentHour ? 'bg-blue-50/30 border-blue-200' : ''}`}
              >
                <div className="flex">
                  <div className={`w-24 p-3 text-sm font-bold border-r border-slate-100 ${
                    isCurrentHour ? 'text-blue-600' : 'text-slate-500'
                  }`}>
                    {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                  </div>
                  <div className="flex-1 p-2 space-y-2">
                    {hourInterviews.map(interview => (
                      <button
                        key={interview.id}
                        onClick={() => setSelectedInterview(interview)}
                        className={`w-full text-left p-4 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all transform hover:scale-[1.01] ${
                          interview.status === "completed" ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-500" :
                          interview.status === "cancelled" ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-500" :
                          interview.ai_suggested ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-500" :
                          "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-500"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                              {interview.candidate_name}
                              {interview.ai_suggested && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                                  <Bot className="w-3 h-3" />
                                  AI
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-700 font-medium mb-2">{interview.role_title}</div>
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(interview.start_time).toLocaleTimeString("en-US", { 
                                  hour: "numeric", 
                                  minute: "2-digit" 
                                })} - {new Date(interview.end_time).toLocaleTimeString("en-US", { 
                                  hour: "numeric", 
                                  minute: "2-digit" 
                                })}
                              </span>
                              {interview.meeting_link && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-full">
                                  <Video className="w-3 h-3 text-purple-600" />
                                  Video
                                </span>
                              )}
                              {interview.location && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-full">
                                  <MapPin className="w-3 h-3 text-orange-600" />
                                  {interview.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                            interview.status === "completed" ? "bg-green-100 text-green-700" :
                            interview.status === "cancelled" ? "bg-red-100 text-red-700" :
                            interview.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {interview.status.toUpperCase()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    const startDate = getViewStartDate();
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date;
    });
    const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 10 PM

    return (
      <div className="flex-1 overflow-auto bg-white">
        <div className="min-w-[1200px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b-2 border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 sticky top-0 z-10 shadow-sm">
            <div className="p-3 border-r border-slate-200"></div>
            {days.map(date => {
              const isToday = date.toDateString() === new Date().toDateString();
              const dayInterviews = getInterviewsForDate(date);
              return (
                <div key={date.toISOString()} className={`p-3 text-center border-r border-slate-200 ${
                  isToday ? 'bg-blue-100' : ''
                }`}>
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${
                    isToday ? 'text-blue-600' : 'text-slate-900'
                  }`}>
                    {date.getDate()}
                  </div>
                  {dayInterviews.length > 0 && (
                    <div className="mt-1 text-xs font-semibold text-purple-600">
                      {dayInterviews.length} {dayInterviews.length === 1 ? 'interview' : 'interviews'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-slate-100 min-h-[100px]">
              <div className="p-3 text-sm font-bold text-slate-500 border-r border-slate-100 bg-slate-50/50">
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
              {days.map(date => {
                const hourInterviews = getInterviewsForHour(date, hour);
                const isPast = new Date() > new Date(date.setHours(hour, 59, 59));
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <div 
                    key={date.toISOString()} 
                    className={`p-1.5 border-r border-slate-100 ${
                      isPast ? 'bg-slate-50/30' : ''
                    } ${isToday ? 'bg-blue-50/20' : ''}`}
                  >
                    {hourInterviews.map(interview => (
                      <button
                        key={interview.id}
                        onClick={() => setSelectedInterview(interview)}
                        className={`w-full text-left p-2 rounded-lg text-xs border-l-2 mb-1 shadow-sm hover:shadow-md transition-all ${
                          interview.ai_suggested ? "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-500" :
                          "bg-gradient-to-br from-purple-100 to-purple-50 border-purple-500"
                        }`}
                      >
                        <div className="font-bold truncate text-slate-900">{interview.candidate_name}</div>
                        <div className="text-slate-600 truncate text-xs">{interview.role_title}</div>
                        {interview.ai_suggested && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded text-xs font-bold">
                              <Bot className="w-2.5 h-2.5" />
                              AI
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderMonthView() {
    const startDate = getViewStartDate();
    const firstDayOfWeek = startDate.getDay();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    const allDays: (Date | null)[] = [
      ...Array(firstDayOfWeek).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
        return date;
      })
    ];

    return (
      <div className="flex-1 overflow-auto bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b-2 border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 sticky top-0 z-10 shadow-sm">
          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
            <div key={day} className="p-4 text-center border-r border-slate-200 last:border-r-0">
              <div className="text-sm font-bold text-slate-700 uppercase tracking-wide">{day}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {allDays.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="border-r border-b border-slate-100 bg-slate-50/30 min-h-[140px]"></div>;
            }

            const dayInterviews = getInterviewsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isPast = date < new Date() && !isToday;

            return (
              <div 
                key={date.toISOString()} 
                className={`border-r border-b border-slate-100 p-3 min-h-[140px] transition-colors ${
                  isPast ? 'bg-slate-50/40' : 'bg-white'
                } ${isToday ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''} hover:bg-slate-50`}
              >
                <div className={`text-sm font-bold mb-2 ${
                  isToday ? 'text-blue-600' : isPast ? 'text-slate-400' : 'text-slate-900'
                }`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayInterviews.slice(0, 3).map(interview => (
                    <button
                      key={interview.id}
                      onClick={() => setSelectedInterview(interview)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs truncate shadow-sm hover:shadow-md transition-all border-l-2 ${
                        interview.ai_suggested 
                          ? "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-900 border-blue-500 font-semibold" 
                          : "bg-gradient-to-r from-purple-100 to-purple-50 text-purple-900 border-purple-500 font-semibold"
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(interview.start_time).toLocaleTimeString("en-US", { 
                          hour: "numeric", 
                          minute: "2-digit" 
                        })}
                      </div>
                      <div className="truncate">{interview.candidate_name}</div>
                    </button>
                  ))}
                  {dayInterviews.length > 3 && (
                    <div className="text-xs text-slate-500 font-semibold pl-2 pt-1">
                      +{dayInterviews.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const [timezone, setTimezone] = useState("UTC-8 (PST)");
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpcoming, setShowUpcoming] = useState(true);

  const upcomingInterviews = interviews
    .filter(i => new Date(i.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 overflow-hidden">
      {/* Sidebar - Mini Calendar & Upcoming */}
      <div className="w-80 bg-white/95 backdrop-blur-sm border-r border-slate-200 flex flex-col shadow-xl">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Interview Calendar</h2>
              <p className="text-xs text-slate-500">Smart scheduling</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowScheduleModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5" />
            Schedule Interview
          </button>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {viewMode === "day" && renderDayView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "month" && renderMonthView()}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-900">Schedule Interview</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600">Schedule interview interface coming soon...</p>
            </div>
          </div>
        </div>
      )}

      {/* Timezone Modal */}
      {showTimezoneModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Select Timezone</h3>
              <button
                onClick={() => setShowTimezoneModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {["UTC-8 (PST)", "UTC-5 (EST)", "UTC+0 (GMT)", "UTC+1 (CET)"].map(tz => (
                <button
                  key={tz}
                  onClick={() => {
                    setTimezone(tz);
                    setShowTimezoneModal(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    timezone === tz
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {tz}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interview Details Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-900">Interview Details</h3>
              <button
                onClick={() => setSelectedInterview(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  selectedInterview.ai_suggested
                    ? "bg-gradient-to-br from-blue-500 to-blue-600"
                    : "bg-gradient-to-br from-purple-500 to-purple-600"
                }`}>
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-slate-900 mb-1">{selectedInterview.candidate_name}</h4>
                  <p className="text-slate-600 font-medium">{selectedInterview.role_title}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</div>
                  <div className="text-slate-900 font-semibold">
                    {new Date(selectedInterview.start_time).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Time</div>
                  <div className="text-slate-900 font-semibold">
                    {new Date(selectedInterview.start_time).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>

              {selectedInterview.meeting_link && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Meeting Link</div>
                  <a
                    href={selectedInterview.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium underline break-all"
                  >
                    {selectedInterview.meeting_link}
                  </a>
                </div>
              )}

              {selectedInterview.notes && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</div>
                  <p className="text-slate-700 leading-relaxed">{selectedInterview.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  selectedInterview.status === "confirmed"
                    ? "bg-green-100 text-green-700"
                    : selectedInterview.status === "scheduled"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-slate-100 text-slate-700"
                }`}>
                  {selectedInterview.status === "confirmed" && <CheckCircle className="w-4 h-4" />}
                  {selectedInterview.status.charAt(0).toUpperCase() + selectedInterview.status.slice(1)}
                </div>
                {selectedInterview.ai_suggested && (
                  <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    AI Suggested
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

