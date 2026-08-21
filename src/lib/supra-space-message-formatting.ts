const DOUBLE_BRACE_CONTROL_TAG = /\{\{\s*(\/?)\s*(color|font|size)(?:\s*:\s*([^{}\n]+?))?\s*\}\}/gi;
const SINGLE_BRACE_CONTROL_TAG = /\{\s*(?:color|font|size)\s*:\s*[^{}\n]+\s*\}|\{\s*\/\s*(?:color|font|size)\s*\}/gi;
const STYLE_CONTROL_TAG = /\{\s*(\/?)\s*(color|font|size)(?:\s*:\s*([^{}\n]+?))?\s*\}/gi;
const EMPTY_CONTROL_WRAPPER = /\{\s*(color|font|size)\s*:\s*([^{}\n]+?)\s*\}([\s*_~`]*)\{\s*\/\s*\1\s*\}/gi;
const FORMAT_ONLY_LINE = /(^|\n)[ \t]*(?:\*{2,}|_{2,}|~{2,})[ \t]*(?=\n|$)/g;

const BOLD_MARKER = '**';

/**
 * Repairs the specific legacy bold-marker shape produced by older rich-editor
 * conversions where one side of a whole-line bold run was lost, e.g.:
 *   Heading**
 *   **Heading
 * and the same shapes wrapped in {font}/{size}/{color} controls.
 *
 * We only repair lines containing exactly ONE ** marker. Lines with multiple
 * markers may contain valid inline bold spans, so they are left to the normal
 * markdown renderer instead of being guessed at here.
 */
function repairSingleSidedBoldMarkerLine(line: string): string {
  const visible = line.replace(SINGLE_BRACE_CONTROL_TAG, '').trim();
  if (!visible) return line;

  const markerCount = (visible.match(/\*\*/g) || []).length;
  if (markerCount === 0 || markerCount % 2 === 0) return line;

  const startsWithMarker = visible.startsWith(BOLD_MARKER);
  const endsWithMarker = visible.endsWith(BOLD_MARKER);

  // A single marker on the line is the old whole-line-bold corruption. Repair
  // the missing side so headings such as "**Current Progress" still render
  // the way the editor shows them.
  if (markerCount === 1) {
    if (startsWithMarker && !endsWithMarker) {
      return line.replace(
        /((?:[ \t]*\{\s*\/\s*(?:color|font|size)\s*\})*[ \t]*)$/i,
        `${BOLD_MARKER}$1`,
      );
    }

    if (endsWithMarker && !startsWithMarker) {
      return line.replace(
        /^(\s*(?:\{\s*(?:color|font|size)\s*:\s*[^{}\n]+\s*\}\s*)*)/i,
        `$1${BOLD_MARKER}`,
      );
    }
    return line;
  }

  // If an odd line already contains one or more valid **...** spans, a lone
  // boundary marker is not a missing whole-line pair — it is the redundant
  // control that older paste/serialization paths leaked next to real bold
  // content. Pairing it with the first legitimate marker corrupts the rest of
  // the line and makes another ** appear later. Remove only that unmatched
  // boundary marker and keep the legitimate inline bold pairs untouched.
  if (startsWithMarker && !endsWithMarker) {
    return line.replace(
      /^(\s*(?:\{\s*(?:color|font|size)\s*:\s*[^{}\n]+\s*\}\s*)*)\*\*/,
      '$1',
    );
  }

  if (endsWithMarker && !startsWithMarker) {
    return line.replace(
      /\*\*((?:[ \t]*\{\s*\/\s*(?:color|font|size)\s*\})*[ \t]*)$/i,
      '$1',
    );
  }

  return line;
}

function repairSingleSidedBoldMarkers(content: string): string {
  return content
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(repairSingleSidedBoldMarkerLine)
    .join('\n');
}

function canonicalizeDoubleBraceControlTag(
  _match: string,
  closingSlash: string,
  rawKind: string,
  rawValue?: string,
): string {
  const kind = rawKind.toLowerCase();
  if (closingSlash) return `{/${kind}}`;

  const value = (rawValue || '').trim();
  if (!value) return '';

  if (kind === 'color') {
    return /^#[0-9a-f]{3,8}$/i.test(value)
      ? `{color:${value.toLowerCase()}}`
      : '';
  }

  if (kind === 'font') {
    return /^[a-z-]+$/i.test(value)
      ? `{font:${value.toLowerCase()}}`
      : '';
  }

  if (kind === 'size') {
    return /^\d{1,3}$/.test(value)
      ? `{size:${Number.parseInt(value, 10)}}`
      : '';
  }

  return '';
}

/**
 * Makes legacy/malformed Supra Space markup safe for the existing renderer.
 * Canonical, valid single-brace markup is intentionally left unchanged.
 */
export function normalizeSupraSpaceLegacyMarkup(content: string): string {
  if (!content) return '';

  let normalized = content
    .replace(DOUBLE_BRACE_CONTROL_TAG, canonicalizeDoubleBraceControlTag);

  // Remove wrappers that contain formatting controls only. Repeat so nested
  // empty wrappers collapse from the inside out.
  let previous = '';
  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized.replace(EMPTY_CONTROL_WRAPPER, '');
  }

  // Older serializers could concatenate a bold/styled section heading and the
  // first semantic list item without a newline, e.g.
  //   **Current Progress**• **Continued...**
  // Split only when the list marker immediately follows a formatting closer,
  // which avoids treating an ordinary bullet character inside prose as a block.
  normalized = normalized
    .replace(
      /(\*\*|__|~~|\{\s*\/\s*(?:color|font|size)\s*\})([ \t]*)([•◦▪])(?=\s+)/gi,
      '$1\n$3',
    )
    .replace(
      /(\*\*|__|~~|\{\s*\/\s*(?:color|font|size)\s*\})([ \t]*)(\d+\.)(?=\s+)/gi,
      '$1\n$3',
    );

  normalized = normalized.replace(FORMAT_ONLY_LINE, '$1');
  return repairSingleSidedBoldMarkers(normalized);
}

/**
 * Makes multiline style wrappers compatible with the existing line-oriented
 * message renderers. For example:
 *
 *   {size:12}first\nsecond{/size}
 *
 * becomes two self-contained styled lines, so the renderer never exposes an
 * opener/closer merely because the wrapper crossed a line boundary.
 */
export function prepareSupraSpaceMarkupForDisplay(content: string): string {
  const compatible = normalizeSupraSpaceLegacyMarkup(content);
  if (!compatible || !compatible.includes('\n')) return compatible;

  const active: Array<{ kind: string; openTag: string }> = [];
  let output = '';
  let cursor = 0;
  STYLE_CONTROL_TAG.lastIndex = 0;

  const appendTextWithLocalizedNewlines = (value: string) => {
    const pieces = value.split('\n');
    pieces.forEach((piece, index) => {
      output += piece;
      if (index >= pieces.length - 1) return;

      if (active.length > 0) {
        for (let i = active.length - 1; i >= 0; i -= 1) {
          output += `{/${active[i].kind}}`;
        }
      }
      output += '\n';
      if (active.length > 0) {
        active.forEach(tag => { output += tag.openTag; });
      }
    });
  };

  let match: RegExpExecArray | null;
  while ((match = STYLE_CONTROL_TAG.exec(compatible)) !== null) {
    appendTextWithLocalizedNewlines(compatible.slice(cursor, match.index));

    const fullTag = match[0];
    const closing = Boolean(match[1]);
    const kind = match[2].toLowerCase();
    const rawValue = (match[3] || '').trim();
    output += fullTag;

    if (closing) {
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (active[i].kind === kind) {
          active.splice(i, 1);
          break;
        }
      }
    } else if (rawValue) {
      active.push({ kind, openTag: fullTag });
    }

    cursor = match.index + fullTag.length;
  }

  appendTextWithLocalizedNewlines(compatible.slice(cursor));

  let localized = output;
  let previous = '';
  while (previous !== localized) {
    previous = localized;
    localized = localized.replace(EMPTY_CONTROL_WRAPPER, '');
  }
  return localized.replace(FORMAT_ONLY_LINE, '$1');
}


/**
 * Removes only formatting-control markers that reach a renderer as plain text.
 *
 * Valid paired markers are consumed by the normal rich-text parser first, so
 * anything that reaches this fallback path is an unmatched/redundant control
 * artifact (for example the extra ** wrappers produced by some copied rich
 * text). Keeping this at the final plain-text boundary preserves recognized
 * bold/underline/strike formatting while ensuring the internal syntax is never
 * exposed to end users.
 */
export function stripResidualSupraSpaceInlineControlMarkers(value: string): string {
  if (!value) return '';
  return value
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/~~/g, '');
}

/**
 * Converts rich message content to plain text for surfaces that cannot render
 * the chat dialect (dropdown previews, browser notifications, etc.).
 */
export function stripSupraSpaceFormattingForPreview(
  content?: string | null,
): string {
  if (!content) return '';

  return normalizeSupraSpaceLegacyMarkup(content)
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(SINGLE_BRACE_CONTROL_TAG, '')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/~~([^~\n]+)~~/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/(^|[^\w*])_([^_\n]+)_(?!\w)/g, '$1$2')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    // Preview surfaces cannot render markdown. Any residual doubled markers
    // are malformed/unpaired controls and must never be shown literally.
    .replace(/\*{2,}/g, '')
    .replace(FORMAT_ONLY_LINE, '$1')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}