import * as Notifications from 'expo-notifications';
import { addDays, addMonths, addWeeks, nextMonday, startOfDay } from 'date-fns';
import { create } from 'zustand';
import { Profile, Subtask, SubtaskFormData, Task, TaskFormData } from '../types';
import { supabase } from './supabase';

interface AppState {
  session: any | null;
  profile: Profile | null;
  loading: boolean;
  tasks: Task[];
  tasksLoading: boolean;
  setSession: (session: any) => void;
  fetchProfile: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  addTask: (data: TaskFormData) => Promise<{ error: string | null }>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  startTimer: (id: string) => Promise<void>;
  stopTimer: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  resetRepeatingTasks: () => Promise<void>;
  fetchSubtasks: (taskId: string) => Promise<Subtask[]>;
  addSubtask: (taskId: string, data: SubtaskFormData) => Promise<void>;
  toggleSubtask: (subtask: Subtask) => Promise<void>;
  deleteSubtask: (id: string) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<{ error: string | null }>;
  completeOnboarding: () => Promise<void>;
  registerPushToken: () => Promise<void>;
}

function calculateXP(durationMin: number, priority: string): number {
  const base = durationMin * 2;
  const multiplier = priority === 'urgent' ? 1.5 : priority === 'important' ? 1.2 : 1.0;
  return Math.floor(base * multiplier);
}

function getNextReset(cycle: string, customDays?: number | null): string {
  const now = new Date();
  const base = startOfDay(now);
  switch (cycle) {
    case 'daily':
      return addDays(base, 1).toISOString();
    case 'weekly':
      return nextMonday(base).toISOString();
    case 'weekdays': {
      const day = now.getDay();
      const daysUntilNextWeekday = day === 5 ? 3 : day === 6 ? 2 : 1;
      return addDays(base, daysUntilNextWeekday).toISOString();
    }
    case 'biweekly':
      return addWeeks(base, 2).toISOString();
    case 'monthly':
      return addMonths(base, 1).toISOString();
    case 'custom':
      return addDays(base, customDays || 1).toISOString();
    default:
      return addDays(base, 1).toISOString();
  }
}

export const useStore = create<AppState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  tasks: [],
  tasksLoading: false,

  setSession: (session) => set({ session, loading: false }),

  fetchProfile: async () => {
    const { session } = get();
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (!error && data) {
      set({ profile: data });
    }
  },

  signUp: async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        // Without this the confirmation link falls back to the project's Site
        // URL, which is why early emails pointed at localhost.
        emailRedirectTo:
          typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, tasks: [] });
  },

  fetchTasks: async () => {
    const { session } = get();
    if (!session?.user) return;
    set({ tasksLoading: true });
    const { data, error } = await supabase
      .from('tasks')
      .select('*, subtasks(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      set({ tasks: data, tasksLoading: false });
    } else {
      set({ tasksLoading: false });
    }
  },

  addTask: async (formData) => {
    const { session } = get();
    if (!session?.user) return { error: 'Not logged in' };
    const nextReset = formData.is_repeating && formData.repeat_cycle
      ? getNextReset(formData.repeat_cycle, formData.repeat_interval_days)
      : null;
    const { error } = await supabase.from('tasks').insert({
      user_id: session.user.id,
      title: formData.title,
      notes: formData.notes || null,
      priority: formData.priority,
      time_block: formData.time_block,
      estimated_duration_min: formData.estimated_duration_min,
      is_repeating: formData.is_repeating,
      repeat_cycle: formData.repeat_cycle,
      repeat_interval_days: formData.repeat_interval_days,
      next_reset_at: nextReset,
    });
    if (error) return { error: error.message };
    await get().fetchTasks();
    return { error: null };
  },

  updateTask: async (id, updates) => {
    await supabase.from('tasks').update(updates).eq('id', id);
    await get().fetchTasks();
  },

  deleteTask: async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    await get().fetchTasks();
  },

  startTimer: async (id) => {
    await supabase.from('tasks').update({
      status: 'doing',
      timer_started_at: new Date().toISOString(),
    }).eq('id', id);
    await get().fetchTasks();
  },

  stopTimer: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task || !task.timer_started_at) return;
    const elapsed = Math.floor(
      (Date.now() - new Date(task.timer_started_at).getTime()) / 1000
    );
    await supabase.from('tasks').update({
      status: 'todo',
      timer_started_at: null,
      timer_elapsed_sec: task.timer_elapsed_sec + elapsed,
    }).eq('id', id);
    await get().fetchTasks();
  },

  completeTask: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    let finalElapsed = task.timer_elapsed_sec;
    if (task.timer_started_at) {
      finalElapsed += Math.floor(
        (Date.now() - new Date(task.timer_started_at).getTime()) / 1000
      );
    }
    const xp = calculateXP(task.estimated_duration_min, task.priority);
    await supabase.from('tasks').update({
      status: 'done',
      timer_started_at: null,
      timer_elapsed_sec: finalElapsed,
      xp_earned: xp,
      completed_at: new Date().toISOString(),
    }).eq('id', id);
    const { profile } = get();
    if (profile) {
      await supabase.from('profiles').update({
        total_xp: profile.total_xp + xp,
      }).eq('id', profile.id);
      set({ profile: { ...profile, total_xp: profile.total_xp + xp } });
    }
    await get().fetchTasks();
  },

  resetRepeatingTasks: async () => {
    const { tasks, session } = get();
    if (!session?.user) return;
    const now = new Date();
    const tasksToReset = tasks.filter(
      t => t.is_repeating && t.status === 'done' && t.next_reset_at && new Date(t.next_reset_at) <= now
    );
    for (const task of tasksToReset) {
      const nextReset = getNextReset(
        task.repeat_cycle as string,
        task.repeat_interval_days
      );
      await supabase.from('tasks').update({
        status: 'todo',
        xp_earned: 0,
        timer_elapsed_sec: 0,
        timer_started_at: null,
        completed_at: null,
        next_reset_at: nextReset,
      }).eq('id', task.id);
      await supabase.from('subtasks').update({ status: 'todo' }).eq('task_id', task.id);
    }
    if (tasksToReset.length > 0) {
      await get().fetchTasks();
    }
  },

  fetchSubtasks: async (taskId) => {
    const { data } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('sort_order', { ascending: true });
    return data || [];
  },

  addSubtask: async (taskId, formData) => {
    const task = get().tasks.find(t => t.id === taskId);
    const maxOrder = task?.subtasks?.length ?? 0;
    await supabase.from('subtasks').insert({
      task_id: taskId,
      title: formData.title,
      sort_order: maxOrder,
    });
    await get().fetchTasks();
  },

  toggleSubtask: async (subtask) => {
    const newStatus = subtask.status === 'todo' ? 'done' : 'todo';
    await supabase.from('subtasks').update({ status: newStatus }).eq('id', subtask.id);
    await get().fetchTasks();
  },

  deleteSubtask: async (id) => {
    await supabase.from('subtasks').delete().eq('id', id);
    await get().fetchTasks();
  },

  registerPushToken: async () => {
    const { session } = get();
    if (!session?.user) return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await supabase.from('profiles').update({ push_token: token }).eq('id', session.user.id);
    } catch (_) {}
  },

  completeOnboarding: async () => {
    const { session, profile } = get();
    if (!session?.user) return;
    // Optimistically update store immediately so the redirect logic sees the new value before navigation
    if (profile) set({ profile: { ...profile, onboarding_complete: true } });
    await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', session.user.id);
  },

  uploadAvatar: async (uri) => {
    const { session } = get();
    if (!session?.user) return { error: 'Not logged in' };
    try {
      // Always upload as JPEG — image picker with allowsEditing outputs JPEG on iOS/Android
      const mimeType = 'image/jpeg';
      const fileName = `${session.user.id}/avatar.jpg`;
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: true });
      if (uploadError) return { error: uploadError.message };
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const cacheBust = `${publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: cacheBust }).eq('id', session.user.id);
      await get().fetchProfile();
      return { error: null };
    } catch (e: any) {
      return { error: e.message || 'Upload failed' };
    }
  },
}));