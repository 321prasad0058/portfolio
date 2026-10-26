// Every word on the site lives here. Sourced from CV11_Prasad_Alai.pdf, the project READMEs and the
// public GitHub / LeetCode profiles.

export const profile = {
  name: 'Prasad Anil Alai',
  first: 'Prasad',
  last: 'Anil Alai',
  role: 'Software Engineer',
  pitch: 'I build production software at FlexiLoans: the customer portal, APIs and AI agents that take a small-business loan from first click to money in the bank.',
  location: 'Mumbai, India',
  email: 'prasadalai2014@gmail.com',
  links: {
    github: 'https://github.com/321prasad0058',
    linkedin: 'https://www.linkedin.com/in/prasad-alai-52879a255',
    leetcode: 'https://leetcode.com/u/Prasad_2472/',
    blog: 'https://prasadalai.hashnode.dev',
  },
  roles: ['Backend systems', 'Frontend platforms', 'Agentic AI', 'Voice AI', 'Distributed systems'],
}

/** The headline numbers, all from production at FlexiLoans. */
/** The LinkedIn card. Set `followers` to the number on the profile; `cover` to an image in public/ to use the real banner. */
export const linkedin = {
  url: 'https://www.linkedin.com/in/prasad-alai-52879a255/',
  photo: '/images/prasad.jpg',
  cover: null as string | null,
  headline: 'Software Engineer @ FlexiLoans · Backend · Frontend · Agentic AI',
  location: 'Mumbai, Maharashtra, India',
  org: 'FlexiLoans',
  school: 'Don Bosco Institute of Technology',
  followers: '8K+' as string | null,
}

export const impact = [
  { value: 50, suffix: 'K+', label: 'credit checks a day, under a second each' },
  { value: 60, suffix: '%', label: 'faster loan onboarding' },
  { value: 45, suffix: '%', label: 'fewer manual tasks, via AI agents' },
  { value: 40, suffix: '%', label: 'more leads converted by voice AI' },
]

export const pillars = [
  { name: 'Backend', tone: 'g', summary: 'Java, Node.js, Nest.js and Python services. REST APIs, webhooks, event-driven pipelines, Redis caching, MySQL and PostgreSQL on AWS.' },
  { name: 'Frontend', tone: 'c', summary: 'The Customer Journey Portal and its dashboard in Angular, React and Next.js: the screens business owners apply, sign and track their loans on.' },
  { name: 'Agentic AI', tone: 'v', summary: 'A SaaS workbench for deploying LLM agents, the Flexi-MCP server that connects them to core APIs, and Flexy, a real-time multilingual voice agent.' },
]

export type System = {
  id: string
  /** the camera stop for this card */
  stop: string
  /** which 3D scene on the panorama it belongs to */
  scene: number
  name: string
  parts?: { title: string; text: string }[]
  short: string
  pillars: string[]
  plain: string
  built: string
  metrics: { value: number; suffix?: string; prefix?: string; label: string }[]
  partners?: string[]
  tags: string[]
  link?: { href: string; label: string }
}

export const flexiloans = {
  company: 'FlexiLoans',
  role: 'Software Engineer I · Full Stack',
  period: 'Jun 2025 — Present',
  location: 'Mumbai',
  about: 'FlexiLoans lends to India’s small businesses entirely online. I build the systems a loan travels through: the portal customers apply on, the AI agents that work alongside the team, and the engines underneath that read statements and fetch credit scores.',
  // the five scenes on the panorama, in order
  scenes: ['Customer Journey Portal', 'Agent Workbench', 'Flexy voice AI', 'Statement parser', 'Credit engine'],
  systems: [
    {
      id: 'cjp',
      stop: 'cjp',
      scene: 0,
      name: 'Customer Journey Portal (CJP)',
      short: 'CJP',
      pillars: ['Backend', 'Frontend'],
      plain: 'Everything a business owner goes through to get a loan at FlexiLoans, from the first form to money in their bank. I built it end to end: the architecture, backend APIs that keep it seamless across multiple dynamic workflows, and a polished frontend.',
      parts: [
        { title: 'Onboarding journey', text: 'Apply → bureau → KYC → bank data → sanctioned offer, across 10+ partners.' },
        { title: 'Customer dashboard', text: 'Tracking, Refer & Earn, Credit Score, My Loans, Profile, a Rewards engine and Financial Insights (cash-flow analytics from bank statements).' },
        { title: 'Post-sanction journey', text: 'VKYC, e-sign, MITC and e-NACH, through to disbursement.' },
      ],
      built: '',
      metrics: [
        { value: 60, suffix: '%', label: 'faster TAT' },
        { value: 42, suffix: '%', prefix: '+', label: 'completion' },
        { value: 38, suffix: '%', prefix: '+', label: 'engagement' },
        { value: 45, suffix: '%', prefix: '+', label: 'adoption' },
      ],
      partners: ['CIBIL', 'Experian', 'Equifax', 'IDfy', 'NSDL', 'DigiLocker', 'Core-KYC Udyam', 'Finarkein (AA)', 'Setu (AA)', 'Leegality', 'Digio', 'Razorpay', 'Synoriq LMS'],
      tags: [],
      link: { href: 'https://flexiloans.com/', label: 'flexiloans.com' },
    },
    {
      id: 'workbench',
      stop: 'mcp',
      scene: 1,
      name: 'AI Agent Workbench & Flexi-MCP',
      short: 'Agent Workbench',
      pillars: ['Agentic AI', 'Backend'],
      plain: 'A SaaS platform that lets non-technical teams build and deploy their own AI agents, which then do real work inside the company, like looking up an application or pulling a report.',
      built: 'I engineered the Python/Node.js backend of the Workbench and a Model Context Protocol server (Flexi-MCP) that links the agents to core company APIs, with guardrails on every call.',
      metrics: [{ value: 45, suffix: '%', label: 'fewer manual tasks' }],
      tags: ['LLM agents', 'MCP', 'SaaS', 'Python', 'Node.js'],
    },
    {
      id: 'flexy',
      stop: 'flexy',
      scene: 2,
      name: 'Flexy, Multilingual Conversational AI',
      short: 'Flexy',
      pillars: ['Agentic AI'],
      plain: 'An autonomous voice agent that talks with customers in their own regional language and completes their loan application with them, in one conversation.',
      built: 'Real-time voice agents with live intent classification that routes high-intent leads straight to the sales team.',
      metrics: [
        { value: 5, prefix: '<', suffix: ' min', label: 'to a complete application' },
        { value: 40, suffix: '%', prefix: '+', label: 'lead conversion' },
        { value: 35, suffix: '%', prefix: '+', label: 'CRM efficiency' },
      ],
      tags: ['Voice AI', 'Realtime', 'Intent classification', 'Regional languages'],
      link: { href: 'https://loans.flexiloans.com/flexy', label: 'talk to Flexy' },
    },
    {
      id: 'parser',
      stop: 'parser',
      scene: 3,
      name: 'In-House Bank Statement Parser',
      short: 'Statement parser',
      pillars: ['Backend'],
      plain: 'Lenders need to read a customer’s bank statements. This reads the PDF and turns every transaction into clean, structured data, in-house instead of through a paid vendor.',
      built: 'An object-oriented parsing engine written from scratch, with custom regex tokenizers and async worker threads for throughput.',
      metrics: [
        { value: 99, suffix: '%', label: 'parsing accuracy' },
        { value: 0, prefix: '₹', label: 'vendor bill, down from a yearly contract' },
      ],
      tags: ['Node.js', 'Worker threads', 'Tokenizers', 'OOP'],
    },
    {
      id: 'credit',
      stop: 'credit',
      scene: 4,
      name: 'Real-Time Credit Score Engine',
      short: 'Credit engine',
      pillars: ['Backend'],
      plain: 'Shows a customer their credit score the moment they ask for it.',
      built: 'Event-driven services for instant credit-profile retrieval, with multi-tier Redis caching and exponential-backoff retries against the credit bureaus.',
      metrics: [
        { value: 50, suffix: 'K+', label: 'checks a day, sub-second' },
        { value: 48, suffix: '%', prefix: '+', label: 'qualified leads' },
      ],
      tags: ['Event-driven', 'Redis', 'Retries', 'Java'],
      link: { href: 'https://loans.flexiloans.com/credit-score', label: 'check your score' },
    },
  ] as System[],
}

export type Project = {
  id: 'kosha' | 'vana' | 'transcribo'
  name: string
  tagline: string
  plain: string
  how: string[]
  impact?: string
  stack: string[]
  live?: string
  code?: string
  accent: string
}

export const projects: Project[] = [
  {
    id: 'vana',
    name: 'VANA',
    tagline: 'An AI companion for mental health that speaks your language.',
    plain: 'Talk to VANA in English, Hindi or Marathi when things feel heavy. It listens, answers with care, plays calming soundscapes, and if it senses a crisis, it hands you to real clinical help.',
    how: [
      'Your voice is transcribed and cleaned up by an AI refiner, in your language',
      'Two LLMs work together, one to talk and one for clinical insight, at sub-second latency',
      'Safety guardrails watch every message for crisis signals',
    ],
    impact: '+35% engagement · 90% of the regional demographic reached · 0% missed crisis handoffs',
    stack: ['Go', 'React', 'PostgreSQL', 'Groq', 'Gemini 2.5 Flash', 'Supabase', 'Docker'],
    live: 'https://vana-mind.vercel.app/',
    code: 'https://github.com/fl-prasad-alai/VANA',
    accent: '#9b7bff',
  },
  {
    id: 'kosha',
    name: 'Kosha',
    tagline: 'A credit passport for India’s corner shops.',
    plain: 'Millions of small shopkeepers write every sale in a handwritten notebook (a khata). Banks can’t read it, so these shops can’t get loans. Kosha photographs the notebook, reads it with AI, checks it against bills and payments, and gives the shop a credit passport any lender can verify with a QR code.',
    how: [
      'Snap the ledger, the supplier bills and the UPI statement',
      'Gemini reads handwriting in Hindi, Bahasa or Taglish, line by line; 12 cross-checks catch edited documents',
      'Fixed, auditable rules give a 300–900 score and a loan limit, explained aloud in the owner’s language',
    ],
    impact: 'A passport in about two minutes, with no bank statement',
    stack: ['React 19', 'Gemini 3 Flash', 'Firebase', 'Three.js', 'GSAP'],
    live: 'https://kosha-ai.web.app',
    code: 'https://github.com/fl-prasad-alai/Kosha',
    accent: '#f5b84b',
  },
  {
    id: 'transcribo',
    name: 'Transcribo',
    tagline: 'Meeting minutes that write themselves, offline.',
    plain: 'Record a meeting and Transcribo writes down who said what. It runs entirely on your own machine, so nothing confidential leaves the room, then emails everyone the summary and the action items.',
    how: [
      'OpenAI Whisper turns speech into text, offline',
      'PyAnnote works out which speaker said each line (84% accuracy with several speakers)',
      'A background pipeline pulls out action items and emails the summary',
    ],
    stack: ['Django', 'React', 'SQL', 'REST', 'Whisper', 'PyAnnote'],
    code: 'https://github.com/321prasad0058/transcribo',
    accent: '#2ee6d6',
  },
]

export const achievements = [
  { value: 241, prefix: 'AIR ', label: 'Codekaze ’24', note: 'out of 100,000+ engineers' },
  { value: 1, suffix: 'st', label: 'InnoQuest ’23', note: 'national-level project competition' },
]

export const education = {
  school: 'Don Bosco Institute of Technology',
  university: 'Mumbai University',
  degree: 'B.E. in Information Technology',
  period: '2021 — 2025',
  cgpa: 8.67,
  coursework: ['Data Structures & Algorithms', 'Product Management', 'Object Oriented Programming', 'Database Management Systems', 'Operating Systems', 'Computer Networks', 'Project Management'],
}

export const stack = {
  Backend: ['Java 17+', 'Go', 'Node.js', 'Nest.js', 'Python', 'REST APIs', 'Microservices', 'Kafka', 'Redis', 'PostgreSQL', 'MySQL'],
  Frontend: ['TypeScript', 'JavaScript', 'React', 'Next.js', 'Angular', 'Tailwind CSS', 'Three.js', 'GSAP'],
  'Agentic AI': ['MCP servers', 'LLM agents', 'Voice AI', 'Gemini', 'Groq', 'Whisper', 'Guardrails'],
  'Platform & Practice': ['AWS', 'Docker', 'OpenTelemetry', 'CI/CD', 'Git', 'Linux', 'Jest', 'JUnit', 'TDD', 'System Design'],
}

export const leadership = [
  { role: 'UI/UX Head & TPC Co-ordinator', org: 'Training and Placement Cell, DBIT', period: 'Feb 2024 — Jun 2025' },
  { role: 'Head of Activities', org: 'NSS', period: 'Aug 2022 — Feb 2025' },
  { role: 'Head of Events', org: 'Google Developer Group on Campus (GDGC)', period: 'Aug 2023 — Jul 2024' },
  { role: 'Head of Hysteria ’23', org: 'Annual Cultural Fest of DBIT', period: 'Mar 2023 — Apr 2023' },
  { role: 'Head of Colosseum ’23', org: 'Annual Technical Fest of DBIT', period: 'Nov 2022 — Feb 2023' },
  { role: 'Cultural Secretary', org: 'Student Council', period: 'Sep 2022 — Jul 2023' },
  { role: 'Assistant Design Head', org: 'ACM DBIT', period: 'Sep 2022 — Jul 2023' },
]

export const certifications = [
  { name: 'Meta Front-End Developer', link: 'https://www.coursera.org/professional-certificates/meta-front-end-developer' },
  { name: 'IBM Product Management', link: 'https://www.coursera.org/account/accomplishments/records/0NM7SA9HRKCC' },
  { name: 'Google UI/UX Certificate', link: 'https://coursera.org/share/d90c5e1f44c13aad483166169af2bc4e' },
]

/** Languages spoken. `dots` (1–5) lights the level blocks; `hero` overrides the name shown in the hero line. */
export const languages: { name: string; native: string; hero?: string; hello: string; level: string; dots: number }[] = [
  { name: 'English', native: 'English', hello: 'Hello', level: 'Fluent', dots: 5 },
  { name: 'German', native: 'Deutsch', hero: 'German', hello: 'Hallo', level: 'Fluent', dots: 5 },
  { name: 'Hindi', native: 'हिन्दी', hello: 'नमस्ते', level: 'Fluent', dots: 5 },
  { name: 'Marathi', native: 'मराठी', hello: 'नमस्कार', level: 'Fluent', dots: 5 },
]

// The chapters of the story, as commits.
export const chapters = [
  { id: 'hello', hash: 'a1f3c20', msg: 'init: hello, world', label: 'hello' },
  { id: 'flexiloans', hash: 'f1e8a5e', msg: 'release: in production @ FlexiLoans', label: 'production' },
  { id: 'projects', hash: '3d9b0a7', msg: 'merge: things I built on my own', label: 'projects' },
  { id: 'proof', hash: 'c0de400', msg: 'perf: code, every single day', label: 'every day' },
  { id: 'origin', hash: '7b2e91d', msg: 'feat: B.E. Information Technology', label: 'foundations' },
  { id: 'stack', hash: '5ac7e11', msg: 'chore: toolchain', label: 'toolchain' },
  { id: 'contact', hash: 'HEAD', msg: 'push: origin/future', label: 'contact' },
] as const
