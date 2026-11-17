"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting like **bold**, *italic*, `code`, and [link](url)
 * into safe React nodes without using dangerouslySetInnerHTML.
 */
function renderInlineFormatting(text: string, keyPrefix: string): React.ReactNode {
  // Regex to match markdown links, bold, italic, code
  const inlineRegex =
    /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

  const parts = text.split(inlineRegex);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-part-${index}`;

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, linkText, linkUrl] = linkMatch;
      const isInternal = linkUrl.startsWith("/") || linkUrl.startsWith("#");
      if (isInternal) {
        return (
          <Link
            key={key}
            href={linkUrl}
            className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {linkText}
          </Link>
        );
      }
      return (
        <a
          key={key}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {linkText}
        </a>
      );
    }

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={key} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={key} className="italic text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline Code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={key}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Plain text
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const blocks = React.useMemo(() => {
    if (!content) return [];

    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const parsedBlocks: React.ReactNode[] = [];

    let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];

    const flushList = (blockIdx: number) => {
      if (!currentList) return;
      const { type, items } = currentList;
      if (type === "ul") {
        parsedBlocks.push(
          <ul
            key={`list-${blockIdx}`}
            className="my-4 list-disc space-y-2 pl-6 text-sm sm:text-base leading-relaxed text-muted-foreground"
          >
            {items.map((item, idx) => (
              <li key={`li-${blockIdx}-${idx}`}>
                {renderInlineFormatting(item, `li-${blockIdx}-${idx}`)}
              </li>
            ))}
          </ul>
        );
      } else {
        parsedBlocks.push(
          <ol
            key={`list-${blockIdx}`}
            className="my-4 list-decimal space-y-2 pl-6 text-sm sm:text-base leading-relaxed text-muted-foreground"
          >
            {items.map((item, idx) => (
              <li key={`oli-${blockIdx}-${idx}`}>
                {renderInlineFormatting(item, `oli-${blockIdx}-${idx}`)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    };

    lines.forEach((rawLine, index) => {
      const line = rawLine.trim();

      // Check code fence (```)
      if (line.startsWith("```")) {
        flushList(index);
        if (inCodeBlock) {
          parsedBlocks.push(
            <pre
              key={`code-${index}`}
              className="my-4 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs sm:text-sm text-slate-100 dark:bg-slate-950"
            >
              <code>{codeBlockLines.join("\n")}</code>
            </pre>
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockLines.push(rawLine);
        return;
      }

      // Check empty line
      if (!line) {
        flushList(index);
        return;
      }

      // Headings
      if (line.startsWith("# ")) {
        flushList(index);
        parsedBlocks.push(
          <h1
            key={`h1-${index}`}
            className="mt-8 mb-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl"
          >
            {renderInlineFormatting(line.slice(2).trim(), `h1-${index}`)}
          </h1>
        );
        return;
      }

      if (line.startsWith("## ")) {
        flushList(index);
        parsedBlocks.push(
          <h2
            key={`h2-${index}`}
            className="mt-8 mb-3 border-b border-border/60 pb-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            {renderInlineFormatting(line.slice(3).trim(), `h2-${index}`)}
          </h2>
        );
        return;
      }

      if (line.startsWith("### ")) {
        flushList(index);
        parsedBlocks.push(
          <h3
            key={`h3-${index}`}
            className="mt-6 mb-2 text-lg font-bold tracking-tight text-foreground sm:text-xl"
          >
            {renderInlineFormatting(line.slice(4).trim(), `h3-${index}`)}
          </h3>
        );
        return;
      }

      if (line.startsWith("#### ")) {
        flushList(index);
        parsedBlocks.push(
          <h4
            key={`h4-${index}`}
            className="mt-4 mb-2 text-base font-semibold text-foreground"
          >
            {renderInlineFormatting(line.slice(5).trim(), `h4-${index}`)}
          </h4>
        );
        return;
      }

      // Horizontal rule
      if (line === "---" || line === "***" || line === "___") {
        flushList(index);
        parsedBlocks.push(<hr key={`hr-${index}`} className="my-8 border-border/60" />);
        return;
      }

      // Blockquote
      if (line.startsWith("> ")) {
        flushList(index);
        parsedBlocks.push(
          <blockquote
            key={`quote-${index}`}
            className="my-4 border-l-4 border-[#003B95] pl-4 italic text-muted-foreground dark:border-blue-500"
          >
            {renderInlineFormatting(line.slice(2).trim(), `quote-${index}`)}
          </blockquote>
        );
        return;
      }

      // Unordered list item
      if (line.startsWith("- ") || line.startsWith("* ")) {
        if (!currentList || currentList.type !== "ul") {
          flushList(index);
          currentList = { type: "ul", items: [] };
        }
        currentList.items.push(line.slice(2).trim());
        return;
      }

      // Ordered list item (e.g. "1. ")
      const olMatch = line.match(/^\d+\.\s+(.*)$/);
      if (olMatch) {
        if (!currentList || currentList.type !== "ol") {
          flushList(index);
          currentList = { type: "ol", items: [] };
        }
        currentList.items.push(olMatch[1].trim());
        return;
      }

      // Standard paragraph
      flushList(index);
      parsedBlocks.push(
        <p
          key={`p-${index}`}
          className="my-3 text-sm sm:text-base leading-relaxed text-muted-foreground"
        >
          {renderInlineFormatting(line, `p-${index}`)}
        </p>
      );
    });

    flushList(lines.length);

    return parsedBlocks;
  }, [content]);

  return <div className={cn("space-y-1", className)}>{blocks}</div>;
}

