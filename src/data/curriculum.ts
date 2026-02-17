
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
        duration: "4h 26s",
        youtubeId: "rfscVS0vtbw",
        free: false,
      },
      {
        id: "python-intermediate",
        title: "Python Intermediate",
        duration: "5h 57m 46s",
        youtubeId: "HGOBQPFzWKo",
        free: false,
      },
      {
        id: "python-project",
        title: "Python Project: Zero to Hero",
        duration: "9h 19m",
        youtubeId: "NpmFbWO6HPU",
        free: false,
      },
      {
        id: "streamlit",
        title: "Streamlit Crash Course",
        duration: "11m",
        youtubeId: "D0D4Pa22iG0",
        free: false,
        notesPath: "https://drive.google.com/drive/u/0/folders/1-wk8nrebq2jM17T9pOkoXmyp83jk8fNo"
      },
      {
        id: "dsa-java",
        title: "DSA In JAVA Mastery",
        duration: "45:00",
        youtubeId: "vLqTf2b6GZw",
        free: false,
        notesPath: "/notes/DSA In JAVA/java collection framework.pdf"
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
        id: "css-video",
        title: "CSS Video Tutorial",
        duration: "41m",
        youtubeId: "K1naz9wBwKU",
        free: false,
        notesPath: "/notes/Full Stack Web Development Mastery Course In Hindi/CSS/✅ 📘 CSS Animations – Detailed Notes.pdf"
      },
      {
        id: "web-dev-project",
        title: "Web Development Project",
        duration: "3h 22m",
        youtubeId: "J_r6hBo9lO4",
        free: false,
      },
      {
        id: "javascript-video",
        title: "JavaScript Video Tutorial",
        duration: "8h 4m",
        youtubeId: "a-wVHL0lpb0",
        free: false,
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
        id: "bootstrap",
        title: "Bootstrap 5 Foundation",
        duration: "20:00",
        youtubeId: "Jyvffr3aCp0",
        free: false,
        notesPath: "/notes/Bootstrap Mastery Course/🎬 Bootstrap 5 Mastery Course – Web Dev Mastery.pdf"
      },
      {
        id: "js-oops",
        title: "JavaScript OOPS & Advanced",
        duration: "20:00",
        youtubeId: "BS9v-YmG1vM",
        free: false,
        notesPath: "/notes/JavaScript_OOPS/OOPS_In_JS.pdf"
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
        notesPath: "/notes/React.JS Complete Tutorial/Complete React.js Web Dev Mastey.pdf"
      },
      {
        id: "react-router",
        title: "React Router v7 Mastery",
        duration: "20:00",
        youtubeId: "77m62v_mXis",
        free: false,
        notesPath: "/notes/React.JS Complete Tutorial/React_Router_v7_Web_Dev_Mastery.pdf"
      },
      {
        id: "react-hooks",
        title: "All React Hooks In One Shot",
        duration: "25:00",
        youtubeId: "LlvBzyy-558",
        free: false,
        notesPath: "/notes/All_React_Hooks_In_One_Shot/📘 All React Hooks 2025 – Web Dev Mastery.pdf"
      },
      {
        id: "redux-toolkit",
        title: "Redux Toolkit Tutorial",
        duration: "30:00",
        youtubeId: "EnIRy6_CC_w",
        free: false,
        notesPath: "/notes/Redux_Toolkit_In_One_Shot/Redux - Toolkit.pdf"
      },
      {
        id: "react-interview",
        title: "React Interview Preparation",
        duration: "40:00",
        youtubeId: "v80vL9m2QTM",
        free: false,
        notesPath: "/notes/React_Most_Imp_Interview_Question/1_React_Interview_Questions_Web_Dev_Mastery.pdf"
      }
    ],
  },
  {
    id: "phase-4",
    title: "Phase 4 — Backend & Modern DB",
    description: "Building robust backends with Node/Python and MongoDB.",
    lessons: [
      {
        id: "backend-development",
        title: "Backend Development",
        duration: "4h 12m",
        youtubeId: "Q-icS7yZz5k",
        free: false,
      },
      {
        id: "backend-projects",
        title: "Backend Projects",
        duration: "36m",
        youtubeId: "JmpDGMgRFfo",
        free: false,
      },
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
        notesPath: "/notes/Full Stack Web Development Mastery Course In Hindi/HTML/🎓 Full Stack Web Development Mastery Course_ HTML – Beginner to Pro (With Examples).pdf"
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
        notesPath: "/notes/C++ OOPs/Complete_OOPS_Web_Dev_Mastery.pdf"
      }
    ]
  }
];
