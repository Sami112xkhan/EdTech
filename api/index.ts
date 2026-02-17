import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { db } from "../server/db";
import { users, sessions, feedback as feedbackTable } from "../server/db/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";

dotenv.config();

const app = express();
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
                role: email === "admin@devmastery.com" ? "admin" : "student",
            }).returning();
        } else {
            [user] = await db.update(users)
                .set({ lastLoginAt: new Date(), name, picture })
                .where(eq(users.googleId, googleId))
                .returning();
        }

        // 2. Start Session
        await db.update(sessions)
            .set({ isActive: false, logoutTime: new Date() })
            .where(and(eq(sessions.userId, user.id), eq(sessions.isActive, true)));

        const [session] = await db.insert(sessions).values({
            userId: user.id,
            isActive: true,
        }).returning();

        res.json({ user, sessionId: session.id, isPaid: user.isPaid });
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

// Purchase Sync Hook
app.post("/api/auth/purchase", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const [user] = await db.update(users)
            .set({ isPaid: true })
            .where(eq(users.email, email))
            .returning();
        res.json({ success: true, user });
    } catch (error) {
        console.error("Purchase sync error:", error);
        res.status(500).json({ error: "Failed to sync purchase" });
    }
});

// Heartbeat
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

// Feedback Endpoints
app.get("/api/feedback", async (req, res) => {
    try {
        const items = await db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt));
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch feedback" });
    }
});

app.post("/api/feedback", async (req, res) => {
    const { userId, userName, content, type } = req.body;
    try {
        const [item] = await db.insert(feedbackTable).values({
            userId,
            userName,
            content,
            type: type || "feedback",
        }).returning();
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: "Failed to add feedback" });
    }
});

app.patch("/api/feedback/:id", async (req, res) => {
    const { id } = req.params;
    const { status, reply } = req.body;
    try {
        const [item] = await db.update(feedbackTable)
            .set({ status, reply })
            .where(eq(feedbackTable.id, id as any))
            .returning();
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: "Failed to update feedback" });
    }
});

app.delete("/api/feedback/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.delete(feedbackTable).where(eq(feedbackTable.id, id as any));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete feedback" });
    }
});

// Admin Stats
app.get("/api/admin/stats", async (req, res) => {
    try {
        const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
        const proMembers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isPaid, true));
        // Active Users (Heartbeat in last 5 mins or isActive is true)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeUsersCount = await db.select({ count: sql<number>`count(distinct user_id)` })
            .from(sessions)
            .where(and(eq(sessions.isActive, true), gte(sessions.lastHeartbeat, fiveMinsAgo)));

        // New Feedback Pending Today
        const pendingFeedbackCount = await db.select({ count: sql<number>`count(*)` })
            .from(feedbackTable)
            .where(eq(feedbackTable.status, "pending"));

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const newToday = await db.select({ count: sql<number>`count(*)` })
            .from(users)
            .where(gte(users.createdAt, todayStart));

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
            proMembers: Number(proMembers[0].count),
            activeUsers: Number(activeUsersCount[0].count),
            newToday: Number(newToday[0].count),
            pendingFeedback: Number(pendingFeedbackCount[0].count),
            recentLogins,
        });
    } catch (error) {
        console.error("Stats fetch error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

export default app;
