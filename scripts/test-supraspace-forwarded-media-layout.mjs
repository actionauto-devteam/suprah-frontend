import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/components/supraspace/ChatPopupManager.tsx', import.meta.url), 'utf8');
const fullSpaceSource = fs.readFileSync(new URL('../src/app/(chat)/supraspace/page.tsx', import.meta.url), 'utf8');
const layoutStart = source.indexOf("const hasCaptionedMedia = Boolean(msg.content?.trim())");
assert.ok(layoutStart >= 0, 'captioned media is identified separately from media-only messages');

const captionRender = source.indexOf(': msg.content ? renderContent(msg, isOwn, mentionAliases) : null', layoutStart);
const mediaRender = source.indexOf('{(imageAttachments.length > 0 || hasGif) && (', captionRender);
assert.ok(captionRender >= 0 && mediaRender > captionRender, 'Mini Suprah renders a caption before its image or GIF');
assert.ok(source.includes('{!hasStandaloneMedia && messageStatus}'), 'text-only messages retain their existing metadata placement');
assert.ok(source.indexOf('{hasStandaloneMedia && messageStatus}', mediaRender) > mediaRender, 'media messages keep metadata below the image or GIF');

assert.ok(source.includes("content: message.content || ''"), 'Mini Suprah forwarding preserves the source caption');
assert.ok(fullSpaceSource.includes("content: message.content || ''"), 'full SupraSpace forwarding preserves the source caption');
assert.equal(source.includes(') : gifOnly ? ('), false, 'a GIF caption is not replaced by its media preview');

console.log('SupraSpace forwarded-media layout regression checks passed.');
