import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Customer screens that follow the light/dark theme (2026-11-18): the member
// cards, Membership, Refer & Earn, the support chat's photo, and the empty band
// that opened above the bottom bar when the support chat jumped to a message.
const read = (rel) =>
  fs.readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const theme = loadLib('membership-theme');
const inline = read('components/customer/MembershipCardInline.tsx');
const modal = read('components/customer/MembershipCardModal.tsx');
const membership = read('app/(customer)/customer/membership/page.tsx');
const refer = read('app/(customer)/customer/refer/page.tsx');
const support = read('app/(customer)/customer/support/page.tsx');
const layout = read('app/(customer)/customer/layout.tsx');

test('class colors: the deeper shade on light screens, the bright one on dark', () => {
  assert.equal(theme.TIER_TEXT, 'text-(--tier-ink) dark:text-(--tier)');
  assert.deepEqual(theme.tierColorVars({ primary: '#fbbf24', secondary: '#b45309' }), { '--tier': '#fbbf24', '--tier-ink': '#b45309' });
  // Until the class has loaded: Ignition's gray shades.
  assert.deepEqual(theme.tierColorVars(undefined), { '--tier': '#9ca3af', '--tier-ink': '#4b5563' });
  assert.deepEqual(theme.tierColorVars({ primary: '#38bdf8' }), { '--tier': '#38bdf8', '--tier-ink': '#38bdf8' });
  // Mint on light screens with a solid base; the green-black card on dark.
  assert.match(theme.MEMBER_CARD_SURFACE, /^bg-card bg-linear-140 from-card via-primary\/8/);
  assert.match(theme.MEMBER_CARD_SURFACE, /dark:from-\[#060d10\] dark:via-\[#0b1a14\] dark:to-\[#071210\] dark:text-white/);
});

test('both member cards follow the theme and grow instead of cutting text off', () => {
  for (const [name, card] of [['inline', inline], ['modal', modal]]) {
    assert.doesNotMatch(card, /background: "linear-gradient\(140deg, #060d10/, name);
    assert.match(card, /MEMBER_CARD_SURFACE,/, name);
    assert.match(card, /grid grid-cols-\[minmax\(0,1fr\)\]/, name);
    assert.match(card, /<span aria-hidden="true" className="col-start-1 row-start-1 w-full self-start" style=\{\{ aspectRatio: "1\.586" \}\} \/>/, name);
    assert.match(card, /relative z-10 col-start-1 row-start-1 flex flex-col/, name);
    assert.doesNotMatch(card, /style=\{\{ color: (tierPrimary|`\$\{tierPrimary\})/, name);
    // Every white text on the card has a light-screen color too.
    for (const [cls] of card.matchAll(/[\w:/[\]-]*text-white(?:\/\d+)?\b/g)) {
      if (!cls.startsWith('dark:')) assert.ok(['text-white'].includes(cls), `${name}: ${cls}`);
    }
  }
  assert.match(inline, /bg-emerald-800 px-2 py-0\.5 text-\[11px\] font-bold uppercase tracking-\[0\.12em\] text-white backdrop-blur-sm dark:bg-black\/55/);
});

test('the member card pop-up: its own close button above the card, named for screen readers', () => {
  assert.match(modal, /showCloseButton=\{false\}/);
  assert.doesNotMatch(modal, /\[&>button\]:left-3/);
  assert.match(modal, /<DialogTitle className="sr-only">\{dealerName\} membership card<\/DialogTitle>/);
  assert.match(modal, /<DialogDescription className="sr-only">/);
  assert.match(modal, /<DialogClose\s+aria-label="Close"/);
  assert.ok(modal.indexOf('<DialogClose') < modal.lastIndexOf('MEMBER_CARD_SURFACE,'), 'close button comes before the card');
  assert.equal(modal.match(/className=\{CARD_ACTION\}/g)?.length, 3);
});

test('Membership: mint hero and ladder on light screens, class gradients on dark', () => {
  assert.match(membership, /className="absolute inset-0 hidden dark:block"\n\s+style=\{\{ background: `linear-gradient\(135deg/);
  assert.match(membership, /<div className="absolute inset-0 hidden bg-black\/45 dark:block" \/>/);
  assert.match(membership, /border-primary\/50 bg-linear-160 from-primary\/8 to-primary\/20 shadow-lg dark:border-transparent dark:\[background-image:var\(--tier-grad\)\]/);
  assert.match(membership, /bg-emerald-700 px-2 py-0\.5 text-\[11px\] font-black uppercase tracking-wider text-white shadow dark:bg-white dark:text-zinc-900/);
  // Class-colored text never uses the pale shade on light screens.
  assert.doesNotMatch(membership, /color: (t|s|selTier)\.(colorTheme\.primary|accent)/);
  assert.doesNotMatch(membership, /style=\{\{ background: `\$\{s\.accent\}1a`/);
  assert.match(membership, /bg-\(--tier-ink\) text-white dark:bg-\(--tier\) dark:text-zinc-950/);
});

test('Refer & Earn: mint wallet card on light screens, Share Link in Suprah green', () => {
  assert.match(refer, /bg-linear-to-br from-card via-primary\/5 to-primary\/15 text-foreground .* dark:bg-none dark:bg-zinc-950 dark:text-white/);
  assert.match(refer, /from-emerald-950 to-emerald-700 dark:from-white dark:to-zinc-400/);
  assert.doesNotMatch(refer, /bg-zinc-900 text-white dark:bg-white dark:text-zinc-900/);
  assert.match(refer, /<Button onClick=\{handleNativeShare\} className="w-full h-11 sm:h-12 text-sm bg-primary text-primary-foreground hover:bg-primary\/90/);
});

test('support chat: the header photo or initials, and no empty band above the bottom bar', () => {
  assert.match(support, /const \{ avatarUrl \} = useProfileContext\(\);/);
  assert.match(support, /savedAvatar && !savedAvatar\.endsWith\("\/placeholder-avatar\.png"\) \? resolveImageUrl\(savedAvatar\) : undefined/);
  assert.match(support, /<AvatarFallback className="rounded-xl/);
  assert.doesNotMatch(support, /<img\s+src=\{ownAvatar\}/);
  // The scrolling area keeps hidden helpers (the chat's file picker) inside it.
  assert.match(layout, /<main className="relative flex-1 overflow-auto p-4 lg:p-8 pb-\[calc\(7rem\+env\(safe-area-inset-bottom\)\)\] md:pb-8">/);
});
