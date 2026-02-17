import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { db } from "./db";
import { users, sessions } from "./db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

// Auth Sync Hook
app.post("/api/auth/google", async (req, res) => {
    const { credential } = req.body;

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.VITE_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.sub) {
            return res.status(400).json({ error: "Invalid token" });
        }

        const { sub: googleId, email, name, picture } = payload;

        // 1. Sync User
        let [user] = await db.select().from(users).where(eq(users.googleId, googleId));

        if (!user) {
            [user] = await db.insert(users).values({
                googleId,
                email: email!,
                name: name!,
                picture,
                role: email === "admin@devmastery.com" ? "admin" : "student", // Simple admin check
            }).returning();
        } else {
            [user] = await db.update(users)
                .set({ lastLoginAt: new Date(), name, picture })
                .where(eq(users.googleId, googleId))
                .returning();
        }

        // 2. Start Session
        // Deactivate previous active sessions for this user
        await db.update(sessions)
            .set({ isActive: false, logoutTime: new Date() })
            .where(and(eq(sessions.userId, user.id), eq(sessions.isActive, true)));

        const [session] = await db.insert(sessions).values({
            userId: user.id,
            isActive: true,
        }).returning();

        res.json({ user, sessionId: session.id });
    } catch (error) {
        console.error("Auth sync error:", error);
        res.status(500).json({ error: "Failed to sync auth" });
    }
});

// Logout Hook
app.post("/api/auth/logout", async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "Session ID required" });

    try {
        await db.update(sessions)
            .set({ isActive: false, logoutTime: new Date() })
            .where(eq(sessions.id, sessionId));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to logout" });
    }
});

// Heartbeat (to keep session active)
app.post("/api/auth/heartbeat", async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "Session ID required" });

    try {
        await db.update(sessions)
            .set({ lastHeartbeat: new Date() })
            .where(eq(sessions.id, sessionId));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Heartbeat failed" });
    }
});

// Admin Stats
app.get("/api/admin/stats", async (req, res) => {
    try {
        // Total Users
        const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);

        // Active Users (Heartbeat in last 5 mins or isActive is true)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeUsers = await db.select({ count: sql<number>`count(distinct user_id)` })
            .from(sessions)
            .where(and(eq(sessions.isActive, true), gte(sessions.lastHeartbeat, fiveMinsAgo)));

        // New Registered Today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const newToday = await db.select({ count: sql<number>`count(*)` })
            .from(users)
            .where(gte(users.createdAt, todayStart));

        // Recent Logins
        const recentLogins = await db.select({
            name: users.name,
            email: users.email,
            loginTime: sessions.loginTime,
        })
            .from(sessions)
            .innerJoin(users, eq(sessions.userId, users.id))
            .orderBy(sql`${sessions.loginTime} DESC`)
            .limit(10);

        res.json({
            totalUsers: Number(totalUsers[0].count),
            activeUsers: Number(activeUsers[0].count),
            newToday: Number(newToday[0].count),
            recentLogins,
        });
    } catch (error) {
        console.error("Stats fetch error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

app.listen(port, () => {
    console.log(`🚀 Backend running at http://localhost:${port}`);
});
