import * as React from "react";

const URL_PATTERN = /https?:\/\/[^\s<]+[^\s<.,;:!?'")\]]/gi;

export function linkifyText(text: string, keyPrefix = "lk"): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  const re = new RegExp(URL_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const url = match[0];
    nodes.push(
      <a
        key={`${keyPrefix}-${i++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
      >
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
