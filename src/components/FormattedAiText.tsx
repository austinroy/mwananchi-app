import type React from "react";

export function FormattedAiText({ content }: { content: string }) {
  const blocks = parseAiTextBlocks(content);

  return (
    <div className="ai-response">
      {blocks.map((block, index) => {
        if (block.type === "heading")
          return <h3 key={index}>{formatInlineMarkdown(block.content)}</h3>;
        if (block.type === "code")
          return (
            <pre key={index}>
              <code>{block.content}</code>
            </pre>
          );
        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag key={index}>
              {block.items.map((item) => (
                <li key={item}>{formatInlineMarkdown(item)}</li>
              ))}
            </ListTag>
          );
        }
        return <p key={index}>{formatInlineMarkdown(block.content)}</p>;
      })}
    </div>
  );
}

function formatInlineMarkdown(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content))) {
    if (match.index > cursor) nodes.push(content.slice(cursor, match.index));

    const [raw, , linkLabel, linkUrl, code, boldA, boldB, italicA, italicB] =
      match;
    const key = `${match.index}-${raw}`;
    if (linkLabel && linkUrl) {
      nodes.push(
        <a key={key} href={linkUrl} target="_blank" rel="noreferrer">
          {linkLabel}
        </a>,
      );
    } else if (code) {
      nodes.push(<code key={key}>{code}</code>);
    } else if (boldA || boldB) {
      nodes.push(<strong key={key}>{boldA || boldB}</strong>);
    } else if (italicA || italicB) {
      nodes.push(<em key={key}>{italicA || italicB}</em>);
    }

    cursor = match.index + raw.length;
  }

  if (cursor < content.length) nodes.push(content.slice(cursor));
  return nodes;
}

function parseAiTextBlocks(content: string): AiTextBlock[] {
  const blocks: AiTextBlock[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let codeLines: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", content: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({ type: "list", ordered: listOrdered, items: listItems });
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", content: codeLines.join("\n") });
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (bulletMatch || orderedMatch) {
      flushParagraph();
      const ordered = Boolean(orderedMatch);
      if (listItems.length && listOrdered !== ordered) flushList();
      listOrdered = ordered;
      listItems.push((bulletMatch?.[1] ?? orderedMatch?.[1] ?? "").trim());
      return;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        content: trimmed.replace(/^#{1,3}\s+/, ""),
      });
      return;
    }

    paragraph.push(trimmed);
  });

  if (inCode) blocks.push({ type: "code", content: codeLines.join("\n") });
  flushParagraph();
  flushList();

  return blocks.length ? blocks : [{ type: "paragraph", content }];
}

type AiTextBlock =
  | { type: "paragraph"; content: string }
  | { type: "heading"; content: string }
  | { type: "code"; content: string }
  | { type: "list"; ordered: boolean; items: string[] };
