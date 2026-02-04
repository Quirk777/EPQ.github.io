"use client";

import { useState, useEffect } from "react";
import { PenTool, Plus, Trash2, GripVertical, Eye, Save, Copy } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Question {
  id: string;
  text: string;
  type: string;
  construct?: string;
  reverse?: boolean;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  time_estimate: number;
  is_active: boolean;
  white_label_name?: string;
}

interface IndustryTemplate {
  name: string;
  description: string;
  focus_constructs: string[];
  question_count: number;
  time_estimate: number;
}

function SortableQuestion({ question, onRemove }: { question: Question; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-slate-200 rounded-lg p-4 mb-2 flex items-center gap-3"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-slate-400" />
      </button>
      
      <div className="flex-1">
        <div className="text-sm text-slate-900">{question.text}</div>
        {question.construct && (
          <div className="text-xs text-slate-500 mt-1">
            Construct: {question.construct} {question.reverse && "(Reverse scored)"}
          </div>
        )}
      </div>
      
      <button
        onClick={onRemove}
        className="text-red-500 hover:text-red-700 p-2"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function AssessmentBuilderClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [industryTemplates, setIndustryTemplates] = useState<Record<string, IndustryTemplate>>({});
  const [questionBank, setQuestionBank] = useState<Record<string, Question[]>>({});
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [whiteLabelName, setWhiteLabelName] = useState("");
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showIndustryTemplates, setShowIndustryTemplates] = useState(false);
  const [selectedConstruct, setSelectedConstruct] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadTemplates();
    loadQuestionBank();
    loadIndustryTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const res = await fetch("/api/employer/assessment-builder/templates", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }

  async function loadQuestionBank() {
    try {
      const res = await fetch("/api/employer/assessment-builder/question-bank", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setQuestionBank(data.question_bank || {});
      }
    } catch (error) {
      console.error("Failed to load question bank:", error);
    }
  }

  async function loadIndustryTemplates() {
    try {
      const res = await fetch("/api/employer/assessment-builder/industry-templates", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setIndustryTemplates(data.industry_templates || {});
      }
    } catch (error) {
      console.error("Failed to load industry templates:", error);
    }
  }

  async function createTemplate() {
    if (!templateName || selectedQuestions.length === 0) {
      alert("Please provide a name and add at least one question");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/employer/assessment-builder/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          questions: selectedQuestions,
          white_label_name: whiteLabelName || null
        })
      });

      if (res.ok) {
        alert("Template created successfully!");
        setTemplateName("");
        setTemplateDescription("");
        setWhiteLabelName("");
        setSelectedQuestions([]);
        loadTemplates();
      }
    } catch (error) {
      console.error("Failed to create template:", error);
      alert("Failed to create template");
    } finally {
      setLoading(false);
    }
  }

  async function createFromIndustry(industryKey: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/employer/assessment-builder/industry-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          industry_key: industryKey
        })
      });

      if (res.ok) {
        alert("Template created from industry template!");
        setShowIndustryTemplates(false);
        loadTemplates();
      }
    } catch (error) {
      console.error("Failed to create from industry:", error);
      alert("Failed to create template");
    } finally {
      setLoading(false);
    }
  }

  function addQuestion(question: Question) {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  }

  function removeQuestion(questionId: string) {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
  }

  function handleDragEnd(event: { active: { id: string | number }; over: { id: string | number } | null }) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <PenTool className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-slate-900">Custom Assessment Builder</h1>
          </div>
          <p className="text-slate-600">
            Create custom psychometric assessments with drag-drop interface
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setShowIndustryTemplates(true)}
            className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <Copy className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Industry Templates</h3>
            </div>
            <p className="text-sm text-slate-600">Start from pre-built industry templates</p>
          </button>

          <button
            onClick={() => setShowQuestionBank(!showQuestionBank)}
            className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <Plus className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-slate-900">Question Bank</h3>
            </div>
            <p className="text-sm text-slate-600">Browse and add questions</p>
          </button>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold text-slate-900">Your Templates</h3>
            </div>
            <p className="text-sm text-slate-600">{templates.length} custom templates</p>
          </div>
        </div>

        {/* Builder Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Bank Sidebar */}
          {showQuestionBank && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Question Bank</h2>
                
                <select
                  value={selectedConstruct}
                  onChange={(e) => setSelectedConstruct(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">All Constructs</option>
                  {Object.keys(questionBank).map(construct => (
                    <option key={construct} value={construct}>{construct}</option>
                  ))}
                </select>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {Object.entries(questionBank)
                    .filter(([construct]) => !selectedConstruct || construct === selectedConstruct)
                    .flatMap(([construct, questions]) =>
                      questions.map(question => (
                        <button
                          key={question.id}
                          onClick={() => addQuestion({ ...question, construct })}
                          className="w-full text-left bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 rounded-lg p-3 text-sm transition-colors"
                        >
                          <div className="font-medium text-slate-900 mb-1">{construct}</div>
                          <div className="text-slate-600">{question.text}</div>
                        </button>
                      ))
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Template Builder */}
          <div className={showQuestionBank ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Build Your Assessment</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., Sales Team Assessment"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={2}
                    placeholder="Describe what this assessment measures..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    White Label Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={whiteLabelName}
                    onChange={(e) => setWhiteLabelName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., Your Company Recruiting"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Candidates will see this name instead of the default branding
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">
                    Questions ({selectedQuestions.length})
                  </h3>
                  <div className="text-sm text-slate-600">
                    Est. {Math.ceil(selectedQuestions.length * 20 / 60)} min
                  </div>
                </div>

                {selectedQuestions.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
                    <p className="text-slate-600">
                      No questions added yet. Click &quot;Question Bank&quot; to browse questions.
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedQuestions.map(q => q.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {selectedQuestions.map((question) => (
                          <SortableQuestion
                            key={question.id}
                            question={question}
                            onRemove={() => removeQuestion(question.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <button
                onClick={createTemplate}
                disabled={loading || !templateName || selectedQuestions.length === 0}
                className="w-full mt-6 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {loading ? "Creating..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Templates */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Templates</h2>
          
          {templates.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              No templates created yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{template.name}</h3>
                    {template.is_active && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        Active
                      </span>
                    )}
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                  )}
                  
                  <div className="text-xs text-slate-500">
                    ~{template.time_estimate} min
                  </div>
                  
                  {template.white_label_name && (
                    <div className="mt-2 text-xs text-purple-600">
                      White-labeled: {template.white_label_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Industry Templates Modal */}
        {showIndustryTemplates && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Industry Templates</h2>
                <button
                  onClick={() => setShowIndustryTemplates(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(industryTemplates).map(([key, template]) => (
                  <div
                    key={key}
                    className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {template.name}
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">{template.description}</p>
                    
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Questions:</span>
                        <span className="font-medium">{template.question_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Time:</span>
                        <span className="font-medium">~{template.time_estimate} min</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Focus: {template.focus_constructs.join(", ")}
                      </div>
                    </div>

                    <button
                      onClick={() => createFromIndustry(key)}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-slate-300 transition-colors"
                    >
                      Use This Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
