"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  FileBadge2,
  Landmark,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  Waves,
} from "lucide-react"

import { SignInButton } from "@/components/features/auth/sign-in-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Orb } from "@/components/ui/orb"
import { Link } from "@/i18n/navigation"

type FeatureBlock = {
  title: string
  body: string
  details: string[]
}

type CreativeHomepageProps = {
  brandName: string
  headline: string
  subheadline: string
  ctaPrimary: string
  ctaSecondary: string
  features: FeatureBlock[]
}

export function CreativeHomepage({
  brandName,
  headline,
  subheadline,
  ctaPrimary,
  ctaSecondary,
  features,
}: CreativeHomepageProps) {
  const [activeFeature, setActiveFeature] = useState(0)

  const navItems = useMemo(
    () => [
      { label: "Products", href: "#products" },
      { label: "Workflow", href: "#workflow" },
      { label: "Trust", href: "#trust" },
    ],
    []
  )

  const icons = [Landmark, ScanSearch, FileBadge2]
  const safeIndex = Math.min(activeFeature, Math.max(features.length - 1, 0))

  return (
    <div className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:px-8 sm:py-6">
      <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(circle_at_14%_12%,oklch(0.92_0.03_65/.58),transparent_35%),radial-gradient(circle_at_88%_8%,oklch(0.9_0.03_90/.45),transparent_30%)]" />

      <motion.nav
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="sticky top-3 z-30 rounded-2xl border border-border/70 bg-background/85 px-3 py-2 backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/40">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm leading-none font-semibold">
                {brandName}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Company-grade legal companion
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-5 md:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="relative text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <SignInButton />
            <Button asChild size="sm" className="rounded-lg">
              <Link href="/sign-up">{ctaSecondary}</Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      <section className="paper-shadow relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 p-5 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="relative grid gap-7 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
            className="grid gap-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full">
                New design system
              </Badge>
              <Badge variant="outline" className="rounded-full">
                <Sparkles className="me-1 h-3.5 w-3.5" />
                Animated experience
              </Badge>
            </div>

            <header className="grid gap-3">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl sm:leading-[1]">
                {headline}
              </h1>
              <p className="max-w-3xl text-base text-muted-foreground sm:text-xl sm:leading-tight">
                {subheadline}
              </p>
            </header>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button asChild className="rounded-xl">
                <Link href="/dashboard">
                  {ctaPrimary}
                  <ArrowRight className="ms-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/dashboard/document-guidelines">
                  Explore legal playbook
                </Link>
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                "Voice-first helper",
                "Offline resilient flow",
                "Fraud red-flag checks",
              ].map((label) => (
                <div
                  key={label}
                  className="rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-xs text-muted-foreground sm:text-sm"
                >
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.14, ease: "easeOut" }}
            className="relative h-[320px] overflow-hidden rounded-2xl border border-border/70 bg-background/85"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30" />
            <Orb className="h-full w-full" seed={18} agentState="thinking" />
            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-border/70 bg-card/85 p-3 backdrop-blur">
              <div className="mb-1 text-xs text-muted-foreground uppercase">
                Trust engine
              </div>
              <div className="text-sm">
                Live context, legal templates, and document safety checks in one
                adaptive system.
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section
        id="products"
        className="grid gap-4 lg:grid-cols-[0.56fr_0.44fr]"
      >
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="grid gap-3"
        >
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Solutions
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Hover to inspect detailed capabilities
            </h2>
          </div>

          {features.map((item, index) => {
            const Icon = icons[index] ?? Landmark
            const isActive = index === safeIndex

            return (
              <motion.article
                key={item.title}
                onHoverStart={() => setActiveFeature(index)}
                onFocus={() => setActiveFeature(index)}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                  isActive
                    ? "border-foreground/30 bg-card"
                    : "border-border/70 bg-card/70"
                }`}
              >
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/80">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.body}
                </p>
              </motion.article>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ y: 16, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
          className="rounded-2xl border border-border/70 bg-card/75 p-4 sm:p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <Waves className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Detailed view
            </p>
          </div>

          <AnimatePresence mode="wait">
            {features[safeIndex] ? (
              <motion.div
                key={features[safeIndex].title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="grid gap-3"
              >
                <div>
                  <h3 className="text-xl font-semibold">
                    {features[safeIndex].title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {features[safeIndex].body}
                  </p>
                </div>

                <div className="grid gap-2">
                  {features[safeIndex].details.map((detail) => (
                    <div
                      key={detail}
                      className="inline-flex items-start gap-2 rounded-lg border border-border/60 bg-background/80 px-2.5 py-2 text-sm"
                    >
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="mt-1 w-full rounded-xl"
                >
                  <Link href="/dashboard/document-guidelines">
                    View process details
                    <ArrowRight className="ms-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </section>

      <section
        id="workflow"
        className="grid gap-3 rounded-2xl border border-border/70 bg-card/75 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold sm:text-2xl">How it works</h2>
          <Badge variant="outline" className="rounded-full">
            <BadgeCheck className="me-1 h-3.5 w-3.5" />
            Verified workflow
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "1. Verify",
              body: "Confirm owner and survey details before any document action.",
            },
            {
              title: "2. Evaluate",
              body: "Check schemes, legal templates, and required document sets.",
            },
            {
              title: "3. Secure",
              body: "Store signed copies and evidence in one structured vault.",
            },
          ].map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{
                duration: 0.35,
                delay: index * 0.08,
                ease: "easeOut",
              }}
              className="rounded-xl border border-border/60 bg-background/75 p-3"
            >
              <div className="mb-1 text-sm font-semibold">{step.title}</div>
              <div className="text-sm text-muted-foreground">{step.body}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section
        id="trust"
        className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/75 p-4 sm:p-5"
      >
        <div className="pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full border border-border/70" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1.5">
            <h2 className="text-xl font-semibold sm:text-2xl">
              Built for trusted decisions
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Designed as a product-grade homepage with interactive details and
              smooth motion.
            </p>
          </div>

          <Button asChild className="w-full rounded-xl sm:w-auto">
            <Link href="/sign-up">
              {ctaSecondary}
              <ArrowRight className="ms-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
