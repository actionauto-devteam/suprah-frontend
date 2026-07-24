// Repairs cp1252 mojibake in SupraSpace page.tsx. Idempotent.
const fs = require('fs');
const path = process.argv[2];
let src = fs.readFileSync(path, 'utf8');
let changes = 0;
const apply = (label, find, repl) => {
  const n = src.split(find).length - 1;
  if (n > 0) { src = src.split(find).join(repl); changes += n; console.log(`  fixed ${n}x  ${label}`); }
};
const B = '\\u2022\\u00b7\\u2023\\u2043\\u25aa\\u25ab\\u25cf\\u25cb';
const D = '\\u2013\\u2014';
apply('build-breaker alternation', '(?:&bull;|&#8226;|&#x2022;|\u2022|\u00b7|?|?|?|?|?|?)', `(?:&bull;|&#8226;|&#x2022;|[${B}])`);
apply('char class [-*+...]', '[-*+\u2022\u00b7??????\u2013\u2014]', `[-*+${B}${D}]`);
apply('char class [bullets\\-*+...]', '[\u2022\u00b7??????\\-*+\u2013\u2014]', `[${B}\\-*+${D}]`);
apply('marker array', "['\u2022', '\u00b7', '?', '?', '?', '?', '?', '?', '-', '*', '+', '\u2013', '\u2014']", "['\\u2022', '\\u00b7', '\\u2023', '\\u2043', '\\u25aa', '\\u25ab', '\\u25cf', '\\u25cb', '-', '*', '+', '\\u2013', '\\u2014']");
apply('SS4_REACTIONS', "['??', '??', '??', '??', '??', '??', '??', '??']", "['\\u{1f44d}', '\\u{2764}\\u{fe0f}', '\\u{1f602}', '\\u{1f62e}', '\\u{1f622}', '\\u{1f64f}', '\\u{1f525}', '\\u{1f389}']");
apply('voice preview', "'??? Voice message'", "'\\u{1f3a4} Voice message'");
apply('poll preview', "`?? ${effectiveLastMsg.poll?.question || 'Poll'}`", "`\\u{1f4ca} ${effectiveLastMsg.poll?.question || 'Poll'}`");
apply('event preview', "`?? ${effectiveLastMsg.event?.title || 'Event'}`", "`\\u{1f4c5} ${effectiveLastMsg.event?.title || 'Event'}`");
apply('attachment preview', "'?? Attachment'", "'\\u{1f4ce} Attachment'");
apply('empty-state', '<span style={{ fontSize: 44, lineHeight: 1 }}>??</span>', "<span style={{ fontSize: 44, lineHeight: 1 }}>{'\\u{1f44b}'}</span>");
apply('pin-event', '<span style={{ fontSize: 14 }}>?</span>', "<span style={{ fontSize: 14 }}>{'\\u{1f4cc}'}</span>");
apply('header dot', '>? {S.label[status]}</span>', ">{'\\u{1f7e2}'} {S.label[status]}</span>");
apply('active-users dot', '>? Online</span>', ">{'\\u{1f7e2}'} Online</span>");
apply('member-card dot', '`? ${S.label[memberCardPresence!.onlineStatus]}`', '`\\u{1f7e2} ${S.label[memberCardPresence!.onlineStatus]}`');
fs.writeFileSync(path, src, 'utf8');
console.log(`\n${changes} replacement(s) applied.`);
console.log((src.match(/\?\?\?\?\?\?/g) || []).length ? 'WARNING: six-? runs remain' : 'No six-? runs remain.');
