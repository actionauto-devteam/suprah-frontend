export type SupraSpaceMarkdownLink = {
  start: number;
  end: number;
  label: string;
  href: string;
};

const AUTO_URL_RE = /https?:\/\/[^\s<]+/gi;

export function isSafeSupraSpaceLinkHref(value: string): boolean {
  const href = value.trim();
  try {
    const url = new URL(href);
    return (url.protocol === 'http:' || url.protocol === 'https:')
      ? Boolean(url.hostname)
      : url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

function normalizeLegacySupraSpaceMarkdownLinkLabel(label: string, href: string): string {
  const normalizedLabel = label.trim().toLowerCase();
  const normalizedHref = href.trim().toLowerCase();
  if (
    (normalizedLabel === 'http://' || normalizedLabel === 'https://')
    && normalizedHref.startsWith(normalizedLabel)
    && normalizedHref.length > normalizedLabel.length
  ) return href;
  return label;
}

export function findSupraSpaceMarkdownLink(
  value: string,
  from = 0,
): SupraSpaceMarkdownLink | null {
  for (let start = value.indexOf('[', from); start >= 0; start = value.indexOf('[', start + 1)) {
    const labelEnd = value.indexOf('](', start + 1);
    if (labelEnd < 0 || labelEnd === start + 1) continue;
    const label = value.slice(start + 1, labelEnd);
    if (label.includes('\n')) continue;

    let cursor = labelEnd + 2;
    let depth = 0;
    while (cursor < value.length) {
      const character = value[cursor];
      if (/\s/.test(character)) break;
      if (character === '(') depth += 1;
      if (character === ')') {
        if (depth === 0) break;
        depth -= 1;
      }
      cursor += 1;
    }

    if (cursor >= value.length || value[cursor] !== ')') continue;
    const href = value.slice(labelEnd + 2, cursor);
    if (!isSafeSupraSpaceLinkHref(href)) continue;
    return {
      start,
      end: cursor + 1,
      label: normalizeLegacySupraSpaceMarkdownLinkLabel(label, href),
      href,
    };
  }
  return null;
}

export function splitSupraSpaceTrailingUrlPunctuation(value: string): {
  href: string;
  trailing: string;
} {
  let href = value;
  let trailing = '';

  while (/[.,!?;:]$/.test(href)) {
    trailing = href.slice(-1) + trailing;
    href = href.slice(0, -1);
  }
  while (href.endsWith(')')) {
    const opens = (href.match(/\(/g) || []).length;
    const closes = (href.match(/\)/g) || []).length;
    if (closes <= opens) break;
    trailing = ')' + trailing;
    href = href.slice(0, -1);
  }

  return { href, trailing };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSimpleMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<u>$1</u>')
    .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
}

export function supraSpaceMarkdownToEditorInlineHtml(value: string): string {
  const links: string[] = [];
  let source = '';
  let cursor = 0;
  let link = findSupraSpaceMarkdownLink(value, cursor);

  while (link) {
    source += value.slice(cursor, link.start);
    const token = `@@SS4_LINK_${links.length}@@`;
    links.push(
      `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${formatSimpleMarkdown(link.label)}</a>`,
    );
    source += token;
    cursor = link.end;
    link = findSupraSpaceMarkdownLink(value, cursor);
  }
  source += value.slice(cursor);

  source = source.replace(AUTO_URL_RE, token => {
    const { href, trailing } = splitSupraSpaceTrailingUrlPunctuation(token);
    if (!isSafeSupraSpaceLinkHref(href)) return token;
    const placeholder = `@@SS4_LINK_${links.length}@@`;
    links.push(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(href)}</a>${escapeHtml(trailing)}`);
    return placeholder;
  });

  return formatSimpleMarkdown(source).replace(/@@SS4_LINK_(\d+)@@/g, (_token, index: string) => links[Number(index)] || '');
}

export function stripSupraSpaceMarkdownLinksToLabels(value: string): string {
  let result = '';
  let cursor = 0;
  let link = findSupraSpaceMarkdownLink(value, cursor);
  while (link) {
    result += value.slice(cursor, link.start) + link.label;
    cursor = link.end;
    link = findSupraSpaceMarkdownLink(value, cursor);
  }
  return result + value.slice(cursor);
}
