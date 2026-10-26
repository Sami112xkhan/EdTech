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
import { useTheme } from '../../context/ThemeContext';
import { formatRupees, getEffectiveCoursePrice, normalizeSalePrice } from '../../utils/coursePricing';

// Theme helper
function _t(isRich: boolean) {
    return {
        page: isRich ? 'bg-gray-50' : 'bg-background',
        card: isRich ? 'bg-white border-black/[0.06]' : 'bg-secondary/20 border-white/5',
        muted: isRich ? 'bg-gray-50' : 'bg-white/5',
        input: isRich ? 'bg-white border-black/[0.06] text-gray-900 font-mono' : 'bg-white/5 border-white/10 text-white font-mono',
        inputNoMono: isRich ? 'bg-white border-black/[0.06] text-gray-900' : 'bg-white/5 border-white/10 text-white',
        textarea: isRich ? 'bg-white border-black/[0.06] text-gray-900' : 'bg-white/5 border-white/10 text-white',
        text: isRich ? 'text-gray-900' : 'text-white',
        textSub: isRich ? 'text-gray-500' : 'text-muted-foreground',
        textMuted: isRich ? 'text-gray-400' : 'text-muted-foreground',
        textLabel: isRich ? 'text-gray-400' : 'text-muted-foreground',
        textBody: isRich ? 'text-gray-700' : 'text-muted-foreground',
        hover: isRich ? 'hover:bg-gray-50' : 'hover:bg-white/5',
        btnPrimary: isRich ? 'bg-emerald-900 text-white hover:bg-emerald-800' : 'bg-primary text-white hover:bg-primary/80',
        btnMuted: isRich ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-white/5 text-muted-foreground hover:bg-white/10',
        btnIcon: isRich ? 'text-gray-400 hover:text-gray-900 hover:bg-gray-100' : 'text-muted-foreground hover:text-white hover:bg-white/10',
        btnDangerIcon: isRich ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-muted-foreground hover:text-red-400 hover:bg-red-500/10',
        btnPublished: isRich ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
        btnDraft: isRich ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-white/5 text-muted-foreground hover:bg-white/10',
        btnDelete: isRich ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
        badgeGreen: isRich ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        badgeGray: isRich ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white/5 text-muted-foreground border-white/10',
        feature: isRich ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        dot: isRich ? 'bg-gray-300' : 'bg-muted-foreground/50',
        dotSoft: isRich ? 'text-gray-200' : 'text-muted-foreground/30',
        empty: isRich ? 'bg-gray-50 border-dashed border-gray-200' : 'bg-white/5 border-dashed border-white/10',
        emptyIcon: isRich ? 'text-gray-300' : 'text-muted-foreground/50',
        emptyText: isRich ? 'text-gray-400' : 'text-muted-foreground',
        border: isRich ? 'border-black/[0.06]' : 'border-white/5',
        borderSubtle: isRich ? 'border-black/[0.04]' : 'border-white/[0.04]',
        inputGray: isRich ? 'bg-gray-50 border-black/[0.06]' : 'bg-white/5 border-white/10',
        cursorHover: isRich ? 'hover:bg-gray-50' : 'hover:bg-white/5',
        lessonText: isRich ? 'text-gray-700' : 'text-muted-foreground',
        freeBadge: isRich ? 'text-emerald-600 bg-emerald-50' : 'text-emerald-400 bg-emerald-500/10',
        ytBadge: isRich ? 'text-gray-400 bg-gray-100' : 'text-muted-foreground bg-white/5',
        checkboxLabel: isRich ? 'text-gray-700' : 'text-muted-foreground',
        featureBtn: isRich ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white/5 text-muted-foreground hover:bg-white/10',
        priceText: isRich ? 'text-gray-900' : 'text-white',
        priceSub: isRich ? 'text-gray-400 line-through' : 'text-muted-foreground line-through',
        moduleNum: isRich ? 'text-gray-300 bg-gray-100' : 'text-muted-foreground bg-white/5',
        dashBtn: isRich ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white/5 text-muted-foreground hover:bg-white/10',
        addLessonBtn: isRich ? 'border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-300' : 'border-white/10 text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/40',
    };
}


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

function LessonEditor({ lesson, moduleId, onSave, onCancel, isRich }: LessonEditorProps & { isRich: boolean }) {
    const c = _t(isRich);
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
        <div className={`p-4 rounded-2xl border space-y-3 ${c.muted} ${c.border}`}>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Slug *</label>
                    <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.input}`}
                        placeholder="e.g. python-intro" />
                </div>
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Title *</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`}
                        placeholder="e.g. Python Introduction" />
                </div>
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Duration</label>
                    <input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`}
                        placeholder="e.g. 4h 26m" />
                </div>
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>YouTube ID</label>
                    <input value={form.youtubeId} onChange={e => setForm({ ...form, youtubeId: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.input}`}
                        placeholder="e.g. rfscVS0vtbw" />
                </div>
            </div>
            <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Notes / Study Material URL or Path</label>
                <input value={form.notesPath} onChange={e => setForm({ ...form, notesPath: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.input}`}
                    placeholder="/notes/lesson-handout.pdf or https://..." />
                <p className={`mt-1 text-[10px] ${c.textMuted}`}>Link an existing file under public/ or a hosted URL. This field saves the link; it does not upload files.</p>
            </div>
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.free} onChange={e => setForm({ ...form, free: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className={`text-sm font-medium ${c.checkboxLabel}`}>Free preview lesson</span>
                </label>
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={handleSubmit} disabled={saving}
                    className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 ${c.btnPrimary}`}>
                    {saving ? 'Saving...' : lesson ? 'Update Lesson' : 'Add Lesson'}
                </button>
                <button onClick={onCancel}
                    className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${c.btnMuted}`}>
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

function ModuleEditor({ module, courseId, onSave, onCancel, isRich }: ModuleEditorProps & { isRich: boolean }) {
    const c = _t(isRich);
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
        <div className={`p-4 rounded-2xl border space-y-3 ${c.muted} ${c.border}`}>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Slug *</label>
                    <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.input}`}
                        placeholder="e.g. phase-0" />
                </div>
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Title *</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`}
                        placeholder="e.g. Phase 0 — Setup" />
                </div>
            </div>
            <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 min-h-[60px] ${c.textarea}`}
                    placeholder="Brief description of this module..." />
            </div>
            <div className="flex gap-2 pt-1">
                <button onClick={handleSubmit} disabled={saving}
                    className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 ${c.btnPrimary}`}>
                    {saving ? 'Saving...' : module ? 'Update Module' : 'Add Module'}
                </button>
                <button onClick={onCancel}
                    className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${c.btnMuted}`}>
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

function CourseEditor({ course, onSave, onCancel, isRich }: CourseEditorProps & { isRich: boolean }) {
    const c = _t(isRich);
    const [form, setForm] = useState({
        slug: course?.slug || '',
        title: course?.title || '',
        subtitle: course?.subtitle || '',
        description: course?.description || '',
        landingDescription: course?.landingDescription || '',
        price: course?.price || 0,
        salePrice: course?.salePrice && course.salePrice > 0 ? course.salePrice : '',
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
        let salePrice: number | null;
        try {
            salePrice = normalizeSalePrice(form.price, form.salePrice);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Invalid course pricing');
            return;
        }
        setSaving(true);
        try {
            const payload = { ...form, salePrice, features };
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
        <div className={`p-6 rounded-[2rem] border space-y-5 ${c.card}`}>
            <h3 className={`text-lg font-black ${c.text}`}>{course ? 'Edit Course' : 'Create New Course'}</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Slug *</label>
                    <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.input}`}
                        placeholder="e.g. fullstack" disabled={!!course} />
                </div>
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Title *</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`}
                        placeholder="e.g. Full Stack Web Dev" />
                </div>
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Subtitle</label>
                    <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`}
                        placeholder="e.g. Master the Modern Stack" />
                </div>
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Badge</label>
                    <input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`}
                        placeholder="e.g. Limited 2-Day Offer" />
                </div>
            </div>

            <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Full Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 min-h-[80px] ${c.textarea}`}
                    placeholder="Detailed course description for checkout page..." />
            </div>

            <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Landing Page Description</label>
                <textarea value={form.landingDescription} onChange={e => setForm({ ...form, landingDescription: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 min-h-[60px] ${c.textarea}`}
                    placeholder="Short blurb shown on landing page..." />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Price (₹)</label>
                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                        className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`} />
                </div>
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Sale Price (₹)</label>
                    <input type="number" min="0" max={Math.max(0, form.price - 1)} value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
                        className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`} />
                    <p className={`mt-1 text-[10px] ${c.textMuted}`}>Leave blank to charge the regular price.</p>
                </div>
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Icon</label>
                    <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`}
                        placeholder="BookOpen" />
                </div>
                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${c.textLabel}`}>Sort Order</label>
                    <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                        className={`w-full px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`} />
                </div>
            </div>

            {/* Features */}
            <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${c.textLabel}`}>Features</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {features.map((f, i) => (
                        <span key={i} className={`inline-flex items-center gap-1 px-3 py-1.5 border text-xs font-medium rounded-full ${c.feature}`}>
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
                        className={`flex-1 px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${c.inputNoMono}`}
                        placeholder="Add a feature and press Enter" />
                    <button onClick={() => { if (newFeature.trim()) { setFeatures([...features, newFeature.trim()]); setNewFeature(''); } }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${c.featureBtn}`}>
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Publish toggle */}
            <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className={`text-sm font-bold ${c.checkboxLabel}`}>Published (visible to users)</span>
                </label>
            </div>

            <div className={`flex gap-3 pt-3 border-t ${c.border}`}>
                <button onClick={handleSubmit} disabled={saving}
                    className={`px-8 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/15 ${c.btnPrimary}`}>
                    <Save className="w-4 h-4 inline mr-2" />
                    {saving ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
                </button>
                <button onClick={onCancel}
                    className={`px-8 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${c.btnMuted}`}>
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ── Module Card (with lessons) ────────────────────────────────────────────────

function ModuleCard({ mod, index, onRefresh, isRich }: { mod: ModuleData; index: number; onRefresh: () => void; isRich: boolean }) {
    const c = _t(isRich);
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
        <div className={`rounded-2xl overflow-hidden border ${c.card}`}>
            {/* Module Header */}
            <div className={`flex items-center gap-3 p-4 transition-colors cursor-pointer ${c.hover}`} onClick={() => setExpanded(!expanded)}>
                <GripVertical className={`w-4 h-4 shrink-0 ${c.dot}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${c.moduleNum}`}>#{index + 1}</span>
                        <h4 className={`font-bold text-sm truncate ${c.text}`}>{mod.title}</h4>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${c.textMuted}`}>{mod.lessons.length} lessons · {mod.slug}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                        className={`p-2 rounded-lg transition-all ${c.btnIcon}`}>
                        <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(); }}
                        className={`p-2 rounded-lg transition-all ${c.btnDangerIcon}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronDown className={`w-4 h-4 ${c.textMuted} transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Expanded content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className={`px-4 pb-4 space-y-2 border-t ${c.borderSubtle}`}>
                            {/* Edit module form */}
                            {editing && (
                                <div className="pt-3">
                                    <ModuleEditor module={mod} courseId={mod.courseId} onSave={() => { setEditing(false); onRefresh(); }} onCancel={() => setEditing(false)} isRich={isRich} />
                                </div>
                            )}

                            {/* Lessons list */}
                            <div className="pt-3 space-y-1">
                                {mod.lessons.map((lesson, li) => (
                                    <div key={lesson.id}>
                                        {editingLesson === lesson.id ? (
                                            <LessonEditor lesson={lesson} moduleId={mod.id} onSave={() => { setEditingLesson(null); onRefresh(); }} onCancel={() => setEditingLesson(null)} isRich={isRich} />
                                        ) : (
                                            <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl group transition-colors ${c.hover}`}>
                                                <GripVertical className={`w-3 h-3 shrink-0 ${c.dotSoft}`} />
                                                {lesson.free ? (
                                                    <PlayCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <PlayCircle className={`w-3.5 h-3.5 shrink-0 ${c.dot}`} />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-xs font-medium truncate block ${c.lessonText}`}>{lesson.title}</span>
                                                    <span className={`text-[10px] ${c.textMuted}`}>{lesson.duration || '—'} · {lesson.slug}</span>
                                                </div>
                                                {lesson.free && (
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${c.freeBadge}`}>Free</span>
                                                )}
                                                {lesson.youtubeId && (
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${c.ytBadge}`}>YT</span>
                                                )}
                                                {lesson.notesPath && (
                                                    <FileText className={`w-3 h-3 ${c.dot}`} />
                                                )}
                                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingLesson(lesson.id)}
                                                        className={`p-1.5 rounded-lg transition-all ${c.btnIcon}`}>
                                                        <Edit3 className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={() => handleDeleteLesson(lesson.id)}
                                                        className={`p-1.5 rounded-lg transition-all ${c.btnDangerIcon}`}>
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
                                <LessonEditor moduleId={mod.id} onSave={() => { setAddingLesson(false); onRefresh(); }} onCancel={() => setAddingLesson(false)} isRich={isRich} />
                            ) : (
                                <button onClick={() => setAddingLesson(true)}
                                    className={`w-full py-2.5 border border-dashed rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${c.addLessonBtn}`}>
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
    const { theme } = useTheme();
    const isRich = theme === 'rich';
    const c = _t(isRich);
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
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${c.dashBtn}`}>
                        ← Back to Courses
                    </button>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingCourse(!editingCourse)}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${c.dashBtn}`}>
                            <Edit3 className="w-3.5 h-3.5" /> Edit Details
                        </button>
                        <button onClick={() => handleTogglePublish(selectedCourse)}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                                selectedCourse.isPublished ? c.btnPublished : c.btnDraft
                            }`}>
                            {selectedCourse.isPublished ? <><Eye className="w-3.5 h-3.5" /> Published</> : <><EyeOff className="w-3.5 h-3.5" /> Draft</>}
                        </button>
                        <button onClick={() => handleDeleteCourse(selectedCourse)}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${c.btnDelete}`}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    </div>
                </div>

                {/* Edit form */}
                {editingCourse && (
                    <CourseEditor course={selectedCourse} onSave={() => { setEditingCourse(false); refetch(); refetchCourse(); }} onCancel={() => setEditingCourse(false)} isRich={isRich} />
                )}

                {/* Course info card */}
                <div className={`p-6 rounded-[2rem] border ${c.card}`}>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className={`text-2xl font-black ${c.text}`}>{selectedCourse.title}</h2>
                            <p className={`text-sm mt-1 ${c.textMuted}`}>{selectedCourse.subtitle}</p>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-black ${c.priceText}`}>{formatRupees(getEffectiveCoursePrice(selectedCourse.price, selectedCourse.salePrice))}</div>
                            {getEffectiveCoursePrice(selectedCourse.price, selectedCourse.salePrice) < selectedCourse.price && (
                                <div className={`text-sm ${c.priceSub}`}>{formatRupees(selectedCourse.price)}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedCourse.features.map((f, i) => (
                            <span key={i} className={`px-3 py-1 border text-xs rounded-full ${c.feature}`}>{f}</span>
                        ))}
                    </div>
                </div>

                {/* Modules */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-sm font-black uppercase tracking-widest ${c.text}`}>
                            Modules ({selectedCourse.modules.length})
                        </h3>
                        <button onClick={() => setAddingModule(!addingModule)}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${c.btnPrimary}`}>
                            <Plus className="w-3.5 h-3.5" /> Add Module
                        </button>
                    </div>

                    {addingModule && (
                        <div className="mb-4">
                            <ModuleEditor courseId={selectedCourse.id} onSave={() => { setAddingModule(false); refetchCourse(); }} onCancel={() => setAddingModule(false)} isRich={isRich} />
                        </div>
                    )}

                    <div className="space-y-2">
                        {selectedCourse.modules.map((mod, i) => (
                            <ModuleCard key={mod.id} mod={mod} index={i} onRefresh={refetchCourse} isRich={isRich} />
                        ))}
                        {selectedCourse.modules.length === 0 && (
                            <div className={`py-12 text-center rounded-2xl border ${c.empty}`}>
                                <BookOpen className={`w-10 h-10 mx-auto mb-3 ${c.emptyIcon}`} />
                                <p className={`text-sm font-medium ${c.emptyText}`}>No modules yet. Add your first module above.</p>
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
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${c.dashBtn}`}>
                    ← Back to Courses
                </button>
                <CourseEditor onSave={handleCourseCreated} onCancel={() => setView('list')} isRich={isRich} />
            </div>
        );
    }

    // ── List View ──
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${c.text}`}>Course Management</h3>
                    <p className={`text-xs mt-1 ${c.textMuted}`}>{courses.length} courses total</p>
                </div>
                <button onClick={() => setView('create')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-900/15 ${c.btnPrimary}`}>
                    <Plus className="w-4 h-4" /> New Course
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => (
                    <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-5 rounded-[2rem] border transition-all cursor-pointer group ${c.card} hover:border-emerald-300`}
                        onClick={() => handleCourseDetail(course.slug)}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                                    course.isPublished ? c.badgeGreen : c.badgeGray
                                }`}>
                                    {course.icon ? course.icon.charAt(0) : 'C'}
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm transition-colors group-hover:text-emerald-700 ${c.text}`}>{course.title}</h4>
                                    <p className={`text-[11px] ${c.textMuted}`}>{course.slug}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full ${
                                course.isPublished ? c.badgeGreen : c.badgeGray
                            }`}>
                                {course.isPublished ? 'Live' : 'Draft'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className={`text-lg font-black ${c.priceText}`}>
                                {formatRupees(getEffectiveCoursePrice(course.price, course.salePrice))}
                                {getEffectiveCoursePrice(course.price, course.salePrice) < course.price && (
                                    <span className={`text-xs ml-2 ${c.priceSub}`}>{formatRupees(course.price)}</span>
                                )}
                            </div>
                            <ChevronRight className={`w-4 h-4 ${c.textMuted} group-hover:text-emerald-500 group-hover:translate-x-1 transition-all`} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {courses.length === 0 && (
                <div className={`py-20 text-center rounded-[2rem] border ${c.empty}`}>
                    <BookOpen className={`w-12 h-12 mx-auto mb-4 ${c.emptyIcon}`} />
                    <h4 className={`text-lg font-bold mb-2 ${c.text}`}>No courses yet</h4>
                    <p className={`text-sm mb-6 ${c.emptyText}`}>Create your first course to get started.</p>
                    <button onClick={() => setView('create')}
                        className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${c.btnPrimary}`}>
                        <Plus className="w-4 h-4 inline mr-2" /> Create Course
                    </button>
                </div>
            )}
        </div>
    );
}
