import React from 'react';

// Minimal, safe markdown renderer for AI replies. It builds React elements
// directly (never innerHTML), so model output cannot inject markup.
// Supports headings, bullet and numbered lists, paragraphs with line breaks,
// **bold**, *italic* / _italic_, `inline code` and pipe tables.

// Underscore emphasis must sit on word boundaries so ids like draft_payout_batch stay intact.
const INLINE_PATTERN = /(`[^`\n]+`|\*\*[^*\n]+\*\*|(?<!\w)__[^_\n]+__(?!\w)|\*[^*\s][^*\n]*\*|(?<!\w)_[^_\s][^_\n]*_(?!\w))/g;

function renderInline(text, keyPrefix) {
  const parts = text.split(INLINE_PATTERN);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={key} className="font-mono text-xs bg-slate-800 border border-slate-600 rounded px-1 py-0.5">
          {part.slice(1, -1)}
        </code>
      );
    }
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      if (part.length > 4) return <strong key={key} className="font-semibold text-white">{renderInline(part.slice(2, -2), key)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      if (part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function renderLines(lines, keyPrefix) {
  return lines.map((line, i) => (
    <React.Fragment key={`${keyPrefix}-${i}`}>
      {i > 0 && <br />}
      {renderInline(line, `${keyPrefix}-${i}`)}
    </React.Fragment>
  ));
}

const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

// A table starts with a pipe row followed by a |---|---| separator row.
function isTableStart(lines, i) {
  return TABLE_ROW.test(lines[i]) && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1]);
}

export function Markdown({ text, className = '' }) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ type: 'heading', text: heading[1] });
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      const header = splitRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const listType = BULLET.test(line) ? 'ul' : NUMBERED.test(line) ? 'ol' : null;
    if (listType) {
      const pattern = listType === 'ul' ? BULLET : NUMBERED;
      const items = [];
      while (i < lines.length && pattern.test(lines[i])) {
        items.push(lines[i].match(pattern)[1]);
        i += 1;
      }
      blocks.push({ type: listType, items });
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !NUMBERED.test(lines[i]) &&
      !isTableStart(lines, i)
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'p', lines: paragraph });
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((block, b) => {
        const key = `b${b}`;
        if (block.type === 'heading') {
          return <p key={key} className="font-semibold text-white">{renderInline(block.text, key)}</p>;
        }
        if (block.type === 'table') {
          return (
            <div key={key} className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-600 rounded">
                <thead className="bg-slate-800">
                  <tr>
                    {block.header.map((cell, c) => (
                      <th key={`${key}-h${c}`} className="text-left font-semibold text-white px-3 py-2 border-b border-slate-600">
                        {renderInline(cell, `${key}-h${c}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={`${key}-r${r}`} className="border-t border-slate-600 even:bg-slate-800/50">
                      {block.header.map((_, c) => (
                        <td key={`${key}-r${r}-${c}`} className="px-3 py-1.5 align-top">
                          {renderInline(row[c] ?? '', `${key}-r${r}-${c}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === 'ul' || block.type === 'ol') {
          const ListTag = block.type;
          return (
            <ListTag key={key} className={`${block.type === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 space-y-1`}>
              {block.items.map((item, n) => <li key={`${key}-${n}`}>{renderInline(item, `${key}-${n}`)}</li>)}
            </ListTag>
          );
        }
        return <p key={key}>{renderLines(block.lines, key)}</p>;
      })}
    </div>
  );
}
