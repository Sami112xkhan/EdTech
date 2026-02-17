import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    googleId: text("google_id").unique().notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    picture: text("picture"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at").defaultNow().notNull(),
    role: text("role").default("student").notNull(), // 'student' or 'admin'
});

export const sessions = pgTable("sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    loginTime: timestamp("login_time").defaultNow().notNull(),
    logoutTime: timestamp("logout_time"),
    isActive: boolean("is_active").default(true).notNull(),
    lastHeartbeat: timestamp("last_heartbeat").defaultNow().notNull(),
});
