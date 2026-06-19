'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { X, Minus, Send, Loader2, MessageCircle, Check, Reply, Pin, Trash2, Smile } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, resolveImageUrl } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import {
  useSupraSpaceMessenger,
  SSConv,
} from '@/context/SupraSpaceMessengerContext';
import { SSMessage } from '@/hooks/useSupraSpaceSocket';

// ─── Layout constants ─────────────────────────────────────────────────────────
const POPUP_W     = 320;
const POPUP_GAP   = 8;
const POPUP_RIGHT = 16;
const POPUP_H     = 400;
const HEADER_H    = 48;

// ─── Emoji data ───────────────────────────────────────────────────────────────
const EMOJI_CATS = [
  { key: 'frequent', label: 'Frequently Used', icon: '🕐', emojis: ['❤️','😂','👍','😮','😢','🎉','🔥','👏','😍','🙏','✨','💯','😊','🥰','😎','🤣','💪','🎊','🌟','💕'] },
  { key: 'smileys',  label: 'Smileys',         icon: '😀', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤔','😐','😑','😶','😏','😒','🙄','😬','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','😭','😱','😨','😰','😥','😓','🥺','😢','😮','😲','😤','😡','🤬','😈','👿','💀','☠️','🤡','👻','👽','👾','🤖'] },
  { key: 'people',   label: 'People',          icon: '👋', emojis: ['👋','🤚','🖐️','✋','🖖','👌','✌️','🤞','🤟','🤘','👈','👉','👆','👇','☝️','👍','👎','✊','👊','👏','🙌','🤝','🙏','💪','🦾','💅','🤳','👁️','👄','👂','👃','🦷','🦴','🦵','🦶'] },
  { key: 'animals',  label: 'Animals',         icon: '🐶', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐴','🦄','🐝','🦋','🐌','🐞','🐜','🐢','🐍','🦎','🐙','🦑','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐆','🦓','🐘','🦒','🐄','🐎','🐖','🐏','🐑','🐐','🦌','🐕','🐈','🦜','🦢','🕊️','🐇','🐁','🐿️','🦔'] },
  { key: 'food',     label: 'Food',            icon: '🍎', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🥔','🥐','🍞','🥖','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🌮','🌯','🥗','🍱','🍣','🍤','🍙','🍚','🍛','🍜','🍝','🍧','🍨','🍦','🧁','🍰','🎂','🍭','🍬','🍫','🍿','🍩','🍪','☕','🍵','🧋','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🍾'] },
  { key: 'activity', label: 'Activities',      icon: '⚽', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🏓','🏸','🏒','🏑','🏏','⛳','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛷','⛸️','🥌','⛷️','🏂','🏋️','🤼','🤸','⛹️','🤺','🧘','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🥁','🎷','🎺','🎸','🎻','🎲','♟️','🎯','🎳','🎮','🕹️'] },
  { key: 'travel',   label: 'Travel',          icon: '🚀', emojis: ['🌍','🌎','🌏','🗺️','🧭','🏔️','⛰️','🌋','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏘️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','⛩️','🕋','⛲','⛺','🌃','🌄','🌅','🌆','🌇','🌉','🌌','🌠','🎆','🎇','🚂','🚃','🚄','🚅','🚆','🚇','🚊','🚝','🚞','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚗','🚙','🛻','🚚','🚛','🚜','🏎️','🏍️','🛵','🚲','🛴','🛹','⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','💺','🚁','🚀','🛸'] },
  { key: 'objects',  label: 'Objects',         icon: '📱', emojis: ['📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','📷','📸','📹','🎥','📺','📻','📞','☎️','📟','📠','🔋','🔌','💡','🔦','🕯️','💰','💳','📊','📈','📉','📋','📁','📂','📑','📄','📃','📜','📅','📆','📇','📒','📓','📔','📕','📗','📘','📙','📚','📖','🔖','✉️','📧','📦','🗃️','🗑️','🔒','🔓','🔑','🗝️','🔨','⚒️','🛠️','⚔️','🛡️','🔧','🔩','⚙️','🧲','💊','💉','🩺','🩹','🚪','🛏️','🛁','🧴','🧹','🧺','🧻','🪣','🧼','🧽','🧯','🛒','🚽','🚿'] },
  { key: 'symbols',  label: 'Symbols',         icon: '🔣', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🔯','✡️','♻️','⚠️','✅','❌','⭕','🛑','⛔','🚫','💯','🔞','🔰','♾️','‼️','⁉️','❓','❔','❕','❗','💤','♨️','🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🟥','🟧','🟨','🟩','🟦','🟪','🟫','⬛','⬜','▪️','▫️'] },
];

const EMOJI_SEARCH: Record<string, string> = {
  '❤️':'heart love red','🧡':'heart orange','💛':'heart yellow','💚':'heart green','💙':'heart blue','💜':'heart purple','🖤':'heart black','💔':'broken heart','❤️‍🔥':'heart fire love',
  '😀':'happy smile grin face','😃':'happy smile big grin','😄':'happy smile laugh','😁':'happy grin smile','😆':'laugh funny smile','😅':'sweat smile nervous','🤣':'laugh rolling funny floor','😂':'laugh cry funny tears','🙂':'slight smile','😉':'wink','😊':'smile happy blush','😇':'angel halo good','🥰':'love hearts smiling','😍':'love heart eyes','🤩':'star eyes amazing wow','😘':'kiss love blow','😚':'kiss love','😋':'yummy food delicious','😛':'tongue silly','😜':'wink tongue silly','🤪':'crazy zany','😝':'tongue closed eyes silly','🤑':'money rich greedy','🤗':'hug hugging happy','🤭':'oops hand mouth giggle','🤔':'thinking hmm wonder','😐':'neutral expressionless','😑':'expressionless blank','😶':'no mouth silent','😏':'smirk sly','😒':'unamused annoyed','🙄':'eye roll whatever','😬':'grimace nervous awkward','😔':'pensive sad','😪':'sleepy tired','😴':'sleep zzz','😷':'mask sick doctor','🤒':'sick thermometer','🤕':'hurt injured head bandage','🤢':'nausea sick vomit','🤮':'vomit sick','🥵':'hot heat sweating','🥶':'cold freezing','😵':'dizzy spiral','🤯':'exploding head mind blown','🤠':'cowboy hat western','🥳':'party celebration','😎':'cool sunglasses','🤓':'nerd glasses','😭':'cry sob sad tears','😱':'shocked scared gasp','😨':'fearful scared','😰':'anxious nervous sweat','😥':'sad relieved','😓':'downcast sweat','🥺':'pleading puppy eyes','😢':'cry sad tear','😮':'wow surprised open mouth','😲':'astonished shocked','😤':'triumphant angry steam','😡':'angry mad red face','🤬':'curse swear angry symbols','😈':'devil evil purple horns','👿':'angry devil red horns','💀':'skull death dead','☠️':'skull crossbones death','🤡':'clown','👻':'ghost boo halloween','👽':'alien extraterrestrial','👾':'alien monster space game','🤖':'robot machine',
  '👋':'wave hello hi hand','✋':'stop hand raised','🖐️':'hand raised five fingers','🖖':'vulcan salute spock','👌':'ok perfect','✌️':'peace victory two fingers','🤞':'fingers crossed luck','🤟':'love you hand','🤘':'rock metal horns','👈':'point left','👉':'point right','👆':'point up','👇':'point down','☝️':'point up index','👍':'thumbs up like good','👎':'thumbs down dislike bad','✊':'raised fist','👊':'punch fist','👏':'clap applause','🙌':'celebrate hands up raise','🤝':'handshake deal agree','🙏':'pray thank please hands','💪':'strong muscle flex arm','🦾':'mechanical arm strong',
  '🔥':'fire hot flame lit','✨':'sparkle stars shine','🎉':'party celebrate confetti popper','🎊':'confetti celebrate party','🏆':'trophy winner prize champion','⭐':'star favorite','🌟':'glowing star','💯':'hundred perfect score','🎵':'music note song','🎶':'music notes songs',
  '🐶':'dog puppy pet','🐱':'cat kitten pet','🐭':'mouse rodent','🐹':'hamster','🐰':'rabbit bunny ears','🦊':'fox','🐻':'bear','🐼':'panda bear','🐨':'koala','🐯':'tiger','🦁':'lion king','🐮':'cow moo','🐷':'pig oink','🐸':'frog','🐵':'monkey','🙈':'see no evil monkey','🙉':'hear no evil monkey','🙊':'speak no evil monkey','🐔':'chicken hen','🐧':'penguin','🐦':'bird','🦆':'duck','🦅':'eagle hawk','🦉':'owl','🦇':'bat halloween','🐴':'horse','🦄':'unicorn rainbow','🐝':'bee honey','🦋':'butterfly','🐢':'turtle slow','🐍':'snake','🐙':'octopus','🦑':'squid','🦀':'crab','🐠':'tropical fish','🐟':'fish','🐬':'dolphin','🐋':'whale','🦈':'shark',
  '🍎':'apple red fruit','🍐':'pear fruit','🍊':'orange fruit','🍋':'lemon sour citrus','🍌':'banana yellow fruit','🍉':'watermelon','🍇':'grapes','🍓':'strawberry','🍒':'cherries','🍑':'peach','🥭':'mango','🍍':'pineapple','🥥':'coconut','🥝':'kiwi','🍅':'tomato','🍆':'eggplant aubergine','🥑':'avocado','🥦':'broccoli','🥒':'cucumber','🌶️':'hot pepper chili spicy','🍕':'pizza','🍔':'burger hamburger','🍟':'french fries chips','🌭':'hot dog','🌮':'taco','🌯':'burrito wrap','🍣':'sushi','🍜':'noodles ramen','🍝':'spaghetti pasta','🧁':'cupcake','🍰':'cake slice birthday','🎂':'birthday cake','🍫':'chocolate','🍿':'popcorn movie','🍩':'donut doughnut','🍪':'cookie','☕':'coffee hot drink','🍵':'tea green hot','🧋':'bubble tea boba','🍺':'beer drink','🍻':'beers cheers clinking','🥂':'champagne celebration cheers','🍷':'wine red drink','🥃':'whiskey spirit glass','🍸':'cocktail martini','🍹':'tropical drink juice','🍾':'champagne bottle pop',
  '⚽':'soccer football ball','🏀':'basketball ball','🏈':'football american','⚾':'baseball ball','🎾':'tennis ball','🎮':'video game controller gaming','🎲':'dice roll game',
  '📱':'phone mobile cell','💻':'laptop computer notebook','📷':'camera photo picture','🔒':'lock secure privacy','🔑':'key unlock','⚠️':'warning caution danger','✅':'check mark done yes','❌':'cross wrong no',
  '🚀':'rocket launch space','✈️':'airplane fly travel','🌍':'earth globe world','🌈':'rainbow colorful','🌊':'wave ocean water','⚡':'lightning bolt electric fast','❄️':'snowflake cold ice winter','🌸':'cherry blossom flower spring','🌺':'flower hibiscus','🌹':'rose flower red love',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDisplayName(conv: SSConv, myId: string | null): string {
  if (conv.type === 'group') return conv.name || 'Group';
  return conv.members.find((m) => m._id !== myId)?.fullName ?? 'Unknown';
}
function getAvatarSrc(conv: SSConv, myId: string | null): string | undefined {
  if (conv.type === 'group') return conv.avatar;
  return conv.members.find((m) => m._id !== myId)?.avatar;
}
function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
function msgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
const MEDIA_LABELS: Record<string, string> = {
  image: '📷 Photo', voice: '🎤 Voice message', gif: '🎬 GIF',
  file: '📎 File', poll: '📊 Poll', event: '📅 Event',
};
function renderContent(msg: SSMessage, isOwn: boolean): React.ReactNode {
  const label = MEDIA_LABELS[msg.type];
  if (label) return label;
  const text = msg.content ?? '';
  // Match @word or @Word LastName (full name mentions with optional space-separated last word)
  const parts = text.split(/(@\w+(?:\s[A-Z][a-zA-Z]*)?)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        /^@/.test(part) ? (
          <span key={i} className="font-bold"
            style={isOwn
              ? { color: 'rgba(255,255,255,0.95)', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.5)' }
              : { color: '#60a5fa' }}
          >{part}</span>
        ) : part
      )}
    </>
  );
}

// ─── EmojiPicker ──────────────────────────────────────────────────────────────
interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: { top: number; left?: number; right?: number };
}
function EmojiPicker({ onSelect, onClose, position }: EmojiPickerProps) {
  const [search, setSearch] = React.useState('');
  const [activeCat, setActiveCat] = React.useState('frequent');
  const pickerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const searchResults = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const seen = new Set<string>();
    return EMOJI_CATS.flatMap(c => c.emojis).filter(emoji => {
      if (seen.has(emoji)) return false;
      seen.add(emoji);
      return emoji === q || (EMOJI_SEARCH[emoji] || '').includes(q);
    });
  }, [search]);

  const displayCat = EMOJI_CATS.find(c => c.key === activeCat) || EMOJI_CATS[0];
  const displayEmojis = searchResults ?? displayCat.emojis;
  const top = Math.max(8, Math.min(position.top, (typeof window !== 'undefined' ? window.innerHeight : 800) - 360));

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={pickerRef}
      className="fixed z-[9999] flex flex-col rounded-2xl shadow-2xl"
      style={{
        top, left: position.left, right: position.right,
        width: 288, height: 340,
        background: 'var(--bg-elevated,#18191c)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Search */}
      <div className="p-2 border-b border-white/10 shrink-0">
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full rounded-lg px-3 py-1.5 text-white placeholder:text-white/40 outline-none"
          style={{ background: 'rgba(255,255,255,0.08)', fontSize: 13, border: 'none' }}
        />
      </div>
      {/* Category tabs */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-white/10 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {EMOJI_CATS.map(cat => (
          <button key={cat.key} onClick={() => { setActiveCat(cat.key); setSearch(''); }}
            title={cat.label}
            className={cn('shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors',
              activeCat === cat.key && !search ? 'bg-blue-500/30' : 'hover:bg-white/10 text-white/50'
            )}
          >{cat.icon}</button>
        ))}
      </div>
      {/* Label */}
      <div className="px-3 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/30 shrink-0">
        {search ? `Results for "${search}"` : displayCat.label}
      </div>
      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {displayEmojis.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-[11px] text-white/30">No results</div>
        ) : (
          <div className="grid grid-cols-8 gap-0">
            {displayEmojis.map((emoji, i) => (
              <button key={emoji + i}
                onClick={() => { onSelect(emoji); onClose(); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/15 text-base transition-colors leading-none"
              >{emoji}</button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Single popup ─────────────────────────────────────────────────────────────
interface ChatPopupProps {
  conv: SSConv;
  stackIndex: number;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
}

function ChatPopup({ conv, stackIndex, isMinimized, onClose, onToggleMinimize }: ChatPopupProps) {
  const { crmUserId, crmToken, socket, markAsRead } = useSupraSpaceMessenger();
  const [messages, setMessages] = React.useState<SSMessage[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [fetchError, setFetchError] = React.useState(false);
  const [input,    setInput]    = React.useState('');
  const [sending,  setSending]  = React.useState(false);
  const [replyTo,  setReplyTo]  = React.useState<SSMessage | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef  = React.useRef<HTMLInputElement>(null);

  // @mention
  const [mentionQuery,  setMentionQuery]  = React.useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = React.useState<number>(-1);
  const [mentionIdx,    setMentionIdx]    = React.useState(0);

  // Hover action bar (portal-based to escape overflow)
  const [hovMsg, setHovMsg] = React.useState<string | null>(null);
  const [barPos, setBarPos] = React.useState<{ top: number; isOwn: boolean; left?: number; right?: number } | null>(null);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverBar  = React.useRef(false);

  // Full emoji picker
  const [emojiPickerMsg, setEmojiPickerMsg] = React.useState<string | null>(null);
  const [emojiPickerPos, setEmojiPickerPos] = React.useState<{ top: number; left?: number; right?: number } | null>(null);

  // Reaction tooltip
  const [openReactPop, setOpenReactPop] = React.useState<string | null>(null);

  // ── Hover handlers ──
  const handleMsgEnter = (e: React.MouseEvent<HTMLDivElement>, msgId: string, isOwn: boolean) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    isOverBar.current = false;
    setHovMsg(msgId);
    const rect = e.currentTarget.getBoundingClientRect();
    setBarPos({
      top: Math.max(8, rect.top - 38),
      isOwn,
      ...(isOwn ? { right: window.innerWidth - rect.right } : { left: rect.left }),
    });
  };
  const handleMsgLeave = () => {
    hoverTimer.current = setTimeout(() => {
      if (!isOverBar.current) { setHovMsg(null); setBarPos(null); }
    }, 160);
  };
  const handleBarEnter = () => { isOverBar.current = true; if (hoverTimer.current) clearTimeout(hoverTimer.current); };
  const handleBarLeave = () => { isOverBar.current = false; setHovMsg(null); setBarPos(null); };
  const clearBar = () => { setHovMsg(null); setBarPos(null); };

  // ── Actions ──
  const handleReact = async (messageId: string, emoji: string) => {
    clearBar();
    try {
      await apiClient.post(`/api/supraspace/messages/${messageId}/react`, { emoji },
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any);
    } catch { /* best-effort */ }
  };

  const handleDelete = async (msgId: string) => {
    clearBar();
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: true, content: '', attachments: [] } as any : m));
    try {
      await apiClient.delete(`/api/supraspace/messages/${msgId}`,
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any);
    } catch {
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: false } : m));
    }
  };

  const handleReply = (msgId: string) => {
    const msg = messages.find(m => m._id === msgId);
    if (msg) setReplyTo(msg);
    clearBar();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const openEmojiPickerForMsg = (msgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pickerW = 288;
    // Center picker on the button, then clamp so it never exits viewport
    const idealLeft = btn.left + btn.width / 2 - pickerW / 2;
    const left = Math.max(8, Math.min(idealLeft, window.innerWidth - pickerW - 8));
    setEmojiPickerMsg(msgId);
    setEmojiPickerPos({ top: btn.top - 350, left });
    clearBar();
  };

  // ── Seen avatars — supplement stale conv.members with fresh sender data from messages ──
  const msgSeenByMembers = React.useMemo(() => {
    const freshAvatar: Record<string, string | undefined> = {};
    const freshName: Record<string, string | undefined> = {};
    messages.forEach(m => {
      if (m.sender?._id && !freshAvatar[m.sender._id]) {
        freshAvatar[m.sender._id] = m.sender.avatar;
        freshName[m.sender._id] = m.sender.fullName;
      }
    });
    const lastSeen: Record<string, string> = {};
    messages.forEach(m => { (m.readBy || []).forEach((id: string) => { if (id !== crmUserId) lastSeen[id] = m._id; }); });
    const result: Record<string, { _id: string; fullName: string; avatar?: string }[]> = {};
    conv.members.forEach(member => {
      if (member._id === crmUserId) return;
      const lastMsgId = lastSeen[member._id];
      if (lastMsgId) {
        if (!result[lastMsgId]) result[lastMsgId] = [];
        result[lastMsgId].push({
          ...member,
          avatar: freshAvatar[member._id] ?? member.avatar,
          fullName: freshName[member._id] ?? member.fullName,
        });
      }
    });
    return result;
  }, [messages, conv.members, crmUserId]);

  const displayName = getDisplayName(conv, crmUserId);
  const avatarSrc   = getAvatarSrc(conv, crmUserId);
  const rightPx     = POPUP_RIGHT + stackIndex * (POPUP_W + POPUP_GAP);

  const mentionOptions = React.useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const allOpt = conv.type === 'group' ? [{ id: 'all', name: 'all', fullName: 'Notify all members' }] : [];
    const memberOpts = conv.members.filter(m => m._id !== crmUserId)
      .map(m => {
        const parts = m.fullName.trim().split(/\s+/);
        const name = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
        return { id: m._id, name, fullName: m.fullName };
      });
    const opts = [...allOpt, ...memberOpts];
    if (!q) return opts;
    return opts.filter(o => o.name.toLowerCase().startsWith(q) || o.fullName.toLowerCase().includes(q));
  }, [mentionQuery, conv, crmUserId]);

  const insertMention = React.useCallback((name: string) => {
    const before = input.slice(0, mentionAnchor);
    const after  = input.slice(mentionAnchor + 1 + (mentionQuery?.length ?? 0));
    const next   = `${before}@${name} ${after}`;
    setInput(next); setMentionQuery(null); setMentionAnchor(-1);
    setTimeout(() => {
      if (inputRef.current) {
        const pos = before.length + name.length + 2;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    }, 0);
  }, [input, mentionAnchor, mentionQuery]);

  const fetchMessages = React.useCallback(async () => {
    const effectiveToken = crmToken || (typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null);
    if (!effectiveToken) return;
    setLoading(true); setFetchError(false);
    try {
      const r = await apiClient.get(`/api/supraspace/conversations/${conv._id}/messages`, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
        params: { limit: 40 },
      });
      setMessages(r.data?.data ?? []);
      markAsRead(conv._id);
    } catch (err: any) {
      console.error('[ChatPopup] messages fetch failed:', err?.response?.status, err?.response?.data ?? err?.message);
      setFetchError(true);
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv._id, crmToken]);

  React.useEffect(() => { fetchMessages(); }, [fetchMessages]);
  React.useEffect(() => {
    if (!isMinimized && messages.length > 0) markAsRead(conv._id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMinimized]);
  // Join/leave conversation room so we receive messages:read events from other members
  React.useEffect(() => {
    if (!socket) return;
    socket.emit('join:conversation', { conversationId: conv._id });
    return () => { socket.emit('leave:conversation', { conversationId: conv._id }); };
  }, [socket, conv._id]);

  React.useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId, message }: { conversationId: string; message: SSMessage }) => {
      if (conversationId !== conv._id) return;
      setMessages(prev => prev.find(m => m._id === message._id) ? prev : [...prev, message]);
      if (!isMinimized) markAsRead(conv._id);
    };
    socket.on('message:new', handler);
    return () => { socket.off('message:new', handler); };
  }, [socket, conv._id, isMinimized, markAsRead]);
  React.useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      if (conversationId !== conv._id) return;
      setMessages(prev => prev.map(m =>
        (m.readBy || []).includes(userId) ? m : { ...m, readBy: [...(m.readBy || []), userId] }
      ));
    };
    socket.on('messages:read', handler);
    return () => { socket.off('messages:read', handler); };
  }, [socket, conv._id]);
  React.useEffect(() => {
    if (!isMinimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isMinimized]);
  React.useEffect(() => {
    if (!isMinimized) setTimeout(() => inputRef.current?.focus(), 60);
  }, [isMinimized]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !crmToken) return;
    const currentReplyTo = replyTo;
    setInput(''); setMentionQuery(null); setMentionAnchor(-1); setReplyTo(null); setSending(true);
    try {
      const body: any = { content: text };
      if (currentReplyTo) body.replyTo = currentReplyTo._id;
      const r = await apiClient.post(`/api/supraspace/conversations/${conv._id}/messages`, body,
        { headers: { Authorization: `Bearer ${crmToken}` }, _skipAuthRefresh: true } as any);
      const sent: SSMessage = r.data?.data;
      if (sent) setMessages(prev => prev.find(m => m._id === sent._id) ? prev : [...prev, sent]);
    } catch { /* ignored */ } finally { setSending(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const cursor = e.target.selectionStart ?? val.length;
    if (mentionAnchor >= 0) {
      if (cursor <= mentionAnchor || val[mentionAnchor] !== '@') {
        setMentionQuery(null); setMentionAnchor(-1);
      } else {
        const q = val.slice(mentionAnchor + 1, cursor);
        if (q.includes('  ')) { setMentionQuery(null); setMentionAnchor(-1); }
        else { setMentionQuery(q); setMentionIdx(0); }
      }
    } else {
      const match = val.slice(0, cursor).match(/@(\w*)$/);
      if (match) { setMentionQuery(match[1]); setMentionAnchor(cursor - match[0].length); setMentionIdx(0); }
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null && mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionOptions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionOptions[mentionIdx].name); return; }
      if (e.key === 'Escape') { setMentionQuery(null); setMentionAnchor(-1); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* ── Popup container — no overflow-hidden so portals render correctly ── */}
      <div
        className="fixed bottom-0 z-50 flex flex-col shadow-2xl rounded-t-xl border border-border/60 bg-card"
        style={{ width: POPUP_W, right: rightPx, height: isMinimized ? HEADER_H : POPUP_H, transition: 'height 0.2s ease' }}
      >
        {/* Header */}
        <div
          className="h-12 shrink-0 flex items-center gap-2.5 px-3 bg-gradient-to-r from-blue-600 to-blue-500 cursor-pointer select-none rounded-t-xl overflow-hidden"
          onClick={onToggleMinimize}
        >
          <Avatar className="h-7 w-7 shrink-0">
            {avatarSrc && <AvatarImage src={resolveImageUrl(avatarSrc)} />}
            <AvatarFallback className="text-[10px] font-semibold bg-blue-400 text-white">{initials(displayName)}</AvatarFallback>
          </Avatar>
          <span className="text-[13px] font-semibold text-white truncate flex-1">{displayName}</span>
          <button className="shrink-0 text-white/80 hover:text-white transition-colors p-0.5 rounded"
            onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }} title={isMinimized ? 'Expand' : 'Minimize'}>
            <Minus className="size-3.5" />
          </button>
          <button className="shrink-0 text-white/80 hover:text-white transition-colors p-0.5 rounded"
            onClick={(e) => { e.stopPropagation(); onClose(); }} title="Close">
            <X className="size-3.5" />
          </button>
        </div>

        {/* Body */}
        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto px-3 py-2 bg-background min-h-0 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                  <MessageCircle className="size-6 text-muted-foreground/30" />
                  <p className="text-[11px] text-muted-foreground">{fetchError ? 'Failed to load messages' : 'No messages yet'}</p>
                  {fetchError && (
                    <button onClick={fetchMessages} className="text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2">Retry</button>
                  )}
                </div>
              ) : (
                messages.map((msg, idx) => {
                  if (msg.isDeleted) return null;
                  const isOwn = msg.sender?._id === crmUserId;
                  const prevVisible = messages.slice(0, idx).findLast(m => !m.isDeleted);
                  const showName = !isOwn && (!prevVisible || prevVisible.sender?._id !== msg.sender?._id);
                  const seenMembers = msgSeenByMembers[msg._id] || [];
                  return (
                    <div key={msg._id}
                      className={cn('flex gap-1.5', isOwn ? 'flex-row-reverse items-end' : 'flex-row items-end')}
                      onMouseEnter={(e) => handleMsgEnter(e, msg._id, isOwn)}
                      onMouseLeave={handleMsgLeave}
                    >
                      {/* Sender avatar for non-own messages */}
                      {!isOwn && (
                        <div className="shrink-0 self-end mb-0.5">
                          {showName ? (
                            <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center text-white ring-1 ring-white/10"
                              style={{ fontSize: 7, background: 'var(--accent-muted,#3b82f6)' }}>
                              {msg.sender?.avatar
                                ? <img src={resolveImageUrl(msg.sender.avatar)} alt="" className="w-full h-full object-cover" />
                                : msg.sender?.fullName?.[0]?.toUpperCase()}
                            </div>
                          ) : (
                            <div className="h-5 w-5" /> /* spacer to keep alignment */
                          )}
                        </div>
                      )}
                      <div className="max-w-[76%] flex flex-col" style={{ alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                      {showName && !isOwn && (
                        <span className="px-1 mb-0.5 text-[10px] font-semibold" style={{ color: 'var(--accent-text,#60a5fa)' }}>
                          {msg.sender?.fullName}
                        </span>
                      )}
                        {/* Bubble */}
                        <div className={cn(
                          'px-3 py-1.5 rounded-2xl text-[12px] leading-relaxed break-words',
                          isOwn ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
                        )}>
                          {/* Reply preview */}
                          {msg.replyTo && (
                            <div className={cn('mb-1 px-2 py-1 rounded-lg text-[10px] border-l-2', isOwn ? 'bg-white/15 border-white/60' : 'bg-black/5 border-blue-400')}
                              style={{ maxWidth: 160 }}>
                              <div className={cn('font-semibold truncate', isOwn ? 'text-white/80' : 'text-blue-400')}>
                                {(msg.replyTo as any)?.sender?.fullName || 'Reply'}
                              </div>
                              <div className={cn('truncate', isOwn ? 'text-white/60' : 'text-foreground/50')}>
                                {(msg.replyTo as any)?.content || '📎 Attachment'}
                              </div>
                            </div>
                          )}
                          {renderContent(msg, isOwn)}
                          {isOwn ? (
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-[9px] text-white/60">{msgTime(msg.createdAt)}</span>
                              {seenMembers.length === 0 ? (
                                <Check className="h-2.5 w-2.5 text-white/50" />
                              ) : (
                                <div className="flex items-center" style={{ gap: 1 }}>
                                  {seenMembers.slice(0, 3).map(m => (
                                    <div key={m._id} title={m.fullName}
                                      className="h-3.5 w-3.5 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-white ring-1 ring-white/30"
                                      style={{ fontSize: 6, background: 'rgba(255,255,255,0.25)' }}>
                                      {m.avatar
                                        ? <img src={resolveImageUrl(m.avatar)} alt="" className="w-full h-full object-cover" />
                                        : m.fullName[0]?.toUpperCase()}
                                    </div>
                                  ))}
                                  {seenMembers.length > 3 && <span className="text-[8px] text-white/60">+{seenMembers.length - 3}</span>}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[9px] mt-0.5 text-muted-foreground">{msgTime(msg.createdAt)}</div>
                          )}
                        </div>
                        {/* Reaction pills */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={cn('flex flex-wrap gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
                            {msg.reactions.map(r => {
                              const mine = (r.users || []).includes(crmUserId || '');
                              const whoArr = (r.users || []).map((uid: string) => {
                                const member = conv.members?.find((x: any) => x._id === uid);
                                return member?.fullName || '';
                              }).filter(Boolean);
                              const popId = msg._id + ':' + r.emoji;
                              const isPopOpen = openReactPop === popId;
                              return (
                                <div key={r.emoji} className="relative"
                                  onMouseEnter={() => setOpenReactPop(popId)}
                                  onMouseLeave={() => setOpenReactPop(null)}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
                                        setOpenReactPop(isPopOpen ? null : popId);
                                      } else {
                                        handleReact(msg._id, r.emoji);
                                      }
                                    }}
                                    className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] cursor-pointer transition-all border',
                                      mine ? 'border-blue-400/60 bg-blue-500/10 text-blue-300' : 'border-white/10 bg-white/5 text-foreground/70 hover:border-white/20'
                                    )}
                                  >
                                    <span>{r.emoji}</span>
                                    <span style={{ fontSize: 9 }}>{r.users.length}</span>
                                  </button>
                                  {isPopOpen && whoArr.length > 0 && (
                                    <div
                                      className={cn('absolute z-50 bottom-full mb-1.5 px-2.5 py-1.5 rounded-lg text-[10px] min-w-[100px] max-w-[170px]',
                                        isOwn ? 'right-0' : 'left-0')}
                                      style={{ background: '#1a1b1e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', pointerEvents: 'none' }}
                                    >
                                      <div className="text-sm text-center mb-1">{r.emoji}</div>
                                      {whoArr.map((name: string, i: number) => (
                                        <div key={i} className="text-white/70 leading-tight truncate">{name}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="shrink-0 border-t border-border/50 bg-card">
              {mentionQuery !== null && mentionOptions.length > 0 && (
                <div className="px-1 pt-1 pb-0.5 border-b border-border/40 max-h-32 overflow-y-auto">
                  {mentionOptions.map((opt, idx) => (
                    <button key={opt.id}
                      onMouseDown={e => { e.preventDefault(); insertMention(opt.name); }}
                      className={cn('w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-[11px] transition-colors',
                        idx === mentionIdx ? 'bg-blue-500/15 text-blue-400' : 'hover:bg-muted/60 text-foreground')}
                    >
                      <span className="font-semibold text-blue-400">@{opt.id === 'all' ? opt.name : opt.fullName}</span>
                      {opt.id === 'all' && <span className="text-muted-foreground truncate">{opt.fullName}</span>}
                    </button>
                  ))}
                </div>
              )}
              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-blue-500/5">
                  <div className="w-0.5 self-stretch rounded-full bg-blue-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-blue-400">{replyTo.sender?.fullName}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{replyTo.content || '📎 Attachment'}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground hover:text-foreground p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 px-2 py-2">
                <input ref={inputRef} value={input} onChange={handleChange} onKeyDown={handleKeyDown}
                  onBlur={() => setTimeout(() => { setMentionQuery(null); setMentionAnchor(-1); }, 150)}
                  placeholder="Type a message..."
                  className="flex-1 text-[12px] bg-muted/50 rounded-full px-3 py-1.5 outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-blue-500/40 min-w-0"
                  style={{ fontSize: 16 }}
                />
                <Button size="icon" variant="ghost"
                  className="h-7 w-7 rounded-full shrink-0 text-blue-500 hover:bg-blue-500/10 disabled:opacity-40"
                  disabled={!input.trim() || sending} onClick={handleSend}
                >
                  {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Fixed action bar portal — escapes overflow clipping ── */}
      {barPos && hovMsg && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9998] flex items-center gap-0.5 px-1.5 py-1 rounded-xl"
          style={{
            top: barPos.top,
            left: barPos.left,
            right: barPos.right,
            background: 'var(--surface-1,#1a1b1e)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={handleBarEnter}
          onMouseLeave={handleBarLeave}
        >
          {['❤️','😂','👍','😮','😢','🎉'].map(emoji => (
            <button key={emoji}
              className="hover:bg-white/10 rounded px-1 py-0.5 text-sm transition-colors leading-none"
              onClick={() => handleReact(hovMsg, emoji)}
            >{emoji}</button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button title="Add reaction"
            className="hover:bg-white/10 rounded p-1 transition-colors text-white/50 hover:text-white/80"
            onClick={(e) => openEmojiPickerForMsg(hovMsg, e)}
          >
            <Smile className="h-3.5 w-3.5" />
          </button>
          <button title="Reply"
            className="hover:bg-white/10 rounded p-1 transition-colors text-white/50 hover:text-white/80"
            onClick={() => handleReply(hovMsg)}
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
          <button title="Pin"
            className="hover:bg-white/10 rounded p-1 transition-colors text-white/50 hover:text-white/80"
            onClick={clearBar}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          {messages.find(m => m._id === hovMsg)?.sender?._id === crmUserId && (
            <button title="Delete"
              className="hover:bg-red-500/20 rounded p-1 transition-colors text-red-400/60 hover:text-red-400"
              onClick={() => handleDelete(hovMsg)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>,
        document.body
      )}

      {/* ── Full emoji picker portal ── */}
      {emojiPickerMsg && emojiPickerPos && (
        <EmojiPicker
          position={emojiPickerPos}
          onSelect={(emoji) => handleReact(emojiPickerMsg, emoji)}
          onClose={() => { setEmojiPickerMsg(null); setEmojiPickerPos(null); }}
        />
      )}
    </>
  );
}

// ─── Manager ──────────────────────────────────────────────────────────────────
export function ChatPopupManager() {
  const { conversations, openChats, minimizedChats, closeChatPopup, toggleMinimize } = useSupraSpaceMessenger();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (openChats.length === 0) return null;
  if (pathname === '/crm/supra-space') return null;
  if (isMobile) return null;

  return (
    <>
      {openChats.map((convId, index) => {
        const conv = conversations.find((c) => c._id === convId);
        if (!conv) return null;
        return (
          <ChatPopup
            key={convId}
            conv={conv}
            stackIndex={index}
            isMinimized={minimizedChats.has(convId)}
            onClose={() => closeChatPopup(convId)}
            onToggleMinimize={() => toggleMinimize(convId)}
          />
        );
      })}
    </>
  );
}
