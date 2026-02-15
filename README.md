# 🚀 DevMastery Academy - EdTech Platform

![DevMastery Academy](https://via.placeholder.com/1280x720.png?text=DevMastery+Academy)

A modern, high-performance, and visually stunning EdTech platform designed for the next generation of developers. Built with React, TypeScript, and Tailwind CSS, featuring a premium glassmorphic UI and seamless animations.

## ✨ Features

### 🎨 Premium UI/UX
- **Glassmorphism Design System**: Custom `GlassSurface` components with SVG-filter based blurring and noise textures.
- **Advanced Animations**: Powered by `Framer Motion` for smooth transitions, scroll reveal effects, and micro-interactions.
- **3D Hero Effects**: Custom `LaserFlow` background animation for an immersive landing page experience.
- **Fluid Navigation**: Sticky, pill-shaped glass navbar with active state tracking and mobile responsiveness.

### 📚 Comprehensive Learning Environment
- **Interactive Curriculum**: Accordion-style lesson breakdown with progress tracking.
- **Course Player**: Distraction-free video player with integrated notes system and "Mark as Complete" functionality.
- **Project Portfolio**: dedicate section to showcase real-world projects built during the course.
- **Dashboard**: Centralized hub for users to track progress, access courses, and manage settings.

### 🤖 AI Assistant Integration
- **Smart Mentor**: Integrated AI chat interface for instant doubt resolution and coding assistance.
- **Context-Aware**: Designed to provide help specific to the current lesson or project.

### 🛠️ Robust Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React (Icons)
- **Animation**: Framer Motion, Lenis (Smooth Scroll)
- **Routing**: React Router v7
- **State Management**: React Context API (`AuthContext`)

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
├── context/        # Global state (AuthContext)
├── data/           # Static data (curriculum, projects)
├── layouts/        # Page layouts (RootLayout, DashboardLayout)
├── pages/          # Application pages (Landing, Dashboard, CoursePlayer)
└── index.css       # Global styles and Tailwind directives
```

## 🛡️ Admin Features

- **User Management**: View and manage registered users.
- **Access Control**: Grant or revoke premium access via admin dashboard.
- **Coupon System**: Track usage of special access codes (e.g., `AIFNNC9`).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.