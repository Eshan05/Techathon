"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Globe,
  IndianRupee,
  Landmark,
  Lock,
  MessageSquare,
  Scale,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

import heroSectionImage from "./herosection.png"

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
  signInLabel: string
  features: FeatureBlock[]
}

type HelpTrack = {
  title: string
  description: string
  icon: LucideIcon
  tone: string
}

const trustSignals = [
  {
    label: "Fraud checks",
    value: "Sale deeds, notices, hidden clauses",
    icon: AlertTriangle,
  },
  {
    label: "Scheme match",
    value: "PM-Kisan, Fasal Bima, KCC",
    icon: TrendingUp,
  },
  {
    label: "Evidence-safe vault",
    value: "Secure access with family support",
    icon: Lock,
  },
]

const helpTracks: HelpTrack[] = [
  {
    title: "Land Record Intelligence",
    description:
      "Scan khata, khasra and mutation history before any signature.",
    icon: Landmark,
    tone: "from-emerald-200/80 to-lime-100/60",
  },
  {
    title: "Legal Notice Drafts",
    description:
      "Generate dispute, payment default, and tenancy notices in plain language.",
    icon: Scale,
    tone: "from-amber-100/80 to-orange-100/70",
  },
  {
    title: "Voice + Regional Support",
    description:
      "Translate and read legal text aloud in Hindi, Marathi, and local-friendly style.",
    icon: Globe,
    tone: "from-teal-100/80 to-cyan-100/70",
  },
  {
    title: "Compensation & Claims",
    description:
      "Step-by-step filing for crop loss, insurance rejection, and relief payouts.",
    icon: IndianRupee,
    tone: "from-green-100/80 to-emerald-100/70",
  },
]

export function CreativeHomepage({
  brandName,
  headline,
  subheadline,
  ctaPrimary,
  ctaSecondary,
  signInLabel,
  features,
}: CreativeHomepageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f4ea] text-emerald-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute top-24 right-4 h-64 w-64 rounded-full bg-orange-300/25 blur-3xl" />
        <div className="absolute bottom-8 left-1/4 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(8,47,46,0.07)_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-8 sm:px-10 lg:gap-14 lg:px-14 lg:py-12">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.22em] text-emerald-700 uppercase">
              Farmer + Legal command center
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">
              <span className="text-emerald-900">{brandName}</span>{" "}
              <span
                style={{ fontFamily: "var(--font-devanagari), serif" }}
                className="text-orange-600"
              >
                वकील
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-semibold text-emerald-900 shadow-sm backdrop-blur-sm">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            Verified legal templates
          </div>
        </motion.header>

        <main className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.65 }}
            className="space-y-7"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/70 bg-emerald-100/60 px-4 py-1.5 text-xs font-bold tracking-[0.14em] text-emerald-900 uppercase">
              <Zap className="h-3.5 w-3.5" />
              Trust-first legal aid for fields
            </div>

            <h1 className="max-w-2xl text-5xl leading-[1.02] font-black tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block text-emerald-950">{headline}</span>
              <span className="block bg-gradient-to-r from-emerald-700 via-green-500 to-orange-500 bg-clip-text text-transparent">
                before every signature
              </span>
            </h1>

            <p className="max-w-2xl text-lg leading-relaxed text-emerald-900/80 sm:text-xl">
              {subheadline}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="rounded-full border border-emerald-900 bg-emerald-900 px-8 py-6 text-base font-semibold text-white transition-all hover:bg-white hover:text-emerald-900"
                asChild
              >
                <Link href="/sign-in">{signInLabel || ctaPrimary}</Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-emerald-300 bg-white/80 px-8 py-6 text-base font-semibold text-emerald-900 transition-all hover:border-emerald-700 hover:bg-emerald-50"
                asChild
              >
                <Link href="#how-we-help">{ctaSecondary || "How We Help"}</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trustSignals.map((signal, idx) => {
                const Icon = signal.icon

                return (
                  <motion.div
                    key={signal.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + idx * 0.08, duration: 0.4 }}
                    viewport={{ once: true }}
                    className="rounded-2xl border border-emerald-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm"
                  >
                    <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-bold text-emerald-950">
                      {signal.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-900/75">
                      {signal.value}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, scale: 0.98, x: 24 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-[2rem] border border-emerald-200/80 bg-gradient-to-b from-white/85 to-green-50/90 p-3 shadow-[0_30px_70px_-35px_rgba(6,78,59,0.45)] backdrop-blur-sm">
              <div className="absolute top-4 left-4 rounded-full bg-emerald-900/80 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-white uppercase">
                Evidence Ready
              </div>
              <Image
                src={heroSectionImage}
                alt="Farmer and legal support visual"
                className="h-[430px] w-full rounded-[1.5rem] object-cover object-center sm:h-[520px]"
                priority
              />

              <div className="absolute right-5 bottom-5 max-w-[220px] rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-xl backdrop-blur">
                <div className="mb-2 flex items-center gap-2 text-emerald-900">
                  <MessageSquare className="h-4 w-4" />
                  <p className="text-xs font-bold tracking-[0.11em] uppercase">
                    Voice legal summary
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-emerald-900/80">
                  "This clause transfers crop rights. Ask for revision before
                  signing."
                </p>
              </div>
            </div>
          </motion.section>
        </main>

        <section id="how-we-help" className="scroll-mt-24 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase">
              How we help
            </p>
            <h3 className="text-3xl font-black text-emerald-950 sm:text-4xl">
              Legal confidence built for Indian farmers
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {helpTracks.map((track, idx) => {
              const Icon = track.icon

              return (
                <motion.article
                  key={track.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.1, duration: 0.45 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="group relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-white/75 p-6 backdrop-blur-sm"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${track.tone} opacity-45 transition-opacity duration-300 group-hover:opacity-70`}
                  />
                  <div className="relative">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-900 text-white shadow-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h4 className="text-xl font-bold text-emerald-950">
                      {track.title}
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
                      {track.description}
                    </p>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-emerald-300/70 bg-emerald-900 p-7 text-white"
          >
            <h4 className="text-sm font-semibold tracking-[0.18em] text-emerald-200 uppercase">
              Field to court workflow
            </h4>
            <div className="mt-5 space-y-4">
              {[
                "Capture evidence, geo-tag photos, and scan papers instantly.",
                "Get legal risk flags in plain language before signing.",
                "Generate complaint or notice with ready-to-file format.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-lime-300" />
                  <p className="text-sm leading-relaxed text-emerald-100">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-emerald-200/80 bg-white/80 p-7 backdrop-blur-sm"
          >
            <h4 className="text-sm font-semibold tracking-[0.18em] text-emerald-700 uppercase">
              Ready templates
            </h4>
            <div className="mt-5 space-y-4">
              {(features.length ? features : []).slice(0, 3).map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl bg-emerald-50/80 p-4"
                >
                  <p className="font-bold text-emerald-950">{feature.title}</p>
                  <p className="mt-1 text-sm text-emerald-900/80">
                    {feature.body}
                  </p>
                </div>
              ))}

              {features.length === 0 && (
                <div className="rounded-2xl bg-emerald-50/80 p-4">
                  <p className="font-bold text-emerald-950">
                    Template library ready
                  </p>
                  <p className="mt-1 text-sm text-emerald-900/80">
                    Notices, affidavits, and complaint drafts are one tap away.
                  </p>
                </div>
              )}
            </div>
          </motion.article>
        </section>

        <footer className="grid gap-3 border-t border-emerald-200 pt-6 text-sm text-emerald-900/70 sm:flex sm:items-center sm:justify-between">
          <p>{ctaPrimary} with legal guardrails and farmer-first clarity.</p>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Family-assisted, secure, and multilingual.
          </div>
        </footer>
      </div>
    </div>
  )
}
