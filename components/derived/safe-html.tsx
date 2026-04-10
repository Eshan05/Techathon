"use client"

import * as React from "react"
import DOMPurify from "dompurify"

import { cn } from "@/lib/utils"

type SafeHtmlProps = {
  html: string
  className?: string
}

const ALLOWED_TAGS = [
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "span",
  "div",
]

const ALLOWED_ATTR = ["colspan", "rowspan", "scope"]

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitized = React.useMemo(() => {
    if (!html) return ""

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "link"],
      FORBID_ATTR: [
        "style",
        "onerror",
        "onload",
        "onclick",
        "onmouseover",
        "onfocus",
      ],
      KEEP_CONTENT: true,
    })
  }, [html])

  if (!sanitized) return null

  return (
    <div
      className={cn("kv-html overflow-x-auto whitespace-pre-wrap", className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
