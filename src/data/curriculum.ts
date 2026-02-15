
export interface Lesson {
  id: string;
  title: string;
  duration: string;
  youtubeId: string;
  free: boolean;
  notesPath?: string;
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
        notesPath: "/notes/Git & GitHub/Git & GitHub.pdf"
      },
    ],
  },
  {
    id: "phase-1",
    title: "Phase 1 — Python & Java",
    description: "Master Python from scratch and explore Java DSA.",
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
        id: "dsa-java",
        title: "DSA In JAVA Mastery",
        duration: "45:00",
        youtubeId: "vLqTf2b6GZw",
        free: false,
        notesPath: "/notes/DSA In JAVA/DSA In JAVA.pdf"
      }
    ],
  },
  {
    id: "phase-2",
    title: "Phase 2 — Web Foundation",
    description: "The foundation of the web: HTML, CSS, and modern frameworks.",
    lessons: [
      {
        id: "html",
        title: "HTML Crash Course",
        duration: "18:00",
        youtubeId: "G3e-cpL7ofc",
        free: false,
        notesPath: "/notes/HTML_In_One_Shot/HTML Tutorial for Beginners.pdf"
      },
      {
        id: "tailwind",
        title: "Tailwind CSS Mastery",
        duration: "22:00",
        youtubeId: "lCxcTsOHrjo",
        free: false,
        notesPath: "/notes/Tailwind CSS/🎬 Tailwind CSS Mastery Course.pdf"
      },
      {
        id: "javascript",
        title: "JavaScript Fundamentals",
        duration: "28:00",
        youtubeId: "a-wVHL0lpb0",
        free: false,
      },
      {
        id: "js-oops",
        title: "JavaScript OOPS & Advanced",
        duration: "20:00",
        youtubeId: "BS9v-YmG1vM",
        free: false,
        notesPath: "/notes/JavaScript_OOPS/JavaScript_OOPS.pdf"
      }
    ],
  },
  {
    id: "phase-3",
    title: "Phase 3 — React & State Management",
    description: "Building modern UIs with React and Redux.",
    lessons: [
      {
        id: "react-complete",
        title: "React.JS Complete Tutorial",
        duration: "50:00",
        youtubeId: "bMknfKXIFA8",
        free: false,
        notesPath: "/notes/React.JS Complete Tutorial/React.JS Complete Tutorial.pdf"
      },
      {
        id: "react-hooks",
        title: "All React Hooks In One Shot",
        duration: "25:00",
        youtubeId: "LlvBzyy-558",
        free: false,
        notesPath: "/notes/All_React_Hooks_In_One_Shot/React Hooks In One Shot.pdf"
      },
      {
        id: "redux-toolkit",
        title: "Redux Toolkit Tutorial",
        duration: "30:00",
        youtubeId: "EnIRy6_CC_w",
        free: false,
        notesPath: "/notes/Redux_Toolkit_In_One_Shot/Redux Toolkit.pdf"
      }
    ],
  },
  {
    id: "phase-4",
    title: "Phase 4 — Backend & Modern DB",
    description: "Building robust backends with Node/Python and MongoDB.",
    lessons: [
      {
        id: "mongodb-essentials",
        title: "MongoDB Essentials & Cheat Sheet",
        duration: "30:00",
        youtubeId: "c2M-rlkkT5o",
        free: false,
        notesPath: "/notes/MongoDB Cheat Sheet/MongoDB Cheat Sheet.pdf"
      },
      {
        id: "backend-mastery",
        title: "Full Stack Master Course",
        duration: "60:00",
        youtubeId: "rOpEN1JDaD0",
        free: false,
        notesPath: "/notes/Full Stack Web Development Mastery Course In Hindi/Web Dev Mastery Course.pdf"
      }
    ],
  },
  {
    id: "phase-5",
    title: "Phase 5 — C++ & Programming Foundations",
    description: "Deep dive into C++ and object-oriented programming.",
    lessons: [
      {
        id: "cpp-mastery",
        title: "C++ Mastery Course",
        duration: "45:00",
        youtubeId: "vLqTf2b6GZw",
        free: false,
        notesPath: "/notes/C++ Mastery Course/Complete C++ Mastery Course Web Dev Mastery.pdf"
      },
      {
        id: "cpp-oops",
        title: "C++ OOPs Concepts",
        duration: "25:00",
        youtubeId: "JGNvVAbM-is",
        free: false,
        notesPath: "/notes/C++ OOPs/C++ OOPs.pdf"
      }
    ]
  }
];
