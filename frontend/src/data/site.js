/**
 * Vortiqen site content.
 *
 * Content rule: nothing here claims clients, logos, revenue, headcount,
 * awards, certifications, partnerships, or customer counts. The "Work" entries
 * describe capability areas and internal builds, explicitly framed as such —
 * they are not presented as client case studies.
 */

export const ENQUIRY_URL =
  'https://baserow.io/form/v7Nq4QWXBvXZo7F71Wq4Ue5ZsSynC2ChAU3rNu-_T3Y'

export const COMPANY = {
  name: 'Vortiqen',
  tagline: 'Software engineering for ambitious products and businesses.',
  email: 'hello@vortiqen.com',
  enquiryUrl: ENQUIRY_URL,
}

export const NAV = [
  { label: 'Home', id: 'top' },
  { label: 'Services', id: 'services' },
  { label: 'Solutions', id: 'process' },
  { label: 'Work', id: 'work' },
  { label: 'About', id: 'about' },
  { label: 'Contact', id: 'contact' },
]

/** Disciplines listed in the intro. Deliberately plain nouns. */
export const DISCIPLINES = [
  'Product Engineering',
  'Cloud & Infrastructure',
  'Automation',
  'AI-powered systems',
  'Web applications',
  'Backend systems',
  'DevOps & Platform Engineering',
]

/**
 * Services. `span` drives the asymmetric grid — the first two cards are wide
 * so the section does not read as six identical tiles.
 */
export const SERVICES = [
  {
    id: 'product',
    index: '01',
    icon: 'Boxes',
    title: 'Product Engineering',
    body: 'Design and build scalable web and software products, from first architecture decision through to a maintained production system.',
    span: 'wide',
    meta: ['Architecture', 'Web apps', 'Design systems'],
  },
  {
    id: 'ai',
    index: '02',
    icon: 'Braces',
    title: 'AI & Intelligent Systems',
    body: 'Integrate models into real business workflows — retrieval, evaluation, and guardrails included, so behaviour stays predictable.',
    span: 'wide',
    meta: ['Retrieval', 'Evaluation', 'Agents'],
  },
  {
    id: 'cloud',
    index: '03',
    icon: 'Cloud',
    title: 'Cloud & DevOps',
    body: 'Reliable infrastructure, deployment pipelines, and observability that make releases routine.',
    meta: ['IaC', 'CI/CD', 'Observability'],
  },
  {
    id: 'automation',
    index: '04',
    icon: 'Workflow',
    title: 'Automation',
    body: 'Replace repetitive operational processes with automation that is auditable and safe to change.',
    meta: ['Pipelines', 'Integrations'],
  },
  {
    id: 'backend',
    index: '05',
    icon: 'Database',
    title: 'Backend & APIs',
    body: 'Secure, well-versioned APIs and distributed services built to survive load and schema change.',
    meta: ['APIs', 'Data models', 'Queues'],
  },
  {
    id: 'ui',
    index: '06',
    icon: 'MonitorSmartphone',
    title: 'UI Engineering',
    body: 'Accessible, responsive interfaces with performance treated as a requirement rather than a later pass.',
    meta: ['Accessibility', 'Performance'],
  },
]

/** The delivery pipeline. Written as engineering stages, not agency ceremony. */
export const PROCESS = [
  {
    step: '01',
    title: 'Discover',
    body: 'Constraints before features. We map the domain, the existing systems, and what actually has to be true for the project to work.',
    output: 'Scope, risks, architecture direction',
  },
  {
    step: '02',
    title: 'Design',
    body: 'Interface and data model designed together. Decisions are written down, so the reasoning survives the handover.',
    output: 'Interface specs, schema, contracts',
  },
  {
    step: '03',
    title: 'Engineer',
    body: 'Built in reviewable increments behind tests and types. Working software at the end of every cycle, not at the end of the project.',
    output: 'Tested, reviewed increments',
  },
  {
    step: '04',
    title: 'Deploy',
    body: 'Reproducible environments and automated release paths. Shipping is a pipeline run, not an event that needs a plan.',
    output: 'CI/CD, environments, rollback',
  },
  {
    step: '05',
    title: 'Scale',
    body: 'Instrumented from the start. We tune against measured behaviour under real load rather than assumptions.',
    output: 'Metrics, traces, capacity headroom',
  },
]

/**
 * Capability areas. Each is described as the kind of system we build — no
 * client names, no invented outcomes, no metrics we cannot evidence.
 */
export const WORK = [
  {
    id: 'w-ai',
    name: 'Retrieval & Reasoning Platform',
    category: 'AI Systems',
    kind: 'Capability area',
    body: 'Document ingestion, hybrid retrieval, and an evaluation harness that scores answer quality before a change reaches production.',
    stack: ['Python', 'FastAPI', 'Vector DB', 'React'],
    accent: true,
  },
  {
    id: 'w-auto',
    name: 'Operations Automation Layer',
    category: 'Business Automation',
    kind: 'Capability area',
    body: 'Event-driven workflows that replace manual back-office steps, with a full audit trail and safe replay of any failed run.',
    stack: ['TypeScript', 'Queues', 'Postgres'],
  },
  {
    id: 'w-cloud',
    name: 'Platform & Delivery Foundation',
    category: 'Cloud Infrastructure',
    kind: 'Capability area',
    body: 'Infrastructure as code, environment parity, and deployment pipelines that make a release a routine, reversible operation.',
    stack: ['Terraform', 'Kubernetes', 'CI/CD'],
  },
  {
    id: 'w-saas',
    name: 'Multi-tenant SaaS Core',
    category: 'SaaS Platforms',
    kind: 'Capability area',
    body: 'Tenancy, authentication, roles, and billing boundaries designed at the schema level rather than bolted on afterwards.',
    stack: ['Node', 'Postgres', 'React'],
  },
  {
    id: 'w-dev',
    name: 'Internal Developer Platform',
    category: 'Developer Platforms',
    kind: 'Capability area',
    body: 'Golden paths, service scaffolding, and self-service environments that cut the distance between a commit and a running service.',
    stack: ['Go', 'Docker', 'Observability'],
  },
]

/** Technology layers for the engineering visual. Conceptual, not a logo wall. */
export const TECH_LAYERS = [
  { label: 'Interface', items: ['React', 'TypeScript', 'Design systems'] },
  { label: 'Services', items: ['APIs', 'Queues', 'Workers'] },
  { label: 'Data', items: ['Postgres', 'Caching', 'Vector search'] },
  { label: 'Platform', items: ['Containers', 'Kubernetes', 'CI/CD'] },
  { label: 'Signals', items: ['Metrics', 'Traces', 'Logging'] },
]

/** Principles for the About section. */
export const PRINCIPLES = [
  {
    title: 'Engineering quality',
    body: 'Types, tests, and reviews are the default. Code is written to be read by whoever maintains it next.',
  },
  {
    title: 'Practical innovation',
    body: 'New technology earns its place by solving a real constraint — not by being new.',
  },
  {
    title: 'Built to scale',
    body: 'Systems are designed for the load after the one they launch with, without over-building for imaginary scale.',
  },
  {
    title: 'Long-term maintainability',
    body: 'Clear boundaries and documented decisions, so the system stays changeable years in.',
  },
]
