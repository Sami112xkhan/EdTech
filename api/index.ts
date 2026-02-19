import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { db } from "../server/db";
import { users, sessions, feedback as feedbackTable, accessCodes, userNotes, playgroundProjects, aiChats } from "../server/db/schema";
import { eq, and, gte, sql, desc, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
                role: email === "admin@devmastery.com" || email === "sami112xxkhan@gmail.com" ? "admin" : "student",
            }).returning();
        } else {
            // Check if name or picture changed in Google (sync back)
            [user] = await db.update(users)
                .set({
                    lastLoginAt: new Date(),
                    name: name || user.name,
                    picture: picture || user.picture
                })
                .where(eq(users.googleId, googleId))
                .returning();
        }

        // 2. Start Session
        await db.update(sessions)
            .set({ isActive: false })
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

// Session Validation Hook (NEW)
app.get("/api/auth/me", async (req, res) => {
    const sessionId = req.headers.authorization?.split(" ")[1];
    if (!sessionId) return res.status(401).json({ error: "No session token" });

    try {
        const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
        if (!session) return res.status(401).json({ error: "Invalid session" });

        const [user] = await db.select().from(users).where(eq(users.id, session.userId));
        if (!user) return res.status(401).json({ error: "User not found" });

        if (user.status !== 'active') return res.status(403).json({ error: "Account inactive" });

        // Update last heartbeat
        await db.update(sessions).set({ lastHeartbeat: new Date() }).where(eq(sessions.id, sessionId));

        res.json({ user, sessionId: session.id });
    } catch (error) {
        console.error("Auth me error:", error);
        res.status(500).json({ error: "Auth check failed" });
    }
});

// Email Signup Hook
app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "Missing required fields" });

    try {
        const existingUsers = await db.select().from(users).where(eq(users.email, email));
        if (existingUsers.length > 0) return res.status(400).json({ error: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const [newUser] = await db.insert(users).values({
            email,
            password: hashedPassword,
            name,
            role: "student",
            verificationCode,
            isVerified: false,
            googleId: null, // Explicitly null for email users
        }).returning();

        // Used by frontend to send email
        res.json({ user: newUser, verificationCode });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Signup failed" });
    }
});

// Email Login Hook
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email));

        if (!user) return res.status(400).json({ error: "User not found" });

        // If user exists but has no password (Google auth only), block email login
        if (!user.password) return res.status(400).json({ error: "Please login with Google" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

        // Update Login Stats
        const today = new Date();
        await db.update(users).set({ lastLoginAt: today }).where(eq(users.id, user.id));

        // Create Session
        await db.update(sessions)
            .set({ isActive: false })
            .where(and(eq(sessions.userId, user.id), eq(sessions.isActive, true)));

        const [session] = await db.insert(sessions).values({
            userId: user.id,
            isActive: true,
        }).returning();

        res.json({ user, sessionId: session.id, isPaid: user.isPaid });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// Email Verify Hook
app.post("/api/auth/verify", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "Missing parameters" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.isVerified) return res.json({ success: true, message: "Already verified", user });

        if (user.verificationCode !== code) return res.status(400).json({ error: "Invalid code" });

        // Update User
        const [updatedUser] = await db.update(users)
            .set({ isVerified: true, verificationCode: null, lastLoginAt: new Date() })
            .where(eq(users.id, user.id))
            .returning();

        // Create Session
        await db.update(sessions)
            .set({ isActive: false })
            .where(and(eq(sessions.userId, user.id), eq(sessions.isActive, true)));

        const [session] = await db.insert(sessions).values({
            userId: user.id,
            isActive: true,
        }).returning();

        res.json({ success: true, user: updatedUser, sessionId: session.id });
    } catch (error) {
        console.error("Verify error:", error);
        res.status(500).json({ error: "Verification failed" });
    }
});



// Resend Verification Code Hook
app.post("/api/auth/resend", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.isVerified) return res.status(400).json({ error: "User already verified" });

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();

        await db.update(users)
            .set({ verificationCode: newCode })
            .where(eq(users.id, user.id));

        res.json({ success: true, verificationCode: newCode });
    } catch (error) {
        console.error("Resend error:", error);
        res.status(500).json({ error: "Failed to resend code" });
    }
});

// Update Profile Hook
app.post("/api/auth/profile", async (req, res) => {
    const { email, name, username, streak, xp, level } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const [updatedUser] = await db.update(users)
            .set({
                name,
                username,
                streak: streak !== undefined ? streak : undefined,
                xp: xp !== undefined ? xp : undefined,
                level: level !== undefined ? level : undefined
            })
            .where(eq(users.email, email))
            .returning();
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// Lesson Completion Hook
app.post("/api/progress/lesson", async (req, res) => {
    const { email, lessonId } = req.body;
    if (!email || !lessonId) return res.status(400).json({ error: "Email and Lesson ID required" });

    try {
        // Fetch current lessons
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return res.status(404).json({ error: "User not found" });

        const completedLessons = user.completedLessons || [];
        if (!completedLessons.includes(lessonId)) {
            const updatedLessons = [...completedLessons, lessonId];
            const [updatedUser] = await db.update(users)
                .set({ completedLessons: updatedLessons })
                .where(eq(users.email, email))
                .returning();
            return res.json({ success: true, lessons: updatedUser.completedLessons });
        }
        res.json({ success: true, lessons: completedLessons, message: "Already completed" });
    } catch (error) {
        console.error("Progress update error:", error);
        res.status(500).json({ error: "Failed to update progress" });
    }
});

// Logout Hook
app.post("/api/auth/logout", async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "Session ID required" });

    try {
        await db.update(sessions)
            .set({ isActive: false })
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
            loginTime: sessions.createdAt,
        })
            .from(sessions)
            .innerJoin(users, eq(sessions.userId, users.id))
            .orderBy(sql`${sessions.createdAt} DESC`)
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

// ── Admin User Management ──────────────────────────────────────────────

// List all users with online status
app.get("/api/admin/users", async (req, res) => {
    try {
        const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

        // Get active sessions for online status
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeSessions = await db.select({
            userId: sessions.userId,
            lastHeartbeat: sessions.lastHeartbeat,
        })
            .from(sessions)
            .where(and(eq(sessions.isActive, true), gte(sessions.lastHeartbeat, fiveMinsAgo)));

        const onlineUserIds = new Set(activeSessions.map(s => s.userId));

        // Get last heartbeat for each user (for "last seen")
        const lastSeenMap = new Map<string, Date>();
        const allSessions = await db.select({
            userId: sessions.userId,
            lastHeartbeat: sessions.lastHeartbeat,
        }).from(sessions).orderBy(desc(sessions.lastHeartbeat));

        for (const s of allSessions) {
            if (!lastSeenMap.has(s.userId)) {
                lastSeenMap.set(s.userId, s.lastHeartbeat);
            }
        }

        const usersWithStatus = allUsers.map(u => ({
            ...u,
            isOnline: onlineUserIds.has(u.id),
            lastSeen: lastSeenMap.get(u.id)?.toISOString() || u.lastLoginAt.toISOString(),
        }));

        res.json(usersWithStatus);
    } catch (error) {
        console.error("Admin users fetch error:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Toggle user active/inactive
app.patch("/api/admin/users/:email/status", async (req, res) => {
    const { email } = req.params;
    const { status } = req.body; // 'active' or 'inactive'

    if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'active' or 'inactive'" });
    }

    try {
        const [updated] = await db.update(users)
            .set({ status })
            .where(eq(users.email, email))
            .returning();

        if (!updated) return res.status(404).json({ error: "User not found" });
        res.json(updated);
    } catch (error) {
        console.error("Status update error:", error);
        res.status(500).json({ error: "Failed to update user status" });
    }
});

// Delete user
app.delete("/api/admin/users/:email", async (req, res) => {
    const { email } = req.params;

    try {
        const [userToDelete] = await db.select().from(users).where(eq(users.email, email));
        if (!userToDelete) return res.status(404).json({ error: "User not found" });

        // Delete related sessions first
        await db.delete(sessions).where(eq(sessions.userId, userToDelete.id));
        // Delete the user
        await db.delete(users).where(eq(users.email, email));

        res.json({ success: true });
    } catch (error) {
        console.error("User delete error:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// ── Certificate Management ─────────────────────────────────────────────

// User requests certificate
app.post("/api/certificate/request", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const [updated] = await db.update(users)
            .set({ certificateStatus: "pending" })
            .where(eq(users.email, email))
            .returning();

        if (!updated) return res.status(404).json({ error: "User not found" });
        res.json(updated);
    } catch (error) {
        console.error("Certificate request error:", error);
        res.status(500).json({ error: "Failed to request certificate" });
    }
});

// Admin approves certificate
app.post("/api/admin/certificate/:email/approve", async (req, res) => {
    const { email } = req.params;

    try {
        const [updated] = await db.update(users)
            .set({
                certificateStatus: "approved",
                certificateIssueDate: new Date(),
            })
            .where(eq(users.email, email))
            .returning();

        if (!updated) return res.status(404).json({ error: "User not found" });
        res.json(updated);
    } catch (error) {
        console.error("Certificate approve error:", error);
        res.status(500).json({ error: "Failed to approve certificate" });
    }
});

// Admin rejects certificate
app.post("/api/admin/certificate/:email/reject", async (req, res) => {
    const { email } = req.params;

    try {
        const [updated] = await db.update(users)
            .set({ certificateStatus: "eligible" })
            .where(eq(users.email, email))
            .returning();

        if (!updated) return res.status(404).json({ error: "User not found" });
        res.json(updated);
    } catch (error) {
        console.error("Certificate reject error:", error);
        res.status(500).json({ error: "Failed to reject certificate" });
    }
});

// User Notes Endpoints
app.get("/api/notes/list", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email as string));
        if (!user) return res.status(404).json({ error: "User not found" });

        const notes = await db.select().from(userNotes).where(eq(userNotes.userId, user.id));
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notes" });
    }
});

app.post("/api/notes/save", async (req, res) => {
    const { email, lessonId, content } = req.body;
    if (!email || !lessonId || content === undefined) return res.status(400).json({ error: "Email, Lesson ID and Content required" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return res.status(404).json({ error: "User not found" });

        // Upsert logic
        const [existing] = await db.select().from(userNotes).where(and(eq(userNotes.userId, user.id), eq(userNotes.lessonId, lessonId)));

        if (existing) {
            const [updated] = await db.update(userNotes)
                .set({ content, updatedAt: new Date() })
                .where(eq(userNotes.id, existing.id))
                .returning();
            res.json(updated);
        } else {
            const [inserted] = await db.insert(userNotes).values({
                userId: user.id,
                lessonId,
                content,
            }).returning();
            res.json(inserted);
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to save note" });
    }
});

// Playground Projects Endpoints
app.get("/api/playground/list", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email as string));
        if (!user) return res.status(404).json({ error: "User not found" });

        const projects = await db.select().from(playgroundProjects).where(eq(playgroundProjects.userId, user.id)).orderBy(desc(playgroundProjects.updatedAt));
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

app.post("/api/playground/save", async (req, res) => {
    const { email, name, type, files, projectId } = req.body;
    if (!email || !name || !type || !files) return res.status(400).json({ error: "Missing required fields" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return res.status(404).json({ error: "User not found" });

        if (projectId) {
            const [updated] = await db.update(playgroundProjects)
                .set({ name, type, files, updatedAt: new Date() })
                .where(and(eq(playgroundProjects.id, projectId), eq(playgroundProjects.userId, user.id)))
                .returning();
            res.json(updated);
        } else {
            const [inserted] = await db.insert(playgroundProjects).values({
                userId: user.id,
                name,
                type,
                files,
            }).returning();
            res.json(inserted);
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to save project" });
    }
});

// AI Chat History Endpoints
app.get("/api/ai/chat/history", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email as string));
        if (!user) return res.status(404).json({ error: "User not found" });

        const history = await db.select().from(aiChats).where(eq(aiChats.userId, user.id)).orderBy(aiChats.createdAt);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
});

app.post("/api/ai/chat/save", async (req, res) => {
    const { email, role, content, reasoning } = req.body;
    if (!email || !role || !content) return res.status(400).json({ error: "Missing required fields" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return res.status(404).json({ error: "User not found" });

        const [message] = await db.insert(aiChats).values({
            userId: user.id,
            role,
            content,
            reasoning,
        }).returning();
        res.json(message);
    } catch (error) {
        console.error("Chat save error:", error);
        res.status(500).json({ error: "Failed to save chat message" });
    }
});

app.delete("/api/ai/chat/clear", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return res.status(404).json({ error: "User not found" });

        await db.delete(aiChats).where(eq(aiChats.userId, user.id));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to clear chat history" });
    }
});

// ── Access Codes (Trials) ──────────────────────────────────────────────

// Generate a new access code
app.post("/api/admin/codes/generate", async (req, res) => {
    const { type } = req.body; // '3days' or '5mins'
    if (!type || !['3days', '5mins'].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Must be '3days' or '5mins'" });
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
        const [newCode] = await db.insert(accessCodes).values({
            code,
            type,
        }).returning();
        res.json(newCode);
    } catch (error) {
        console.error("Code generation error:", error);
        res.status(500).json({ error: "Failed to generate code" });
    }
});

// List all access codes
app.get("/api/admin/codes", async (req, res) => {
    try {
        const codes = await db.select().from(accessCodes).orderBy(desc(accessCodes.createdAt));
        res.json(codes);
    } catch (error) {
        console.error("Codes fetch error:", error);
        res.status(500).json({ error: "Failed to fetch codes" });
    }
});

// Revoke a code
app.post("/api/admin/codes/:code/revoke", async (req, res) => {
    const { code } = req.params;

    try {
        const [updated] = await db.update(accessCodes)
            .set({ isRevoked: true })
            .where(eq(accessCodes.code, code))
            .returning();

        if (!updated) return res.status(404).json({ error: "Code not found" });
        res.json(updated);
    } catch (error) {
        console.error("Code revoke error:", error);
        res.status(500).json({ error: "Failed to revoke code" });
    }
});

// Redeem a code (user-facing)
app.post("/api/codes/redeem", async (req, res) => {
    const { code, email } = req.body;
    if (!code || !email) return res.status(400).json({ error: "Code and email required" });

    const normalizedCode = code.toUpperCase().trim();

    try {
        // Check if it's a valid, unused, non-revoked code
        const [accessCode] = await db.select().from(accessCodes)
            .where(and(
                eq(accessCodes.code, normalizedCode),
                eq(accessCodes.isUsed, false),
                eq(accessCodes.isRevoked, false)
            ));

        if (!accessCode) {
            return res.status(400).json({ error: "Invalid, used, or revoked code" });
        }

        // Calculate expiry based on type
        const now = new Date();
        const duration = accessCode.type === '3days' ? (3 * 24 * 60 * 60 * 1000) : (5 * 60 * 1000);
        const trialExpiresAt = new Date(now.getTime() + duration).toISOString();

        // Mark code as used
        await db.update(accessCodes)
            .set({ isUsed: true, usedBy: email, usedAt: now })
            .where(eq(accessCodes.id, accessCode.id));

        // Update user trial access
        const [updatedUser] = await db.update(users)
            .set({ isPaid: false }) // trial access, not paid
            .where(eq(users.email, email))
            .returning();

        res.json({
            success: true,
            trialExpiresAt,
            message: `Access granted for ${accessCode.type === '3days' ? '3 days' : '5 minutes'}`,
            user: updatedUser
        });
    } catch (error) {
        console.error("Code redeem error:", error);
        res.status(500).json({ error: "Failed to redeem code" });
    }
});

export default app;
