# 🚀 DevMastery Academy - EdTech Platform

![DevMastery Academy](https://via.placeholder.com/1280x720.png?text=DevMastery+Academy)

A modern, high-performance, and visually stunning EdTech platform designed for the next generation of developers. Built with React, TypeScript, and Tailwind CSS, featuring a premium glassmorphic UI and seamless animations.

## ✨ Latest Features

### 🎓 Multi-Course Ecosystem
- **Tri-Domain Curriculum**: Seamlessly switch between **Full Stack Development**, **Cybersecurity**, and **Data Science**.
- **Course-Specific Ownership**: Purchase or Trial access is now scoped to specific courses. A user on a Cybersecurity trial only sees Cybersecurity content—locked domains stay locked until purchased.
- **Interactive Roadmap**: A high-fidelity, motion-driven curriculum view for each domain with progress tracking.

### 🔑 Advanced Trial & Access System
- **Admin Code Progenitor**: Generate unique 8-character codes for specialized trial durations (3-day, 5-minute, etc.).
- **Live Trial Timer**: A persistent, real-time countdown banner that locks the dashboard instantly upon expiry to prevent unauthorized access.
- **Course-Aware Redemption**: Access codes are now linked to specific courses, automatically activating the correct curriculum upon use.

### 🖥️ Persistent SQL Backend
- **Database Architecture**: Migrated from local mocks to a **PostgreSQL** database managed by **Drizzle ORM**.
- **Unified Session Sync**: Real-time heartbeat system ensures user sessions, trial timers, and progress are synced across multiple devices.

### 🛡️ Enhanced Admin Control Center
- **System Command Terminal**: A custom-designed dashboard for real-time monitoring of user activity and platform health.
- **Granular User Stats**: Track membership types (PRO vs. TRIAL), active courses, XP levels, and engagement streaks.
- **Suspension & Appeals**: Robust account management with instant revocation and integrated user appeals workflow.

### 📝 Strategic Learning Resources
- **Integrated Note Viewer**: Searchable, PDF-backed course notes available directly in the learning interface.
- **Centralized Library**: Browse and search all unlocked materials from one dedicated view.


## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React (Icons)
- **Animation**: Framer Motion, Lenis (Smooth Scroll)
- **Routing**: React Router v7
- **State Management**: React Context API (`AuthContext`, `FeedbackContext`)
- **Persistence**: Enhanced LocalStorage-based DB logic for demo environments.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Sami112xkhan/EdTech.git
    cd EdTech
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

4.  **Build for production**
    ```bash
    npm run build
    ```

## 📂 Project Structure

```
src/
├── components/     # Reusable UI components (Navbar, Hero, GlassSurface, etc.)
├── context/        # Global state (Auth, Feedback, Course)
├── data/           # Static data (curriculum, roadmap)
├── layouts/        # Shared layouts (DashboardLayout, Root)
├── pages/          # Main application views (Admin, Dashboard, Learn)
└── index.css       # Core design tokens and global styles
```

## 🛡️ Admin Access
Access the **Admin Panel** by logging in with an account assigned the `admin` role. The panel allows for managing users, feedback, and generating trial keys.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.