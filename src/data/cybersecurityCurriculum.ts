
import { Module } from "./curriculum";

export const cybersecurityCurriculum: Module[] = [
    {
        id: "cyber-phase-0",
        title: "Day 1–7 — Network+ Concepts",
        description: "Understand networking fundamentals with CompTIA Network+ concepts.",
        lessons: [
            {
                id: "cyber-network-plus",
                title: "Professor Messer's N10-009 CompTIA Network+",
                duration: "24h",
                youtubeId: "As6g6IXcVa4",
                free: true,
            },
        ],
    },
    {
        id: "cyber-phase-1",
        title: "Day 8–14 — Security+ Concepts",
        description: "Learn core security principles with CompTIA Security+ preparation.",
        lessons: [
            {
                id: "cyber-security-plus-messer",
                title: "Professor Messer's SY0-701 CompTIA Security+",
                duration: "11h",
                youtubeId: "KiEptGbnEBc",
                free: false,
            },
            {
                id: "cyber-security-plus-alt",
                title: "Pete Zerger's SY0-701 Security+",
                duration: "6h",
                youtubeId: "1E7pI7PB4KI",
                free: false,
            },
        ],
    },
    {
        id: "cyber-phase-2",
        title: "Day 15–28 — Linux Fundamentals",
        description: "Master the Linux command line, file system, and system administration.",
        lessons: [
            {
                id: "cyber-linux-journey",
                title: "Linux Journey — Full Walkthrough",
                duration: "10h",
                youtubeId: "",
                free: false,
            },
            {
                id: "cyber-linux-cisco",
                title: "Linux Unhatched (Cisco NetAcad)",
                duration: "8h",
                youtubeId: "",
                free: false,
            },
        ],
    },
    {
        id: "cyber-phase-3",
        title: "Day 29–42 — Python for Cybersecurity",
        description: "Learn Python with a focus on cybersecurity scripting and automation.",
        lessons: [
            {
                id: "cyber-python-codecademy",
                title: "Learn Python (Codecademy Track)",
                duration: "12h",
                youtubeId: "",
                free: false,
            },
            {
                id: "cyber-python-cybermentor",
                title: "Python for Ethical Hacking — TheCyberMentor",
                duration: "2h 50m",
                youtubeId: "egg-GoT5iVk",
                free: false,
            },
        ],
    },
    {
        id: "cyber-phase-4",
        title: "Day 43–56 — Traffic Analysis",
        description: "Analyze network traffic with Wireshark, tcpdump, and Suricata IDS/IPS.",
        lessons: [
            {
                id: "cyber-wireshark-tutorial",
                title: "Wireshark Tutorial for Beginners",
                duration: "3h",
                youtubeId: "NjvR4LmwcMU",
                free: false,
            },
            {
                id: "cyber-suricata-ids",
                title: "Suricata Network IDS/IPS",
                duration: "1h 30m",
                youtubeId: "S0-vsjhPDN0",
                free: false,
            },
        ],
    },
    {
        id: "cyber-phase-5",
        title: "Day 57–63 — Git & Version Control",
        description: "Learn Git for collaboration, version control, and security auditing.",
        lessons: [
            {
                id: "cyber-git-basics",
                title: "Git for Beginners (Codecademy)",
                duration: "4h",
                youtubeId: "",
                free: false,
            },
            {
                id: "cyber-git-branching",
                title: "Learn Git Branching — Interactive",
                duration: "3h",
                youtubeId: "",
                free: false,
            },
        ],
    },
    {
        id: "cyber-phase-6",
        title: "Day 64–70 — ELK Stack (SIEM)",
        description: "Set up and use Elasticsearch, Logstash, and Kibana for log analysis and SIEM.",
        lessons: [
            {
                id: "cyber-elk-tutorial",
                title: "Complete ELK Stack Tutorial",
                duration: "6h",
                youtubeId: "",
                free: false,
            },
        ],
    },
    {
        id: "cyber-phase-7",
        title: "Day 71–84 — Cloud Security (AWS / Azure / GCP)",
        description: "Explore cloud platforms and learn cloud security fundamentals.",
        lessons: [
            {
                id: "cyber-cloud-aws",
                title: "AWS Getting Started & Security Basics",
                duration: "6h",
                youtubeId: "",
                free: false,
            },
            {
                id: "cyber-cloud-azure",
                title: "Azure Fundamentals & Security",
                duration: "6h",
                youtubeId: "",
                free: false,
            },
            {
                id: "cyber-cloud-gcp",
                title: "GCP Getting Started & Security",
                duration: "6h",
                youtubeId: "",
                free: false,
            },
        ],
    },
    {
        id: "cyber-phase-8",
        title: "Day 85–90 — Ethical Hacking",
        description: "Practice ethical hacking with Hack The Box and VulnHub challenges.",
        lessons: [
            {
                id: "cyber-hacking-pt1",
                title: "Ethical Hacking in 15 Hours — Part 1 (TheCyberMentor)",
                duration: "8h",
                youtubeId: "3FNYvj2U0HM",
                free: false,
            },
            {
                id: "cyber-hacking-pt2",
                title: "Ethical Hacking — Part 2 (TheCyberMentor)",
                duration: "7h",
                youtubeId: "sH4JCwjybGs",
                free: false,
            },
        ],
    },
    {
        id: "cyber-phase-9",
        title: "Day 91–95 — Resume & Career Prep",
        description: "Build a one-page cybersecurity resume and learn where to apply.",
        lessons: [
            {
                id: "cyber-resume",
                title: "Cybersecurity Resume — One Page Template",
                duration: "2h",
                youtubeId: "",
                free: false,
            },
            {
                id: "cyber-job-search",
                title: "Where and How to Apply for Cybersecurity Jobs",
                duration: "2h",
                youtubeId: "",
                free: false,
            },
        ],
    },
];
