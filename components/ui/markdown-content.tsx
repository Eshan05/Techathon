"use client"

import { marked } from "marked"
import type * as React from "react"
import { isValidElement, memo, useMemo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

const DEFAULT_PRE_BLOCK_CLASS =
  "my-3 overflow-x-auto rounded-xl border bg-zinc-950 p-4 font-mono text-xs text-zinc-50 dark:bg-zinc-900"

const extractTextContent = (node: React.ReactNode): string => {
  if (typeof node === "string") return node
  if (Array.isArray(node)) return node.map(extractTextContent).join("")
  if (isValidElement(node)) {
    // @ts-expect-error - children is not typed on unknown element
    return extractTextContent(node.props.children)
  }
  return ""
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  if (!markdown) return []
  const tokens = marked.lexer(markdown)
  return tokens.map((t) => t.raw)
}

const components: Partial<Components> = {
  h1: ({ children, ...props }) => (
    <h1 className="mt-2 scroll-m-20 text-2xl font-semibold" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mt-6 scroll-m-20 border-b pb-2 text-xl font-semibold first:mt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mt-4 scroll-m-20 text-base font-semibold" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="leading-6 break-words not-first:mt-3" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <span className="font-semibold" {...props}>
      {children}
    </span>
  ),
  a: ({ children, ...props }) => (
    <a
      className="font-medium break-words underline underline-offset-4"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ children, ...props }) => (
    <ul className="my-3 ml-5 list-disc" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-3 ml-5 list-decimal" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="mt-1 break-words" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="mt-3 border-l-2 pl-4 italic" {...props}>
      {children}
    </blockquote>
  ),
  hr: (props) => <hr className="my-4" {...props} />,
  table: ({ children, ...props }) => (
    <div className="my-4 w-full overflow-x-auto">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  tr: ({ children, ...props }) => (
    <tr className="m-0 border-b last:border-0" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th className="px-3 py-2 text-left font-semibold" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-3 py-2 text-left" {...props}>
      {children}
    </td>
  ),
  img: ({ alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="rounded-md" alt={alt} {...props} />
  ),
  code: ({ children, className, ...props }) => {
    const match = /language-(\w+)/.exec(className || "")

    if (match) {
      const text = extractTextContent(children)
      return (
        <pre className={cn(DEFAULT_PRE_BLOCK_CLASS, className)}>
          <code className="break-words whitespace-pre-wrap" {...props}>
            {text}
          </code>
        </pre>
      )
    }

    return (
      <code
        className={cn(
          "rounded bg-muted px-[0.3rem] py-[0.15rem] font-mono text-[0.9em] break-words",
          className
        )}
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => <>{children}</>,
}

const MemoizedMarkdownBlock = memo(
  ({ content, className }: { content: string; className?: string }) => {
    return (
      <div className={className}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    )
  },
  (prev, next) =>
    prev.content === next.content && prev.className === next.className
)

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock"

export const MarkdownContent = memo(
  ({ content, className }: { content: string; className?: string }) => {
    const blocks = useMemo(
      () => parseMarkdownIntoBlocks(content || ""),
      [content]
    )

    return blocks.map((block, idx) => (
      <MemoizedMarkdownBlock
        key={`md_block_${idx}`}
        content={block}
        className={className}
      />
    ))
  }
)

MarkdownContent.displayName = "MarkdownContent"
