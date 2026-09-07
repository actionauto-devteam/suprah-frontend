'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ImageIcon, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { resolveImageUrl } from '@/lib/utils';

type BasicUser = {
  _id: string;
  fullName?: string;
  avatar?: string;
};

type PresenceValue = {
  onlineStatus?: string | null;
};

type DayMedia = {
  url: string;
  mimeType?: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  durationSec?: number;
};

type DayStory = {
  _id: string;
  userId: string;
  authorName?: string;
  authorAvatar?: string;
  media: DayMedia;
  caption?: string;
  createdAt?: string;
  expiresAt?: string;
  viewedByMe?: boolean;
  viewCount?: number;
};

type DayUser = {
  _id: string;
  fullName?: string;
  avatar?: string;
  isMe?: boolean;
  hasStory?: boolean;
  hasUnseen?: boolean;
  storyCount?: number;
  stories?: DayStory[];
  onlineStatus?: string | null;
};

type SupraSpaceDayRailProps = {
  me?: BasicUser;
  users: BasicUser[];
  presence: Record<string, PresenceValue | undefined>;
  uid: string;
  onSelectUser: (userId: string) => void;
};

const ACCEPTED_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const MAX_STORY_VIDEO_SECONDS = 120;
const PHOTO_STORY_MS = 15000;
const AVATAR_CLASSES = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-fuchsia-500',
  'bg-teal-500',
];

function initials(name?: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function firstName(name?: string) {
  return (name || 'User').trim().split(/\s+/)[0] || 'User';
}

function avatarClass(name?: string) {
  const seed = (name || 'User').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_CLASSES[seed % AVATAR_CLASSES.length];
}

function isOnline(status?: string | null) {
  return Boolean(status && status !== 'offline');
}

function storyAge(value?: string) {
  if (!value) return '';
  const created = new Date(value).getTime();
  if (!Number.isFinite(created)) return '';
  const diff = Math.max(0, Date.now() - created);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function buildFallbackUsers(me: BasicUser | undefined, users: BasicUser[], uid: string, presence: Record<string, PresenceValue | undefined>): DayUser[] {
  const seen = new Set<string>();
  const ownId = me?._id || uid;
  const ownUser: DayUser = {
    _id: ownId,
    fullName: me?.fullName || 'Me',
    avatar: me?.avatar,
    isMe: true,
    hasStory: false,
    hasUnseen: false,
    storyCount: 0,
    stories: [],
    onlineStatus: presence[ownId]?.onlineStatus || 'online',
  };
  seen.add(ownId);

  const others = users
    .filter((user) => user._id && !seen.has(user._id))
    .map((user) => ({
      _id: user._id,
      fullName: user.fullName,
      avatar: user.avatar,
      isMe: user._id === uid,
      hasStory: false,
      hasUnseen: false,
      storyCount: 0,
      stories: [],
      onlineStatus: presence[user._id]?.onlineStatus || 'offline',
    }))
    .sort((a, b) => {
      const onlineDelta = Number(isOnline(b.onlineStatus)) - Number(isOnline(a.onlineStatus));
      if (onlineDelta) return onlineDelta;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

  return [ownUser, ...others].slice(0, 24);
}

function ringColor(user: DayUser) {
  if (user.hasUnseen) return 'var(--positive)';
  if (user.hasStory) return 'var(--accent)';
  if (isOnline(user.onlineStatus)) return 'var(--positive)';
  return 'var(--border-2)';
}

function AvatarBubble({ user, size = 48 }: { user: DayUser | BasicUser; size?: number }) {
  const src = resolveImageUrl(user.avatar);
  const name = user.fullName || 'User';

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold overflow-hidden ${avatarClass(name)}`}
      style={{ width: size, height: size, fontSize: size >= 52 ? 14 : 12 }}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </div>
  );
}

function DayPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

function getVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('Unable to read this video file.'));
    };
    video.src = url;
  });
}

function DayComposer({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [caption, setCaption] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const next = URL.createObjectURL(file);
    setPreviewUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] || null;
    setError('');
    setProgress(0);

    if (!next) {
      setFile(null);
      return;
    }

    if (!ACCEPTED_MEDIA_TYPES.has(next.type)) {
      setFile(null);
      setError('Please choose a photo or supported video file.');
      event.target.value = '';
      return;
    }

    setFile(next);
  };

  const postDay = async () => {
    if (!file || posting) return;

    setPosting(true);
    setError('');

    try {
      const form = new FormData();
      form.append('media', file, file.name);
      const cleanCaption = caption.trim();

      if (cleanCaption) form.append('caption', cleanCaption);

      if (file.type.startsWith('video/')) {
        const duration = await getVideoDuration(file);
        if (duration > MAX_STORY_VIDEO_SECONDS + 1) {
          throw new Error('Video stories can be at most 2 minutes long.');
        }
        if (duration > 0) form.append('durationSec', String(Math.round(duration)));
      }

      await apiClient.post('/api/crm/stories', form, {
        onUploadProgress: (event: { loaded: number; total?: number }) => {
          if (!event.total) return;
          setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        },
      });

      toast.success('Day posted');
      onPosted();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to post your day.';
      setError(message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <DayPortal>
      <div className="fixed inset-0 z-[230] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
        <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#11151b] p-4 shadow-2xl sm:rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Add to Your Day</h2>
              <p className="mt-0.5 text-xs text-white/50">Visible for 24 hours</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/25 text-white"
          >
            {previewUrl && file?.type.startsWith('video/') ? (
              <video src={previewUrl} className="max-h-[360px] w-full object-contain" controls playsInline />
            ) : previewUrl ? (
              <img src={previewUrl} alt="" className="max-h-[360px] w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/60">
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm font-semibold">Choose photo or video</span>
              </div>
            )}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={chooseFile}
          />

          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Add a caption..."
            rows={3}
            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-400/60"
          />

          {error && <p className="mt-2 text-xs font-medium text-rose-300">{error}</p>}
          {posting && progress > 0 && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          <button
            type="button"
            disabled={!file || posting}
            onClick={postDay}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {posting ? 'Posting...' : 'Post Day'}
          </button>
        </div>
      </div>
    </DayPortal>
  );
}

function DayViewer({
  authors,
  start,
  onClose,
  onChanged,
}: {
  authors: DayUser[];
  start: { author: number; story: number };
  onClose: () => void;
  onChanged: () => void;
}) {
  const [authorIndex, setAuthorIndex] = React.useState(start.author);
  const [storyIndex, setStoryIndex] = React.useState(start.story);
  const [deleting, setDeleting] = React.useState(false);
  const author = authors[authorIndex];
  const stories = author?.stories || [];
  const story = stories[storyIndex];
  const storyId = story?._id;

  const goNext = React.useCallback(() => {
    if (!author) return onClose();
    if (storyIndex < stories.length - 1) {
      setStoryIndex((value) => value + 1);
      return;
    }
    if (authorIndex < authors.length - 1) {
      setAuthorIndex((value) => value + 1);
      setStoryIndex(0);
      return;
    }
    onClose();
  }, [author, authorIndex, authors.length, onClose, stories.length, storyIndex]);

  const goPrevious = React.useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((value) => value - 1);
      return;
    }
    if (authorIndex > 0) {
      const previousAuthor = authors[authorIndex - 1];
      setAuthorIndex((value) => value - 1);
      setStoryIndex(Math.max(0, (previousAuthor?.stories || []).length - 1));
    }
  }, [authorIndex, authors, storyIndex]);

  React.useEffect(() => {
    if (!storyId || author?.isMe) return;
    apiClient.post(`/api/crm/stories/${storyId}/view`).catch(() => undefined);
  }, [author?.isMe, storyId]);

  React.useEffect(() => {
    if (!story || story.media.mediaType === 'video') return;
    const timer = window.setTimeout(goNext, PHOTO_STORY_MS);
    return () => window.clearTimeout(timer);
  }, [goNext, story]);

  const deleteStory = async () => {
    if (!story || deleting) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/crm/stories/${story._id}`);
      toast.success('Day removed');
      onChanged();
      goNext();
    } catch {
      toast.error('Unable to remove this day');
    } finally {
      setDeleting(false);
    }
  };

  if (!author || !story) return null;

  const mediaUrl = resolveImageUrl(story.media.url);
  const authorAvatar = author.avatar || story.authorAvatar;

  return (
    <DayPortal>
      <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black text-white">
        <div className="relative flex h-full w-full max-w-[520px] flex-col bg-black">
          <div className="absolute left-0 right-0 top-0 z-20 bg-gradient-to-b from-black/75 to-transparent px-4 pb-8 pt-[max(14px,env(safe-area-inset-top))]">
            <div className="mb-3 flex gap-1">
              {stories.map((item, index) => (
                <div key={item._id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white" style={{ width: index < storyIndex ? '100%' : index === storyIndex ? '55%' : '0%' }} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <AvatarBubble user={{ _id: author._id, fullName: author.fullName, avatar: authorAvatar }} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{author.isMe ? 'Your Day' : author.fullName}</p>
                <p className="text-xs text-white/55">{storyAge(story.createdAt)}</p>
              </div>
              {author.isMe && (
                <button
                  type="button"
                  onClick={deleteStory}
                  disabled={deleting}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15 disabled:opacity-50"
                  aria-label="Delete day"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
              <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button type="button" onClick={goPrevious} className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/40" aria-label="Previous day">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={goNext} className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/40" aria-label="Next day">
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="flex min-h-0 flex-1 items-center justify-center">
            {story.media.mediaType === 'video' ? (
              <video key={story._id} src={mediaUrl} className="max-h-full w-full object-contain" controls autoPlay playsInline onEnded={goNext} />
            ) : (
              <img key={story._id} src={mediaUrl} alt="" className="max-h-full w-full object-contain" />
            )}
          </div>

          {story.caption && (
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-14">
              <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-white">{story.caption}</p>
            </div>
          )}
        </div>
      </div>
    </DayPortal>
  );
}

export function SupraSpaceDayRail({ me, users, presence, uid, onSelectUser }: SupraSpaceDayRailProps) {
  const [dayUsers, setDayUsers] = React.useState<DayUser[]>([]);
  const [ready, setReady] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [viewer, setViewer] = React.useState<{ author: number; story: number } | null>(null);

  const loadDays = React.useCallback((signal?: AbortSignal) => {
    return apiClient
      .get('/api/crm/stories/feed', { signal })
      .then((response) => {
        const next = response.data?.data?.users;
        setDayUsers(Array.isArray(next) ? next : []);
      })
      .catch(() => setDayUsers([]))
      .finally(() => setReady(true));
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    loadDays(controller.signal);
    const timer = window.setInterval(() => loadDays(), 30000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [loadDays]);

  const fallbackUsers = React.useMemo(() => buildFallbackUsers(me, users, uid, presence), [me, presence, uid, users]);
  const railUsers = dayUsers.length ? dayUsers : fallbackUsers;
  const storyUsers = React.useMemo(() => railUsers.filter((user) => user.hasStory && (user.stories || []).length > 0), [railUsers]);
  const meUser = railUsers.find((user) => user.isMe) || fallbackUsers[0];
  const visibleUsers = railUsers.filter((user) => !user.isMe).slice(0, 24);

  const openStories = (userId: string) => {
    const index = storyUsers.findIndex((user) => user._id === userId);
    if (index >= 0) setViewer({ author: index, story: 0 });
  };

  const handleOwnClick = () => {
    if (meUser?.hasStory) {
      openStories(meUser._id);
      return;
    }
    setComposerOpen(true);
  };

  const handleOtherClick = (user: DayUser) => {
    if (user.hasStory) {
      openStories(user._id);
      return;
    }
    onSelectUser(user._id);
  };

  return (
    <>
      <div className="flex items-center gap-3 overflow-x-auto px-4 pb-1 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex shrink-0 flex-col items-center gap-1" style={{ width: 54 }}>
          <div className="relative">
            <button type="button" onClick={handleOwnClick} className="rounded-full p-0.5" style={{ boxShadow: `0 0 0 2px ${ringColor(meUser)}` }} aria-label="View your day">
              <AvatarBubble user={meUser} size={48} />
            </button>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-lg"
              style={{ background: 'var(--accent)', border: '2px solid var(--bg-base)' }}
              aria-label="Add day"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <span className="w-full truncate text-center" style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Your Day
          </span>
        </div>

        {visibleUsers.map((user) => (
          <button key={user._id} type="button" onClick={() => handleOtherClick(user)} className="flex shrink-0 flex-col items-center gap-1" style={{ width: 54 }} aria-label={user.hasStory ? `View ${user.fullName || 'user'} day` : `Message ${user.fullName || 'user'}`}>
            <div className="rounded-full p-0.5" style={{ boxShadow: `0 0 0 2px ${ringColor(user)}` }}>
              <AvatarBubble user={user} size={48} />
            </div>
            <span className="w-full truncate text-center" style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)' }}>
              {firstName(user.fullName)}
            </span>
          </button>
        ))}

        {!ready && !dayUsers.length && (
          <div className="flex shrink-0 flex-col items-center justify-center gap-2" style={{ width: 54 }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-center" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Loading</span>
          </div>
        )}
      </div>

      {composerOpen && <DayComposer onClose={() => setComposerOpen(false)} onPosted={() => loadDays()} />}
      {viewer && (
        <DayViewer
          authors={storyUsers}
          start={viewer}
          onClose={() => {
            setViewer(null);
            loadDays();
          }}
          onChanged={() => loadDays()}
        />
      )}
    </>
  );
}
