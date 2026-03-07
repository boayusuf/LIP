export type Priority = 'urgent' | 'important' | 'low';
export type TimeBlock = 'morning' | 'afternoon' | 'evening';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type SubtaskStatus = 'todo' | 'done';
export type RepeatCycle = 'daily' | 'weekly' | 'weekdays' | 'biweekly' | 'monthly' | 'custom' | null;
export type ProposalStatus = 'pending' | 'approved' | 'rejected';
export type FeedType = 'task_completed' | 'photo_checkin' | 'streak' | 'joined';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  total_xp: number;
  push_token: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  priority: Priority;
  time_block: TimeBlock;
  estimated_duration_min: number;
  status: TaskStatus;
  xp_earned: number;
  is_repeating: boolean;
  repeat_cycle: RepeatCycle;
  repeat_interval_days: number | null;
  next_reset_at: string | null;
  timer_started_at: string | null;
  timer_elapsed_sec: number;
  completed_at: string | null;
  created_at: string;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  status: SubtaskStatus;
  sort_order: number;
  created_at: string;
}

export interface TaskFormData {
  title: string;
  notes: string;
  priority: Priority;
  time_block: TimeBlock;
  estimated_duration_min: number;
  is_repeating: boolean;
  repeat_cycle: RepeatCycle;
  repeat_interval_days: number | null;
}

export interface SubtaskFormData {
  title: string;
}

// Phase 2 types

export interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  is_dm: boolean;
  min_members: number;
  max_members: number;
  created_by: string | null;
  created_at: string;
  member_count?: number;
  members?: GroupMember[];
  last_message?: string | null;
  last_message_at?: string | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface TaskProposal {
  id: string;
  group_id: string;
  proposed_by: string;
  title: string;
  notes: string | null;
  priority: Priority;
  time_block: TimeBlock;
  estimated_duration_min: number;
  repeat_cycle: RepeatCycle;
  repeat_interval_days: number | null;
  require_photo: boolean;
  require_checkin: boolean;
  checkin_time: string | null;
  checkin_buffer_min: number | null;
  deadline: string | null;
  status: ProposalStatus;
  created_at: string;
  proposer?: Profile;
  votes?: ProposalVote[];
}

export interface ProposalVote {
  id: string;
  proposal_id: string;
  user_id: string;
  vote: boolean;
  created_at: string;
}

export interface GroupTask {
  id: string;
  group_id: string;
  proposal_id: string | null;
  title: string;
  notes: string | null;
  priority: string;
  time_block: string;
  estimated_duration_min: number;
  repeat_cycle: string | null;
  repeat_interval_days: number | null;
  require_photo: boolean;
  require_checkin: boolean;
  checkin_time: string | null;
  checkin_buffer_min: number | null;
  deadline: string | null;
  is_active: boolean;
  created_at: string;
  my_completion?: GroupTaskCompletion;
  all_completions?: (GroupTaskCompletion & { profile: Profile | null })[];
}

export interface GroupTaskCompletion {
  id: string;
  group_task_id: string;
  user_id: string;
  status: TaskStatus;
  timer_started_at: string | null;
  timer_elapsed_sec: number;
  xp_earned: number;
  photo_url: string | null;
  checkin_note: string | null;
  late_checkin: boolean;
  completed_at: string | null;
}

export interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  image_url: string | null;
  is_system: boolean;
  created_at: string;
  sender?: Profile;
  reply_to?: Message;
}

export interface FeedItem {
  id: string;
  group_id: string;
  user_id: string;
  type: FeedType;
  group_task_id: string | null;
  content: string | null;
  photo_url: string | null;
  checkin_note: string | null;
  xp_earned: number;
  created_at: string;
  author?: Profile;
  comments?: FeedComment[];
  reactions?: FeedReaction[];
}

export interface FeedComment {
  id: string;
  feed_item_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface FeedReaction {
  id: string;
  feed_item_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ProposalFormData {
  title: string;
  notes: string;
  priority: Priority;
  time_block: TimeBlock;
  estimated_duration_min: number;
  repeat_cycle: RepeatCycle;
  repeat_interval_days: number | null;
  require_photo: boolean;
  require_checkin: boolean;
  checkin_time: string | null;
  checkin_buffer_min: number | null;
}