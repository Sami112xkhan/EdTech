
export interface Project {
    id: string;
    title: string;
    description: string;
    tech: string[];
    status: "Pending" | "In Progress" | "Completed";
    githubLink?: string;
    demoLink?: string;
    icon: string;
    difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export const projects: Project[] = [
    {
        id: "python-cli",
        title: "Python CLI App",
        description: "A command-line interface tool built with Python to automate tasks.",
        tech: ["Python", "Click", "Argparse"],
        status: "Pending",
        icon: "terminal",
        difficulty: "Beginner",
    },
    {
        id: "fullstack-crud",
        title: "Full Stack CRUD App",
        description: "Create, Read, Update, Delete application with a React frontend and Python backend.",
        tech: ["React", "FastAPI", "PostgreSQL"],
        status: "Pending",
        icon: "database",
        difficulty: "Intermediate",
    },
    {
        id: "auth-system",
        title: "Authentication System",
        description: "Secure user authentication using JWT, OAuth, and password hashing.",
        tech: ["Python", "JWT", "Bcrypt"],
        status: "Pending",
        icon: "code",
        difficulty: "Advanced",
    },
    {
        id: "deployment",
        title: "Deployment Project",
        description: "Deploying a full-stack application to a cloud provider like AWS or Render.",
        tech: ["Docker", "CI/CD", "Render"],
        status: "Pending",
        icon: "globe",
        difficulty: "Intermediate",
    },
    {
        id: "streamlit-dashboard",
        title: "Streamlit Dashboard",
        description: "Interactive data science dashboard powered by Streamlit and Pandas.",
        tech: ["Python", "Streamlit", "Pandas"],
        status: "Pending",
        icon: "database",
        difficulty: "Beginner",
    },
];
