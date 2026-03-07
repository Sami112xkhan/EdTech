import { Module } from "./curriculum";

export const dataScienceCurriculum: Module[] = [
    {
        id: "ds-phase-1",
        title: "Phase 1 — Introduction to Data Science",
        description: "Learn the basic concepts behind data science, ethics, and early statistics.",
        lessons: [
            {
                id: "ds-defining",
                title: "Defining Data Science",
                duration: "15:00",
                youtubeId: "beZ7Mb_oz9I",
                free: true,
                notesPath: "/Data Science Course/1-Introduction/01-defining-data-science/README.md"
            },
            {
                id: "ds-ethics",
                title: "Data Science Ethics",
                duration: "20:00",
                youtubeId: "", // Placeholder removed
                free: true,
                notesPath: "/Data Science Course/1-Introduction/02-ethics/README.md"
            },
            {
                id: "ds-defining-data",
                title: "Defining Data",
                duration: "25:00",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/1-Introduction/03-defining-data/README.md"
            },
            {
                id: "ds-stats-prob",
                title: "Introduction to Statistics & Probability",
                duration: "45:00",
                youtubeId: "Z5Zy85g4Yjw",
                free: false,
                notesPath: "/Data Science Course/1-Introduction/04-stats-and-probability/README.md"
            }
        ]
    },
    {
        id: "ds-phase-2",
        title: "Phase 2 — Working With Data",
        description: "Introduction to SQL, NoSQL, Python, and data preparation techniques.",
        lessons: [
            {
                id: "ds-relational",
                title: "Working with Relational Data (SQL)",
                duration: "40:00",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/2-Working-With-Data/05-relational-databases/README.md"
            },
            {
                id: "ds-nonrelational",
                title: "Working with NoSQL Data",
                duration: "35:00",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/2-Working-With-Data/06-non-relational/README.md"
            },
            {
                id: "ds-python",
                title: "Working with Python (Pandas)",
                duration: "1h 20m",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/2-Working-With-Data/07-python/README.md"
            },
            {
                id: "ds-prep",
                title: "Data Preparation",
                duration: "50:00",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/2-Working-With-Data/08-data-preparation/README.md"
            }
        ]
    },
    {
        id: "ds-phase-3",
        title: "Phase 3 — Data Visualization",
        description: "Learn how to visualize quantities, distributions, proportions, and relationships.",
        lessons: [
            {
                id: "ds-vis-quant",
                title: "Visualizing Quantities",
                duration: "30:00",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/3-Data-Visualization/09-visualization-quantities/README.md"
            },
            {
                id: "ds-vis-dist",
                title: "Visualizing Distributions of Data",
                duration: "25:00",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/3-Data-Visualization/10-visualization-distributions/README.md"
            },
            {
                id: "ds-vis-prop",
                title: "Visualizing Proportions",
                duration: "20:00",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/3-Data-Visualization/11-visualization-proportions/README.md"
            },
            {
                id: "ds-vis-rel",
                title: "Visualizing Relationships",
                duration: "35:00",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/3-Data-Visualization/12-visualization-relationships/README.md"
            },
            {
                id: "ds-vis-meaning",
                title: "Meaningful Visualizations",
                duration: "40:00",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/3-Data-Visualization/13-meaningful-visualizations/README.md"
            }
        ]
    },
    {
        id: "ds-phase-4",
        title: "Phase 4 — Real-World Application",
        description: "The data science lifecycle, cloud deployment, and real-world scenarios.",
        lessons: [
            {
                id: "ds-lifecycle",
                title: "Introduction to Lifecycle & Analyzing",
                duration: "1h 10m",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/4-Data-Science-Lifecycle/README.md"
            },
            {
                id: "ds-cloud",
                title: "Data Science in the Cloud",
                duration: "1h 45m",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/5-Data-Science-In-Cloud/README.md"
            },
            {
                id: "ds-wild",
                title: "Data Science in the Wild",
                duration: "40:00",
                youtubeId: "", // Placeholder removed
                free: false,
                notesPath: "/Data Science Course/6-Data-Science-In-Wild/README.md"
            }
        ]
    }
];
