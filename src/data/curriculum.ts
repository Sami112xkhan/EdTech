
export interface Lesson {
  id: string;
  title: string;
  duration: string;
  youtubeId: string;
  free: boolean;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export const curriculum: Module[] = [
  {
    id: "phase-0",
    title: "Phase 0 — Setup",
    description: "Setting up your development environment and mastering Git.",
    lessons: [
      {
        id: "git-github",
        title: "Git & GitHub Masterclass",
        duration: "15:00",
        youtubeId: "vA5TTz6BXhY",
        free: true,
      },
    ],
  },
  {
    id: "phase-1",
    title: "Phase 1 — Python",
    description: "Master Python from scratch to advanced concepts.",
    lessons: [
      {
        id: "python-intro",
        title: "Python Introduction",
        duration: "20:00",
        youtubeId: "rfscVS0vtbw",
        free: false,
      },
      {
        id: "python-intermediate",
        title: "Python Intermediate",
        duration: "25:00",
        youtubeId: "HGOBQPFzWKo",
        free: false,
      },
      {
        id: "python-projects",
        title: "Python Projects",
        duration: "30:00",
        youtubeId: "NpmFbWO6HPU",
        free: false,
      },
    ],
  },
  {
    id: "phase-2",
    title: "Phase 2 — Web Basics",
    description: "The foundation of the web: HTML, CSS, and JavaScript.",
    lessons: [
      {
        id: "html",
        title: "HTML Crash Course",
        duration: "18:00",
        youtubeId: "G3e-cpL7ofc",
        free: false,
      },
      {
        id: "css",
        title: "CSS Mastery",
        duration: "22:00",
        youtubeId: "K1naz9wBwKU",
        free: false,
      },
      {
        id: "javascript",
        title: "JavaScript Fundamentals",
        duration: "28:00",
        youtubeId: "a-wVHL0lpb0",
        free: false,
      },
      {
        id: "dom",
        title: "DOM Manipulation",
        duration: "15:00",
        youtubeId: "uoII7VSDF3k",
        free: false,
      },
      {
        id: "web-project",
        title: "Web Development Project",
        duration: "40:00",
        youtubeId: "J_r6hBo9lO4",
        free: false,
      },
    ],
  },
  {
    id: "phase-3",
    title: "Phase 3 — Backend & Database",
    description: "Building robust backends with Python, APIs, and Databases.",
    lessons: [
      {
        id: "backend-course",
        title: "Complete Backend Course",
        duration: "50:00",
        youtubeId: "rOpEN1JDaD0",
        free: false,
      },
      {
        id: "rest-api",
        title: "REST API Design",
        duration: "20:00",
        youtubeId: "-mN3VyJuCjM",
        free: false,
      },
      {
        id: "auth-fundamentals",
        title: "Authentication Fundamentals",
        duration: "25:00",
        youtubeId: "fbSVgC8nGz4",
        free: false,
      },
      {
        id: "mongodb",
        title: "MongoDB Essentials",
        duration: "30:00",
        youtubeId: "c2M-rlkkT5o",
        free: false,
      },
      {
        id: "sql",
        title: "SQL Full Course",
        duration: "45:00",
        youtubeId: "7S_tz1z_5bA",
        free: false,
      },
      {
        id: "backend-projects",
        title: "Backend Projects",
        duration: "55:00",
        youtubeId: "JmpDGMgRFfo",
        free: false,
      },
    ],
  },
  {
    id: "phase-4",
    title: "Phase 4 — Deployment",
    description: "Taking your application live.",
    lessons: [
      {
        id: "env-vars",
        title: "Environment Variables",
        duration: "12:00",
        youtubeId: "v5n96CX339g",
        free: false,
      },
    ],
  },
  {
    id: "phase-5",
    title: "Phase 5 — AI Dashboard",
    description: "Building an AI-powered dashboard with Streamlit.",
    lessons: [
      {
        id: "streamlit",
        title: "Streamlit Dashboard",
        duration: "35:00",
        youtubeId: "D0D4Pa22iG0",
        free: false,
      },
    ],
  },
];
