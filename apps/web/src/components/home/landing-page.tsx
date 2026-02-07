"use client";

import { useI18n, Badge, Button } from "@ctxport/shared-ui";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Code,
  Copy,
  Download,
  Eye,
  EyeOff,
  Globe,
  Keyboard,
  List,
  Lock,
  MessageSquare,
  MousePointerClick,
  Shield,
  ShieldCheck,
  Star,
  WifiOff,
  X,
} from "lucide-react";

const GITHUB_REPO = "https://github.com/nicepkg/ctxport";
const GITHUB_RELEASES = "https://github.com/nicepkg/ctxport/releases";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Platform icons (simple text-based for now) ───
const PLATFORMS = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "DeepSeek",
  "Grok",
  "GitHub",
] as const;

// ─── Section wrapper ───
function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={stagger}
      className={`px-4 py-20 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="mx-auto max-w-5xl">{children}</div>
    </motion.section>
  );
}

function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.h2
      variants={fadeUp}
      className={`text-3xl font-bold tracking-tight sm:text-4xl ${className}`}
    >
      {children}
    </motion.h2>
  );
}

// ─── Hero ───
function HeroSection() {
  const { t } = useI18n();
  return (
    <Section className="pt-24 pb-16 text-center sm:pt-32">
      <motion.h1
        variants={fadeUp}
        className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
      >
        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("web.home.hero.title")}
        </span>
      </motion.h1>
      <motion.p
        variants={fadeUp}
        className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
      >
        {t("web.home.hero.subtitle")}
      </motion.p>
      <motion.div
        variants={fadeUp}
        className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <Button size="lg" asChild>
          <a href={GITHUB_RELEASES} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            {t("web.home.hero.install")}
          </a>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
            <Star className="mr-2 h-4 w-4" />
            {t("web.home.hero.star")}
          </a>
        </Button>
      </motion.div>
      <motion.div variants={fadeUp} className="mt-10">
        <p className="mb-3 text-sm text-muted-foreground">
          {t("web.home.hero.platforms")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {PLATFORMS.map((p) => (
            <Badge key={p} variant="secondary">
              {p}
            </Badge>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

// ─── Problem ───
function ProblemSection() {
  const { t } = useI18n();
  const problems = [
    {
      icon: <Copy className="h-6 w-6 text-destructive" />,
      title: t("web.home.problem.ctrlC.title"),
      desc: t("web.home.problem.ctrlC.desc"),
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-destructive" />,
      title: t("web.home.problem.manual.title"),
      desc: t("web.home.problem.manual.desc"),
    },
    {
      icon: <Eye className="h-6 w-6 text-destructive" />,
      title: t("web.home.problem.screenshot.title"),
      desc: t("web.home.problem.screenshot.desc"),
    },
  ];

  return (
    <Section className="bg-muted/40">
      <SectionTitle className="text-center">
        {t("web.home.problem.title")}
      </SectionTitle>
      <motion.p
        variants={fadeUp}
        className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground"
      >
        {t("web.home.problem.scenario")}
      </motion.p>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {problems.map((p) => (
          <motion.div
            key={p.title}
            variants={fadeUp}
            className="rounded-xl border border-destructive/20 bg-card p-6 text-center"
          >
            <div className="mb-4 flex justify-center">{p.icon}</div>
            <h3 className="text-lg font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ─── Comparison ───
function CompareSection() {
  const { t } = useI18n();
  const rows = [
    {
      without: t("web.home.compare.copy.without"),
      with: t("web.home.compare.copy.with"),
    },
    {
      without: t("web.home.compare.migrate.without"),
      with: t("web.home.compare.migrate.with"),
    },
    {
      without: t("web.home.compare.save.without"),
      with: t("web.home.compare.save.with"),
    },
    {
      without: t("web.home.compare.share.without"),
      with: t("web.home.compare.share.with"),
    },
    {
      without: t("web.home.compare.code.without"),
      with: t("web.home.compare.code.with"),
    },
  ];

  return (
    <Section>
      <SectionTitle className="text-center">
        {t("web.home.compare.title")}
      </SectionTitle>
      <motion.div
        variants={fadeUp}
        className="mt-12 overflow-x-auto rounded-xl border"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-4 text-left font-semibold text-destructive">
                <X className="mr-2 inline h-4 w-4" />
                {t("web.home.compare.without")}
              </th>
              <th className="px-6 py-4 text-left font-semibold text-primary">
                <Check className="mr-2 inline h-4 w-4" />
                {t("web.home.compare.with")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-6 py-4 text-muted-foreground">
                  {row.without}
                </td>
                <td className="px-6 py-4 font-medium">{row.with}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </Section>
  );
}

// ─── Trust ───
function TrustSection() {
  const { t } = useI18n();
  const items = [
    {
      icon: <ShieldCheck className="h-8 w-8" />,
      title: t("web.home.trust.noAccount.title"),
      desc: t("web.home.trust.noAccount.desc"),
    },
    {
      icon: <WifiOff className="h-8 w-8" />,
      title: t("web.home.trust.offline.title"),
      desc: t("web.home.trust.offline.desc"),
    },
    {
      icon: <EyeOff className="h-8 w-8" />,
      title: t("web.home.trust.zeroUpload.title"),
      desc: t("web.home.trust.zeroUpload.desc"),
    },
    {
      icon: <Lock className="h-8 w-8" />,
      title: t("web.home.trust.local.title"),
      desc: t("web.home.trust.local.desc"),
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: t("web.home.trust.permissions.title"),
      desc: t("web.home.trust.permissions.desc"),
    },
    {
      icon: <Code className="h-8 w-8" />,
      title: t("web.home.trust.openSource.title"),
      desc: t("web.home.trust.openSource.desc"),
    },
  ];

  return (
    <Section className="bg-muted/40">
      <SectionTitle className="text-center">
        {t("web.home.trust.title")}
      </SectionTitle>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <motion.div
            key={item.title}
            variants={fadeUp}
            className="rounded-xl border bg-card p-6 text-center"
          >
            <div className="mb-4 flex justify-center text-primary">
              {item.icon}
            </div>
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ─── How It Works ───
function HowSection() {
  const { t } = useI18n();
  const steps = [
    {
      icon: <Globe className="h-10 w-10" />,
      title: t("web.home.how.step1.title"),
      desc: t("web.home.how.step1.desc"),
    },
    {
      icon: <MousePointerClick className="h-10 w-10" />,
      title: t("web.home.how.step2.title"),
      desc: t("web.home.how.step2.desc"),
    },
    {
      icon: <ClipboardCopy className="h-10 w-10" />,
      title: t("web.home.how.step3.title"),
      desc: t("web.home.how.step3.desc"),
    },
  ];

  return (
    <Section>
      <SectionTitle className="text-center">
        {t("web.home.how.title")}
      </SectionTitle>
      <motion.p
        variants={fadeUp}
        className="mx-auto mt-4 max-w-md text-center text-muted-foreground"
      >
        {t("web.home.how.subtitle")}
      </motion.p>
      <div className="mt-12 grid gap-8 sm:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            variants={fadeUp}
            className="relative text-center"
          >
            <div className="mb-4 flex justify-center text-primary">
              {step.icon}
            </div>
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </div>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
            {i < steps.length - 1 && (
              <ArrowRight className="absolute -right-4 top-6 hidden h-6 w-6 text-muted-foreground/40 sm:block" />
            )}
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ─── Features ───
function FeaturesSection() {
  const { t } = useI18n();
  const features = [
    {
      icon: <Copy className="h-8 w-8" />,
      title: t("web.home.features.inChat.title"),
      desc: t("web.home.features.inChat.desc"),
      badge: null,
    },
    {
      icon: <List className="h-8 w-8" />,
      title: t("web.home.features.sidebar.title"),
      desc: t("web.home.features.sidebar.desc"),
      badge: t("web.home.features.sidebar.badge"),
    },
    {
      icon: <Keyboard className="h-8 w-8" />,
      title: t("web.home.features.keyboard.title"),
      desc: t("web.home.features.keyboard.desc"),
      badge: null,
    },
    {
      icon: <Code className="h-8 w-8" />,
      title: t("web.home.features.format.title"),
      desc: t("web.home.features.format.desc"),
      badge: null,
    },
  ];

  return (
    <Section className="bg-muted/40">
      <SectionTitle className="text-center">
        {t("web.home.features.title")}
      </SectionTitle>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {features.map((f) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            className="rounded-xl border bg-card p-6"
          >
            <div className="mb-4 flex items-center gap-3 text-primary">
              {f.icon}
              <h3 className="text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              {f.badge && <Badge variant="default">{f.badge}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ─── Context Bundle ───
const BUNDLE_EXAMPLE = `---
title: "Building a REST API"
source: chatgpt
url: https://chatgpt.com/c/abc123
timestamp: 2026-02-07T10:30:00Z
message_count: 12
---

## User

How do I build a REST API with Node.js?

## Assistant

Here's a minimal Express.js setup:

\`\`\`javascript
import express from 'express';
const app = express();

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(3000);
\`\`\``;

function BundleSection() {
  const { t } = useI18n();
  return (
    <Section>
      <SectionTitle className="text-center">
        {t("web.home.bundle.title")}
      </SectionTitle>
      <motion.p
        variants={fadeUp}
        className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground"
      >
        {t("web.home.bundle.desc")}
      </motion.p>
      <motion.div variants={fadeUp} className="mt-10">
        <pre className="overflow-x-auto rounded-xl border bg-card p-6 text-sm leading-relaxed">
          <code>{BUNDLE_EXAMPLE}</code>
        </pre>
      </motion.div>
    </Section>
  );
}

// ─── Copy Formats ───
function FormatsSection() {
  const { t } = useI18n();
  const formats = [
    {
      name: t("web.home.formats.full.name"),
      includes: t("web.home.formats.full.includes"),
      useCase: t("web.home.formats.full.useCase"),
    },
    {
      name: t("web.home.formats.userOnly.name"),
      includes: t("web.home.formats.userOnly.includes"),
      useCase: t("web.home.formats.userOnly.useCase"),
    },
    {
      name: t("web.home.formats.codeOnly.name"),
      includes: t("web.home.formats.codeOnly.includes"),
      useCase: t("web.home.formats.codeOnly.useCase"),
    },
    {
      name: t("web.home.formats.compact.name"),
      includes: t("web.home.formats.compact.includes"),
      useCase: t("web.home.formats.compact.useCase"),
    },
  ];

  return (
    <Section className="bg-muted/40">
      <SectionTitle className="text-center">
        {t("web.home.formats.title")}
      </SectionTitle>
      <motion.p
        variants={fadeUp}
        className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground"
      >
        {t("web.home.formats.desc")}
      </motion.p>
      <motion.div
        variants={fadeUp}
        className="mt-10 overflow-x-auto rounded-xl border"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-4 text-left font-semibold">
                {t("web.home.formats.format")}
              </th>
              <th className="px-6 py-4 text-left font-semibold">
                {t("web.home.formats.includes")}
              </th>
              <th className="px-6 py-4 text-left font-semibold">
                {t("web.home.formats.useCase")}
              </th>
            </tr>
          </thead>
          <tbody>
            {formats.map((f) => (
              <tr key={f.name} className="border-b last:border-0">
                <td className="px-6 py-4 font-medium">
                  <Badge variant="outline">{f.name}</Badge>
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {f.includes}
                </td>
                <td className="px-6 py-4 text-muted-foreground">{f.useCase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </Section>
  );
}

// ─── Install ───
function InstallSection() {
  const { t } = useI18n();
  const steps = [
    t("web.home.install.step1"),
    t("web.home.install.step2"),
    t("web.home.install.step3"),
    t("web.home.install.step4"),
    t("web.home.install.step5"),
    t("web.home.install.step6"),
    t("web.home.install.step7"),
  ];

  return (
    <Section className="bg-muted/40">
      <SectionTitle className="text-center">
        {t("web.home.install.title")}
      </SectionTitle>
      <motion.ol
        variants={stagger}
        className="mx-auto mt-10 max-w-xl space-y-4"
      >
        {steps.map((step, i) => (
          <motion.li
            key={i}
            variants={fadeUp}
            className="flex items-start gap-4 rounded-lg border bg-card p-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span className="pt-1 text-sm">{step}</span>
          </motion.li>
        ))}
      </motion.ol>
      <motion.div variants={fadeUp} className="mt-8 text-center">
        <Button size="lg" asChild>
          <a href={GITHUB_RELEASES} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            {t("web.home.install.download")}
          </a>
        </Button>
      </motion.div>
    </Section>
  );
}

// ─── Platforms ───
function PlatformsSection() {
  const { t } = useI18n();
  const platforms = [
    {
      name: t("web.home.platforms.chatgpt.name"),
      desc: t("web.home.platforms.chatgpt.desc"),
    },
    {
      name: t("web.home.platforms.claude.name"),
      desc: t("web.home.platforms.claude.desc"),
    },
    {
      name: t("web.home.platforms.gemini.name"),
      desc: t("web.home.platforms.gemini.desc"),
    },
    {
      name: t("web.home.platforms.deepseek.name"),
      desc: t("web.home.platforms.deepseek.desc"),
    },
    {
      name: t("web.home.platforms.grok.name"),
      desc: t("web.home.platforms.grok.desc"),
    },
    {
      name: t("web.home.platforms.github.name"),
      desc: t("web.home.platforms.github.desc"),
    },
  ];

  return (
    <Section>
      <SectionTitle className="text-center">
        {t("web.home.platforms.title")}
      </SectionTitle>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((p) => (
          <motion.div
            key={p.name}
            variants={fadeUp}
            className="rounded-xl border bg-card p-5 text-center"
          >
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ─── CTA ───
function CtaSection() {
  const { t } = useI18n();
  return (
    <Section className="bg-muted/40 text-center">
      <SectionTitle>{t("web.home.cta.title")}</SectionTitle>
      <motion.div
        variants={fadeUp}
        className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <Button size="lg" asChild>
          <a href={GITHUB_RELEASES} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            {t("web.home.cta.install")}
          </a>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
            <Star className="mr-2 h-4 w-4" />
            {t("web.home.cta.star")}
          </a>
        </Button>
      </motion.div>
    </Section>
  );
}

// ─── Landing Page ───
export function LandingPage() {
  return (
    <div className="homepage">
      <HeroSection />
      <ProblemSection />
      <CompareSection />
      <TrustSection />
      <HowSection />
      <FeaturesSection />
      <BundleSection />
      <FormatsSection />
      <InstallSection />
      <PlatformsSection />
      <CtaSection />
    </div>
  );
}
