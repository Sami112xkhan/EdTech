import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    googleId: text("google_id").unique(), // Nullable for email auth
    email: text("email").notNull(),
    password: text("password"), // Hashed password
    name: text("name").notNull(),
    username: text("username"),
    picture: text("picture"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at").defaultNow().notNull(),
    role: text("role").default("student").notNull(), // 'student' or 'admin'
    purchasedCourses: text("purchased_courses").array().default(sql`'{}'`).notNull(),
    completedLessons: text("completed_lessons").array().default(sql`'{}'`).notNull(),
    streak: integer("streak").default(0).notNull(),
    xp: integer("xp").default(0).notNull(),
    level: integer("level").default(1).notNull(),
    status: text("status").default("active").notNull(), // 'active' or 'inactive'
    isVerified: boolean("is_verified").default(false).notNull(),
    verificationCode: text("verification_code"),
    trialExpiresAt: timestamp("trial_expires_at"),
    certificateStatus: text("certificate_status").default("locked").notNull(), // 'locked','eligible','pending','approved'
    certificateIssueDate: timestamp("certificate_issue_date"),
    emailNotifs: boolean("email_notifs").default(true).notNull(),
    pushNotifs: boolean("push_notifs").default(true).notNull(),
    courseUpdates: boolean("course_updates").default(true).notNull(),
    soundEffects: boolean("sound_effects").default(true).notNull(),
    profileVisibility: text("profile_visibility").default("public").notNull(),
    showProgress: boolean("show_progress").default(true).notNull(),
    showStreak: boolean("show_streak").default(true).notNull(),
});

export const sessions = pgTable("sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    sessionToken: text("session_token"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").default(true).notNull(),
    lastHeartbeat: timestamp("last_heartbeat").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    deviceInfo: text("device_info"),
});

export const feedback = pgTable("feedback", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    content: text("content").notNull(),
    type: text("type").default("feedback").notNull(), // 'feedback' or 'access_request'
    status: text("status").default("pending").notNull(),
    reply: text("reply"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accessCodes = pgTable("access_codes", {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").unique().notNull(),
    type: text("type").notNull(), // '3days', '5mins', or 'lifetime'
    isUsed: boolean("is_used").default(false).notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    usedBy: text("used_by"),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
});

export const userNotes = pgTable("user_notes", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    lessonId: text("lesson_id").notNull(),
    content: text("content").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const playgroundProjects = pgTable("playground_projects", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'react', 'nodejs', 'htmlcss'
    files: text("files").notNull(), // JSON string
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiChats = pgTable("ai_chats", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    role: text("role").notNull(), // 'user', 'assistant'
    content: text("content").notNull(),
    reasoning: text("reasoning"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
});

export const activityLogs = pgTable("activity_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    type: text("type").notNull(), // 'NAVIGATE', 'CLICK', 'ACTION'
    description: text("description"),
    path: text("path"),
    metadata: text("metadata"), // JSON string
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
