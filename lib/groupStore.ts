import { create } from 'zustand';
import {
  FeedItem,
  Group,
  GroupTask,
  Message,
  ProposalFormData,
  TaskProposal
} from '../types';
import { supabase } from './supabase';

interface GroupState {
  groups: Group[];
  dmGroups: Group[];
  groupsLoading: boolean;
  currentGroup: Group | null;
  proposals: TaskProposal[];
  groupTasks: GroupTask[];
  messages: Message[];
  feedItems: FeedItem[];

  fetchGroups: () => Promise<void>;
  fetchDMs: () => Promise<void>;
  createGroup: (name: string, description: string) => Promise<{ error: string | null; group?: Group }>;
  createDM: (otherUserId: string) => Promise<{ error: string | null; group?: Group }>;
  joinGroup: (inviteCode: string) => Promise<{ error: string | null }>;
  leaveGroup: (groupId: string) => Promise<void>;
  fetchGroupDetail: (groupId: string) => Promise<void>;

  fetchProposals: (groupId: string) => Promise<void>;
  createProposal: (groupId: string, data: ProposalFormData) => Promise<{ error: string | null }>;
  voteOnProposal: (proposalId: string, vote: boolean) => Promise<void>;

  fetchGroupTasks: (groupId: string) => Promise<void>;
  startGroupTimer: (completionId: string) => Promise<void>;
  stopGroupTimer: (completionId: string) => Promise<void>;
  completeGroupTask: (completionId: string, groupTaskId: string, groupId: string, photoUri?: string, checkinNote?: string) => Promise<void>;

  fetchMessages: (groupId: string) => Promise<void>;
  sendMessage: (groupId: string, content: string, replyToId?: string) => Promise<void>;
  subscribeToMessages: (groupId: string) => () => void;

  fetchFeed: (groupId: string) => Promise<void>;
  subscribeToFeed: (groupId: string) => () => void;
  addFeedReaction: (feedItemId: string, emoji: string) => Promise<void>;
  removeFeedReaction: (feedItemId: string, emoji: string) => Promise<void>;
  addFeedComment: (feedItemId: string, content: string) => Promise<void>;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  dmGroups: [],
  groupsLoading: false,
  currentGroup: null,
  proposals: [],
  groupTasks: [],
  messages: [],
  feedItems: [],

  fetchGroups: async () => {
    set({ groupsLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      set({ groups: [], groupsLoading: false });
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);
    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds);

    if (groups) {
      const groupsWithCounts = await Promise.all(
        groups.map(async (g) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', g.id);
          return { ...g, member_count: count || 0 };
        })
      );
      set({ groups: groupsWithCounts, groupsLoading: false });
    } else {
      set({ groupsLoading: false });
    }
  },

  createGroup: async (name, description) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not logged in' };

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name,
        description: description || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
    });

    await get().fetchGroups();
    return { error: null, group };
  },

  joinGroup: async (inviteCode) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not logged in' };

    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single();

    if (!group) return { error: 'Group not found. Check the invite code.' };

    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single();

    if (existing) return { error: 'You are already in this group.' };

    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id);

    if (count && count >= group.max_members) {
      return { error: `Group is full (${group.max_members} members max).` };
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
    });

    if (error) return { error: error.message };

    await supabase.from('feed_items').insert({
      group_id: group.id,
      user_id: user.id,
      type: 'joined',
      content: 'joined the group',
    });

    // Create completions for existing active group tasks
    const { data: activeTasks } = await supabase
      .from('group_tasks')
      .select('id')
      .eq('group_id', group.id)
      .eq('is_active', true);

    if (activeTasks && activeTasks.length > 0) {
      const completions = activeTasks.map((t) => ({
        group_task_id: t.id,
        user_id: user.id,
        status: 'todo',
      }));
      await supabase.from('group_task_completions').insert(completions);
    }

    await get().fetchGroups();
    return { error: null };
  },

  leaveGroup: async (groupId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    // Delete group if no members remain
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);
    if (count === 0) {
      await supabase.from('groups').delete().eq('id', groupId);
    }

    await get().fetchGroups();
  },

  fetchDMs: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      set({ dmGroups: [] });
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);
    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .eq('is_dm', true);

    if (!groups) { set({ dmGroups: [] }); return; }

    // For each DM, fetch the other member's profile
    const dmGroupsWithOther = await Promise.all(
      groups.map(async (g) => {
        const { data: members } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', g.id);
        const userIds = (members || []).map((m) => m.user_id);
        let profiles: any[] = [];
        if (userIds.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);
          profiles = profileData || [];
        }
        const membersWithProfiles = (members || []).map((m) => ({
          ...m,
          profile: profiles.find((p) => p.id === m.user_id) || null,
        }));
        return { ...g, members: membersWithProfiles, member_count: membersWithProfiles.length };
      })
    );
    set({ dmGroups: dmGroupsWithOther });
  },

  createDM: async (otherUserId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not logged in' };

    // Check if DM already exists between these two users
    const { dmGroups } = get();
    const existing = dmGroups.find((g) =>
      g.members?.some((m) => m.user_id === otherUserId)
    );
    if (existing) return { error: null, group: existing };

    // Create new DM group
    const { data: group, error } = await supabase
      .from('groups')
      .insert({ is_dm: true, name: 'DM', invite_code: Math.random().toString(36).slice(2, 8).toUpperCase(), created_by: user.id })
      .select()
      .single();

    if (error) return { error: error.message };

    await supabase.from('group_members').insert([
      { group_id: group.id, user_id: user.id },
      { group_id: group.id, user_id: otherUserId },
    ]);

    await get().fetchDMs();
    const updated = get().dmGroups.find((g) => g.id === group.id);
    return { error: null, group: updated || group };
  },

  fetchGroupDetail: async (groupId) => {
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (group) {
      const { data: members } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      const userIds = (members || []).map((m) => m.user_id);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
        profiles = profileData || [];
      }

      const membersWithProfiles = (members || []).map((m) => ({
        ...m,
        profile: profiles.find((p) => p.id === m.user_id) || null,
      }));

      // Calculate group streak
      const { data: completions } = await supabase
        .from('group_task_completions')
        .select('user_id, completed_at')
        .eq('status', 'done')
        .not('completed_at', 'is', null)
        .in('group_task_id', 
          (await supabase
            .from('group_tasks')
            .select('id')
            .eq('group_id', groupId)
            .eq('is_active', true)
          ).data?.map((t) => t.id) || ['none']
        )
        .order('completed_at', { ascending: false });

      let groupStreak = 0;
      if (completions && completions.length > 0 && userIds.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkDate = new Date(today);

        // Check yesterday first if no completions today
        const todayCompletions = completions.filter((c) => {
          const d = new Date(c.completed_at);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        });
        const uniqueTodayUsers = new Set(todayCompletions.map((c) => c.user_id));
        if (uniqueTodayUsers.size < userIds.length) {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        for (let i = 0; i < 365; i++) {
          const dayStart = new Date(checkDate);
          const dayCompletions = completions.filter((c) => {
            const d = new Date(c.completed_at);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === dayStart.getTime();
          });
          const uniqueUsers = new Set(dayCompletions.map((c) => c.user_id));
          if (uniqueUsers.size >= userIds.length) {
            groupStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      set({
        currentGroup: {
          ...group,
          members: membersWithProfiles,
          member_count: membersWithProfiles.length,
          group_streak: groupStreak,
        },
      });
    }
  },

  fetchProposals: async (groupId) => {
    const { data, error } = await supabase
      .from('task_proposals')
      .select('*, votes:proposal_votes(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('fetchProposals error:', error);
      set({ proposals: [] });
      return;
    }
    set({ proposals: data || [] });
  },

  createProposal: async (groupId, formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not logged in' };

    const { error } = await supabase.from('task_proposals').insert({
      group_id: groupId,
      proposed_by: user.id,
      title: formData.title,
      notes: formData.notes || null,
      priority: formData.priority,
      time_block: formData.time_block,
      estimated_duration_min: formData.estimated_duration_min,
      repeat_cycle: formData.repeat_cycle,
      repeat_interval_days: formData.repeat_interval_days,
      require_photo: formData.require_photo,
      require_checkin: formData.require_checkin,
    });

    if (error) return { error: error.message };
    await get().fetchProposals(groupId);
    return { error: null };
  },

  voteOnProposal: async (proposalId, vote) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from('proposal_votes')
      .select('id')
      .eq('proposal_id', proposalId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      await supabase
        .from('proposal_votes')
        .update({ vote })
        .eq('id', existing.id);
    } else {
      await supabase.from('proposal_votes').insert({
        proposal_id: proposalId,
        user_id: user.id,
        vote,
      });
    }

    const { currentGroup } = get();
    if (currentGroup) {
      await get().fetchProposals(currentGroup.id);
      await get().fetchGroupTasks(currentGroup.id);
    }
  },

  fetchGroupTasks: async (groupId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tasks } = await supabase
      .from('group_tasks')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!tasks) {
      set({ groupTasks: [] });
      return;
    }

    const taskIds = tasks.map((t) => t.id);

    // Fetch ALL completions (all members, not just mine)
    const { data: allCompletions } = await supabase
      .from('group_task_completions')
      .select('*')
      .in('group_task_id', taskIds.length > 0 ? taskIds : ['none']);

    // Fetch profiles for completion authors
    const completionUserIds = [...new Set((allCompletions || []).map((c) => c.user_id))];
    let profiles: any[] = [];
    if (completionUserIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', completionUserIds);
      profiles = profileData || [];
    }
    const profileMap: any = {};
    profiles.forEach((p) => { profileMap[p.id] = p; });

    const tasksWithCompletions = tasks.map((t) => {
      const taskCompletions = (allCompletions || [])
        .filter((c) => c.group_task_id === t.id)
        .map((c) => ({
          ...c,
          profile: profileMap[c.user_id] || null,
        }));
      return {
        ...t,
        my_completion: taskCompletions.find((c) => c.user_id === user.id) || null,
        all_completions: taskCompletions,
      };
    });

    set({ groupTasks: tasksWithCompletions });
  },

  startGroupTimer: async (completionId) => {
    await supabase.from('group_task_completions').update({
      status: 'doing',
      timer_started_at: new Date().toISOString(),
    }).eq('id', completionId);

    const { currentGroup } = get();
    if (currentGroup) await get().fetchGroupTasks(currentGroup.id);
  },

  stopGroupTimer: async (completionId) => {
    const completion = get().groupTasks
      .map((t) => t.my_completion)
      .find((c) => c?.id === completionId);

    if (!completion?.timer_started_at) return;

    const elapsed = Math.floor(
      (Date.now() - new Date(completion.timer_started_at).getTime()) / 1000
    );

    await supabase.from('group_task_completions').update({
      status: 'todo',
      timer_started_at: null,
      timer_elapsed_sec: completion.timer_elapsed_sec + elapsed,
    }).eq('id', completionId);

    const { currentGroup } = get();
    if (currentGroup) await get().fetchGroupTasks(currentGroup.id);
  },

  completeGroupTask: async (completionId, groupTaskId, groupId, photoUri?, checkinNote?) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const task = get().groupTasks.find((t) => t.id === groupTaskId);
    const completion = task?.my_completion;
    if (!task || !completion) return;

    // If photo required but not provided, don't complete
    if (task.require_photo && !photoUri) return;

    let photoUrl: string | null = null;

    // Upload photo if provided
    if (photoUri) {
      const fileName = `${user.id}/${groupTaskId}_${Date.now()}.jpg`;

      try {
        const response = await fetch(photoUri);
        const arrayBuffer = await response.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('photos')
            .getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      } catch {
        // Photo upload failed, proceed without photo
      }
    }

    let finalElapsed = completion.timer_elapsed_sec;
    if (completion.timer_started_at) {
      finalElapsed += Math.floor(
        (Date.now() - new Date(completion.timer_started_at).getTime()) / 1000
      );
    }

    const base = task.estimated_duration_min * 2;
    const multiplier = task.priority === 'urgent' ? 1.5 : task.priority === 'important' ? 1.2 : 1.0;
    const xp = Math.floor(base * multiplier);

    await supabase.from('group_task_completions').update({
      status: 'done',
      timer_started_at: null,
      timer_elapsed_sec: finalElapsed,
      xp_earned: xp,
      completed_at: new Date().toISOString(),
      photo_url: photoUrl,
      checkin_note: checkinNote || null,
    }).eq('id', completionId);

    const { data: profile } = await supabase
      .from('profiles')
      .select('total_xp')
      .eq('id', user.id)
      .single();

    if (profile) {
      await supabase.from('profiles').update({
        total_xp: profile.total_xp + xp,
      }).eq('id', user.id);
    }

    const feedPayload: any = {
      group_id: groupId,
      user_id: user.id,
      type: photoUrl ? 'photo_checkin' : 'task_completed',
      group_task_id: groupTaskId,
      content: `completed "${task.title}"`,
      xp_earned: xp,
      photo_url: photoUrl || null,
    };
    if (checkinNote) feedPayload.checkin_note = checkinNote;
    await supabase.from('feed_items').insert(feedPayload);

    await get().fetchGroupTasks(groupId);
    await get().fetchFeed(groupId);
  },

  fetchMessages: async (groupId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.log('fetchMessages error:', error);
      set({ messages: [] });
      return;
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profileMap: any = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

      const messagesWithSenders = data.map((m) => ({
        ...m,
        sender: profileMap[m.user_id] || null,
        reply_to: data.find((r) => r.id === m.reply_to_id)
          ? {
              ...data.find((r) => r.id === m.reply_to_id)!,
              sender: profileMap[data.find((r) => r.id === m.reply_to_id)!.user_id] || null,
            }
          : null,
      }));

      set({ messages: messagesWithSenders });
    } else {
      set({ messages: [] });
    }
  },

  sendMessage: async (groupId, content, replyToId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('messages').insert({
      group_id: groupId,
      user_id: user.id,
      content: content.trim(),
      reply_to_id: replyToId || null,
    });

    if (error) {
      console.log('sendMessage error:', error);
      return;
    }

    await get().fetchMessages(groupId);
  },

  subscribeToMessages: (groupId) => {
    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        async () => {
          await get().fetchMessages(groupId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  fetchFeed: async (groupId) => {
    const { data, error } = await supabase
      .from('feed_items')
      .select('*, reactions:feed_reactions(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.log('fetchFeed error:', error);
      set({ feedItems: [] });
      return;
    }

    if (data && data.length > 0) {
      // Get profiles for feed authors
      const userIds = [...new Set(data.map((f) => f.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profileMap: any = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

      // Get comments
      const feedIds = data.map((f) => f.id);
      const { data: comments } = await supabase
        .from('feed_comments')
        .select('*')
        .in('feed_item_id', feedIds)
        .order('created_at', { ascending: true });

      // Get comment author profiles
      const commentUserIds = [...new Set((comments || []).map((c) => c.user_id))];
      let commentProfiles: any[] = [];
      if (commentUserIds.length > 0) {
        const { data: cp } = await supabase
          .from('profiles')
          .select('*')
          .in('id', commentUserIds);
        commentProfiles = cp || [];
      }
      commentProfiles.forEach((p: any) => { profileMap[p.id] = p; });

      const feedWithDetails = data.map((f) => ({
        ...f,
        author: profileMap[f.user_id] || null,
        comments: (comments || [])
          .filter((c) => c.feed_item_id === f.id)
          .map((c) => ({ ...c, author: profileMap[c.user_id] || null })),
      }));

      set({ feedItems: feedWithDetails });
    } else {
      set({ feedItems: [] });
    }
  },

  subscribeToFeed: (groupId) => {
    const channel = supabase
      .channel(`feed:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_items', filter: `group_id=eq.${groupId}` },
        async () => { await get().fetchFeed(groupId); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feed_reactions' },
        async () => { await get().fetchFeed(groupId); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  addFeedReaction: async (feedItemId, emoji) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('feed_reactions').insert({
      feed_item_id: feedItemId,
      user_id: user.id,
      emoji,
    });

    const { currentGroup } = get();
    if (currentGroup) await get().fetchFeed(currentGroup.id);
  },

  removeFeedReaction: async (feedItemId, emoji) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('feed_reactions')
      .delete()
      .eq('feed_item_id', feedItemId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    const { currentGroup } = get();
    if (currentGroup) await get().fetchFeed(currentGroup.id);
  },

  addFeedComment: async (feedItemId, content) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('feed_comments').insert({
      feed_item_id: feedItemId,
      user_id: user.id,
      content: content.trim(),
    });

    const { currentGroup } = get();
    if (currentGroup) await get().fetchFeed(currentGroup.id);
  },
}));