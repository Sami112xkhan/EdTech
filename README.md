# 🚀 DevMastery Academy - EdTech Platform

![DevMastery Academy](https://via.placeholder.com/1280x720.png?text=DevMastery+Academy)

A modern, high-performance, and visually stunning EdTech platform designed for the next generation of developers. Built with React, TypeScript, and Tailwind CSS, featuring a premium glassmorphic UI and seamless animations.

## ✨ Latest Features

### 🔑 Trial Access System
- **Access Progenitor**: Admin-controlled generation of unique 8-character codes for **3-day** or **5-minute** trials.
- **Live Sync**: Real-time countdown banner in the dashboard tracking remaining trial duration.
- **Auto-Locking**: Automatic session termination and redirection to purchase once trial expires.

### 📝 Integrated Course Notes
- **Contextual Viewer**: PDF course notes integrated directly into the video player sidebar.
- **Notes Library**: A centralized, searchable repository for all course materials and cheat sheets.
- **Global Search**: Find any material across the entire curriculum instantly.

### 🛡️ Premium Admin Control Center
- **System Command Aesthetic**: A custom, high-end "system-command" UI with motion-driven transitions.
- **Real-time Analytics**: Instant statistics for Total Members, PRO subscribers, Active Trials, and Pending Feedback.
- **Membership Management**: Full control over user status, trial activation, and account deletion.

### 🗣️ Transparency Program (Feedback)
- **Voice of User**: Enhanced feedback system where users can submit proposals for new features.
- **Status Tracking**: Users can monitor their submissions' progress (Under Review, Reviewed, Implemented) in real-time.

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