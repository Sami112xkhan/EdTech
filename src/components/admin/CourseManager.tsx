import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCourses, useCourse, type CourseData, type CourseWithModules, type ModuleData, type LessonData } from '../../hooks/useCourses';
import { motion, AnimatePresence } from 'motion/react';
import {
    Plus, Trash2, GripVertical, Save, X, ChevronDown, ChevronRight,
    Edit3, BookOpen, PlayCircle, FileText, Eye, EyeOff, ArrowUpDown,
    CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// ── API helpers ───────────────────────────────────────────────────────────────

async function adminFetch(url: string, method: string, body?: any) {
    const sessionId = localStorage.getItem('sessionId');
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(sessionId ? { Authorization: `Bearer ${sessionId}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

// ── Lesson Editor ─────────────────────────────────────────────────────────────

interface LessonEditorProps {
    lesson?: LessonData;
    moduleId: string;
    onSave: () => void;
    onCancel: () => void;
}

function LessonEditor({ lesson, moduleId, onSave, onCancel }: LessonEditorProps) {
    const [form, setForm] = useState({
        slug: lesson?.slug || '',
        title: lesson?.title || '',
        duration: lesson?.duration || '',
        youtubeId: lesson?.youtubeId || '',
        notesPath: lesson?.notesPath || '',
        free: lesson?.free || false,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!form.slug || !form.title) { toast.error('Slug and title required'); return; }
        setSaving(true);
        try {
            if (lesson) {
                await adminFetch(`/api/admin/lessons/${lesson.id}`, 'PUT', form);
                toast.success('Lesson updated');
            } else {
                await adminFetch(`/api/admin/modules/${moduleId}/lessons`, 'POST', form);
                toast.success('Lesson created');
            }
            onSave();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 bg-gray-50 rounded-2xl border border-black/[0.06] space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Slug *</label>
                    <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-black/[0.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 font-mono"
                        placeholder="e.g. python-intro" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Title *</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-black/[0.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                        placeholder="e.g. Python Introduction" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Duration</label>
                    <input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-black/[0.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                        placeholder="e.g. 4h 26m" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">YouTube ID</label>
                    <input value={form.youtubeId} onChange={e => setForm({ ...form, youtubeId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-black/[0.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 font-mono"
                        placeholder="e.g. rfscVS0vtbw" />
                </div>
            </div>
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Notes / Study Material Path</label>
                <input value={form.notesPath} onChange={e => setForm({ ...form, notesPath: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-black/[0.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 font-mono"
                    placeholder="/notes/Some Path/file.pdf" />
            </div>
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.free} onChange={e => setForm({ ...form, free: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm font-medium text-gray-700">Free preview lesson</span>
                </label>
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={handleSubmit} disabled={saving}
                    className="px-5 py-2 bg-emerald-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-800 transition-all disabled:opacity-50">
                    {saving ? 'Saving...' : lesson ? 'Update Lesson' : 'Add Lesson'}
                </button>
                <button onClick={onCancel}
                    className="px-5 py-2 bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ── Module Editor ─────────────────────────────────────────────────────────────

interface ModuleEditorProps {
    module?: ModuleData;
    courseId: string;
    onSave: () => void;
    onCancel: () => void;
}

function ModuleEditor({ module, courseId, onSave, onCancel }: ModuleEditorProps) {
    const [form, setForm] = useState({
        slug: module?.slug || '',
        title: module?.title || '',
        description: module?.description || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!form.slug || !form.title) { toast.error('Slug and title required'); return; }
        setSaving(true);
        try {
            if (module) {
                await adminFetch(`/api/admin/modules/${module.id}`, 'PUT', form);
                toast.success('Module updated');
            } else {
                await adminFetch(`/api/admin/courses/${courseId}/modules`, 'POST', form);
                toast.success('Module created');
            }
            onSave();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 bg-gray-50 rounded-2xl border border-black/[0.06] space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Slug *</label>
                    <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-black/[0.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 font-mono"
                        placeholder="e.g. phase-0" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Title *</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-black/[0.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                        placeholder="e.g. Phase 0 — Setup" />
                </div>
            </div>
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-black/[0.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 min-h-[60px]"
                    placeholder="Brief description of this module..." />
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={handleSubmit} disabled={saving}
                    className="px-5 py-2 bg-emerald-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-800 transition-all disabled:opacity-50">
                    {saving ? 'Saving...' : module ? 'Update Module' : 'Add Module'}
                </button>
                <button onClick={onCancel}
                    className="px-5 py-2 bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ── Course Editor ─────────────────────────────────────────────────────────────

interface CourseEditorProps {
    course?: CourseData;
    onSave: () => void;
    onCancel: () => void;
}

function CourseEditor({ course, onSave, onCancel }: CourseEditorProps) {
    const [form, setForm] = useState({
        slug: course?.slug || '',
        title: course?.title || '',
        subtitle: course?.subtitle || '',
        description: course?.description || '',
        landingDescription: course?.landingDescription || '',
        price: course?.price || 0,
        salePrice: course?.salePrice || 0,
        badge: course?.badge || '',
        icon: course?.icon || 'BookOpen',
        color: course?.color || 'emerald',
        isPublished: course?.isPublished || false,
        sortOrder: course?.sortOrder || 0,
    });
    const [features, setFeatures] = useState<string[]>(course?.features || []);
    const [newFeature, setNewFeature] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!form.slug || !form.title) { toast.error('Slug and title required'); return; }
        setSaving(true);
        try {
            const payload = { ...form, features };
            if (course) {
                await adminFetch(`/api/admin/courses/${course.id}`, 'PUT', payload);
                toast.success('Course updated');
            } else {
                await adminFetch('/api/admin/courses', 'POST', payload);
                toast.success('Course created');
            }
            onSave();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-[2rem] border border-black/[0.06] space-y-5">
            <h3 className="text-lg font-black text-gray-900">{course ? 'Edit Course' : 'Create New Course'}</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Slug *</label>
                    <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-black/[0.06] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 font-mono"
                        placeholder="e.g. fullstack" disabled={!!course} />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Title *</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-black/[0.06] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                        placeholder="e.g. Full Stack Web Dev" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Subtitle</label>
                    <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-black/[0.06] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                        placeholder="e.g. Master the Modern Stack" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Badge</label>
                    <input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-black/[0.06] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                        placeholder="e.g. Limited 2-Day Offer" />
                </div>
            </div>

            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Full Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-black/[0.06] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 min-h-[80px]"
                    placeholder="Detailed course description for checkout page..." />
            </div>

            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Landing Page Description</label>
                <textarea value={form.landingDescription} onChange={e => setForm({ ...form, landingDescription: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-black/[0.06] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 min-h-[60px]"
                    placeholder="Short blurb shown on landing page..." />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Price (₹)</label>
                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50 border border-black/[0.06] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Sale Price (₹)</label>
                    <input type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50 border border-black/[0.06] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Icon</label>
                    <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-black/[0.06] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                        placeholder="BookOpen" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Sort Order</label>
                    <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50 border border-black/[0.06] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40" />
                </div>
            </div>

            {/* Features */}
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Features</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {features.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-full">
                            {f}
                            <button onClick={() => setFeatures(features.filter((_, j) => j !== i))} className="ml-1 hover:text-red-500">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input value={newFeature} onChange={e => setNewFeature(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && newFeature.trim()) { setFeatures([...features, newFeature.trim()]); setNewFeature(''); } }}
                        className="flex-1 px-4 py-2 bg-gray-50 border border-black/[0.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                        placeholder="Add a feature and press Enter" />
                    <button onClick={() => { if (newFeature.trim()) { setFeatures([...features, newFeature.trim()]); setNewFeature(''); } }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Publish toggle */}
            <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm font-bold text-gray-700">Published (visible to users)</span>
                </label>
            </div>

            <div className="flex gap-3 pt-3 border-t border-black/[0.06]">
                <button onClick={handleSubmit} disabled={saving}
                    className="px-8 py-3 bg-emerald-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-800 transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/15">
                    <Save className="w-4 h-4 inline mr-2" />
                    {saving ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
                </button>
                <button onClick={onCancel}
                    className="px-8 py-3 bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all">
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ── Module Card (with lessons) ────────────────────────────────────────────────

function ModuleCard({ mod, index, onRefresh }: { mod: ModuleData; index: number; onRefresh: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [addingLesson, setAddingLesson] = useState(false);
    const [editingLesson, setEditingLesson] = useState<string | null>(null);

    const handleDeleteModule = async () => {
        if (!confirm(`Delete module "${mod.title}" and all its lessons?`)) return;
        try {
            await adminFetch(`/api/admin/modules/${mod.id}`, 'DELETE');
            toast.success('Module deleted');
            onRefresh();
        } catch (e: any) { toast.error(e.message); }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!confirm('Delete this lesson?')) return;
        try {
            await adminFetch(`/api/admin/lessons/${lessonId}`, 'DELETE');
            toast.success('Lesson deleted');
            onRefresh();
        } catch (e: any) { toast.error(e.message); }
    };

    return (
        <div className="border border-black/[0.06] rounded-2xl overflow-hidden bg-white">
            {/* Module Header */}
            <div className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-300 bg-gray-100 px-2 py-0.5 rounded">#{index + 1}</span>
                        <h4 className="font-bold text-sm text-gray-900 truncate">{mod.title}</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{mod.lessons.length} lessons · {mod.slug}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                        <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(); }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Expanded content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-2 border-t border-black/[0.04]">
                            {/* Edit module form */}
                            {editing && (
                                <div className="pt-3">
                                    <ModuleEditor module={mod} courseId={mod.courseId} onSave={() => { setEditing(false); onRefresh(); }} onCancel={() => setEditing(false)} />
                                </div>
                            )}

                            {/* Lessons list */}
                            <div className="pt-3 space-y-1">
                                {mod.lessons.map((lesson, li) => (
                                    <div key={lesson.id}>
                                        {editingLesson === lesson.id ? (
                                            <LessonEditor lesson={lesson} moduleId={mod.id} onSave={() => { setEditingLesson(null); onRefresh(); }} onCancel={() => setEditingLesson(null)} />
                                        ) : (
                                            <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 group transition-colors">
                                                <GripVertical className="w-3 h-3 text-gray-200 shrink-0" />
                                                {lesson.free ? (
                                                    <PlayCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <PlayCircle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-xs font-medium text-gray-700 truncate block">{lesson.title}</span>
                                                    <span className="text-[10px] text-gray-400">{lesson.duration || '—'} · {lesson.slug}</span>
                                                </div>
                                                {lesson.free && (
                                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Free</span>
                                                )}
                                                {lesson.youtubeId && (
                                                    <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">YT</span>
                                                )}
                                                {lesson.notesPath && (
                                                    <FileText className="w-3 h-3 text-gray-300" />
                                                )}
                                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingLesson(lesson.id)}
                                                        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                                                        <Edit3 className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={() => handleDeleteLesson(lesson.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add lesson */}
                            {addingLesson ? (
                                <LessonEditor moduleId={mod.id} onSave={() => { setAddingLesson(false); onRefresh(); }} onCancel={() => setAddingLesson(false)} />
                            ) : (
                                <button onClick={() => setAddingLesson(true)}
                                    className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-all flex items-center justify-center gap-2">
                                    <Plus className="w-3.5 h-3.5" /> Add Lesson
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main Course Manager ───────────────────────────────────────────────────────

export default function CourseManager() {
    const { courses, loading, refetch } = useCourses();
    const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
    const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(null);
    const { course: selectedCourse, loading: courseLoading, refetch: refetchCourse } = useCourse(selectedCourseSlug);
    const [editingCourse, setEditingCourse] = useState(false);
    const [addingModule, setAddingModule] = useState(false);

    const handleCourseCreated = () => {
        setView('list');
        refetch();
    };

    const handleCourseDetail = (slug: string) => {
        setSelectedCourseSlug(slug);
        setView('detail');
        setEditingCourse(false);
    };

    const handleTogglePublish = async (course: CourseData) => {
        try {
            await adminFetch(`/api/admin/courses/${course.id}`, 'PUT', {
                ...course,
                isPublished: !course.isPublished,
            });
            toast.success(course.isPublished ? 'Course unpublished' : 'Course published');
            refetch();
            if (selectedCourseSlug === course.slug) refetchCourse();
        } catch (e: any) { toast.error(e.message); }
    };

    const handleDeleteCourse = async (course: CourseData) => {
        if (!confirm(`Delete "${course.title}" and ALL its modules/lessons? This cannot be undone.`)) return;
        try {
            await adminFetch(`/api/admin/courses/${course.id}`, 'DELETE');
            toast.success('Course deleted');
            setView('list');
            setSelectedCourseSlug(null);
            refetch();
        } catch (e: any) { toast.error(e.message); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // ── Detail View ──
    if (view === 'detail' && selectedCourse) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* Back + actions */}
                <div className="flex items-center justify-between">
                    <button onClick={() => { setView('list'); setSelectedCourseSlug(null); setEditingCourse(false); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">
                        ← Back to Courses
                    </button>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingCourse(!editingCourse)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">
                            <Edit3 className="w-3.5 h-3.5" /> Edit Details
                        </button>
                        <button onClick={() => handleTogglePublish(selectedCourse)}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                                selectedCourse.isPublished ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}>
                            {selectedCourse.isPublished ? <><Eye className="w-3.5 h-3.5" /> Published</> : <><EyeOff className="w-3.5 h-3.5" /> Draft</>}
                        </button>
                        <button onClick={() => handleDeleteCourse(selectedCourse)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    </div>
                </div>

                {/* Edit form */}
                {editingCourse && (
                    <CourseEditor course={selectedCourse} onSave={() => { setEditingCourse(false); refetch(); refetchCourse(); }} onCancel={() => setEditingCourse(false)} />
                )}

                {/* Course info card */}
                <div className="p-6 bg-white rounded-[2rem] border border-black/[0.06]">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900">{selectedCourse.title}</h2>
                            <p className="text-sm text-gray-400 mt-1">{selectedCourse.subtitle}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-gray-900">₹{selectedCourse.salePrice || selectedCourse.price}</div>
                            {selectedCourse.salePrice && selectedCourse.salePrice !== selectedCourse.price && (
                                <div className="text-sm text-gray-400 line-through">₹{selectedCourse.price}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedCourse.features.map((f, i) => (
                            <span key={i} className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-full">{f}</span>
                        ))}
                    </div>
                </div>

                {/* Modules */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                            Modules ({selectedCourse.modules.length})
                        </h3>
                        <button onClick={() => setAddingModule(!addingModule)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-800 transition-all">
                            <Plus className="w-3.5 h-3.5" /> Add Module
                        </button>
                    </div>

                    {addingModule && (
                        <div className="mb-4">
                            <ModuleEditor courseId={selectedCourse.id} onSave={() => { setAddingModule(false); refetchCourse(); }} onCancel={() => setAddingModule(false)} />
                        </div>
                    )}

                    <div className="space-y-2">
                        {selectedCourse.modules.map((mod, i) => (
                            <ModuleCard key={mod.id} mod={mod} index={i} onRefresh={refetchCourse} />
                        ))}
                        {selectedCourse.modules.length === 0 && (
                            <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-400 font-medium">No modules yet. Add your first module above.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Create View ──
    if (view === 'create') {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <button onClick={() => setView('list')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">
                    ← Back to Courses
                </button>
                <CourseEditor onSave={handleCourseCreated} onCancel={() => setView('list')} />
            </div>
        );
    }

    // ── List View ──
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Course Management</h3>
                    <p className="text-xs text-gray-400 mt-1">{courses.length} courses total</p>
                </div>
                <button onClick={() => setView('create')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/15">
                    <Plus className="w-4 h-4" /> New Course
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => (
                    <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 bg-white rounded-[2rem] border border-black/[0.06] hover:border-emerald-300 transition-all cursor-pointer group"
                        onClick={() => handleCourseDetail(course.slug)}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                                    course.isPublished ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
                                }`}>
                                    {course.icon ? course.icon.charAt(0) : 'C'}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-gray-900 group-hover:text-emerald-700 transition-colors">{course.title}</h4>
                                    <p className="text-[11px] text-gray-400">{course.slug}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full ${
                                course.isPublished ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
                            }`}>
                                {course.isPublished ? 'Live' : 'Draft'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-lg font-black text-gray-900">
                                ₹{(course.salePrice || course.price).toLocaleString()}
                                {course.salePrice && course.salePrice !== course.price && (
                                    <span className="text-xs text-gray-400 line-through ml-2">₹{course.price.toLocaleString()}</span>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {courses.length === 0 && (
                <div className="py-20 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-gray-900 mb-2">No courses yet</h4>
                    <p className="text-sm text-gray-400 mb-6">Create your first course to get started.</p>
                    <button onClick={() => setView('create')}
                        className="px-6 py-3 bg-emerald-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-800 transition-all">
                        <Plus className="w-4 h-4 inline mr-2" /> Create Course
                    </button>
                </div>
            )}
        </div>
    );
}
