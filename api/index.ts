import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { db } from "../server/db/index.js";
import { users, sessions, feedback as feedbackTable, accessCodes, userNotes, playgroundProjects, aiChats, systemSettings, activityLogs, courses, modules, lessons } from "../server/db/schema.js";
import { eq, and, gte, sql, desc, ne, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Initialize hardcoded legacy codes into the database so they are tracked
async function initStaticCodes() {
    try {
        const [existingCode] = await db.select().from(accessCodes).where(eq(accessCodes.code, 'LIFETIME100'));
        if (!existingCode) {
            await db.insert(accessCodes).values({
                code: 'LIFETIME100',
                type: 'lifetime'
            });
            console.log("Seeded legacy LIFETIME100 code into database for tracking.");
        }
    } catch (error) {
        console.error("Failed to seed static codes:", error);
    }
}
initStaticCodes();

const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'https://devmastery.space'],
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(helmet());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth Sync Hook
app.post("/api/auth/google", authLimiter, async (req, res) => {
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

        res.json({ user, sessionId: session.id, isPaid: (user.purchasedCourses || []).length > 0 });
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

        // Map admin user to match frontend expectations
        const mappedUser = user.email === 'admin@devmastery.com' ? {
            ...user,
            role: 'admin',
            purchasedCourses: (user.purchasedCourses && user.purchasedCourses.length > 0)
                ? user.purchasedCourses
                : ['fullstack', 'cyber', 'datascience', 'cloudcomputing'],
            completedLessons: user.completedLessons || [],
            trialExpiresAt: undefined, // Admin never has trial restrictions
        } : user;

        res.json({ user: mappedUser, sessionId: session.id });
    } catch (error) {
        console.error("Auth me error:", error);
        res.status(500).json({ error: "Auth check failed" });
    }
});

// Global Settings Hook (NEW)
app.get("/api/settings", async (req, res) => {
    try {
        let [deadlineSetting] = await db.select().from(systemSettings).where(eq(systemSettings.key, "discount_deadline"));

        if (!deadlineSetting) {
            // Initialize deadline to 5 hours from now if not present
            const deadline = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
            [deadlineSetting] = await db.insert(systemSettings).values({
                key: "discount_deadline",
                value: deadline
            }).returning();
        } else {
            // Check if deadline is passed, if so, maybe we reset it? 
            // OR just let it be passed (as per user request "equal for all users"). 
            // If the goal is a "countdown", usually it's a fixed event.
            // If it's a "scarcity" tactic that resets, we'd need logic here.
            // User said: "make it five hours... equal for all users". 
            // I'll assume it's a one-time global deadline for the "launch" or whatever context.
            // If I want to ensure it's always valid for *new* deployments, I might want to check if it's super old.
            // But for now, simple retrieval is safest to ensure synchronization.

            // However, if the server restarts or DB is fresh, it creates a new 5h deadline.
        }

        res.json({ discountDeadline: deadlineSetting.value });
    } catch (error) {
        console.error("Settings fetch error:", error);
        res.status(500).json({ error: "Failed to fetch settings" });
    }
});

// Email Signup Hook
app.post("/api/auth/signup", authLimiter, async (req, res) => {
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

        // Verification code returned for EmailJS client-side email sending
        // TODO: Move email sending server-side and remove code from response
        res.json({ user: newUser, verificationCode });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Signup failed" });
    }
});

// Email Login Hook
app.post("/api/auth/login", authLimiter, async (req, res) => {
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

        res.json({ user, sessionId: session.id, isPaid: (user.purchasedCourses || []).length > 0 });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// Admin Session Creation (for hardcoded admin login)
app.post("/api/auth/admin-session", authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    if (email !== 'admin@devmastery.com') return res.status(403).json({ error: "Not authorized" });

    try {
        let [adminUser] = await db.select().from(users).where(eq(users.email, email));
        if (!adminUser) {
            // Create admin user in DB if not exists
            [adminUser] = await db.insert(users).values({
                email,
                name: 'Administrator',
                role: 'admin',
                isVerified: true,
                status: 'active',
                googleId: 'hardcoded-admin',
                purchasedCourses: ['fullstack', 'cyber', 'datascience', 'cloudcomputing'],
            }).returning();
        } else {
            // Ensure existing admin user has correct role and courses
            const needsUpdate = adminUser.role !== 'admin' || !adminUser.purchasedCourses || adminUser.purchasedCourses.length === 0;
            if (needsUpdate) {
                [adminUser] = await db.update(users).set({
                    role: 'admin',
                    purchasedCourses: (adminUser.purchasedCourses && adminUser.purchasedCourses.length > 0)
                        ? adminUser.purchasedCourses
                        : ['fullstack', 'cyber', 'datascience', 'cloudcomputing'],
                }).where(eq(users.id, adminUser.id)).returning();
            }
        }

        // Create session
        await db.update(sessions)
            .set({ isActive: false })
            .where(and(eq(sessions.userId, adminUser.id), eq(sessions.isActive, true)));

        const [session] = await db.insert(sessions).values({
            userId: adminUser.id,
            isActive: true,
        }).returning();

        // Map DB user to match frontend User type (admin always gets all courses)
        const mappedUser = {
            ...adminUser,
            username: adminUser.username || 'admin',
            role: 'admin',
            purchasedCourses: (adminUser.purchasedCourses && adminUser.purchasedCourses.length > 0)
                ? adminUser.purchasedCourses
                : ['fullstack', 'cyber', 'datascience', 'cloudcomputing'],
            completedLessons: adminUser.completedLessons || [],
            trialExpiresAt: undefined, // Admin never has trial restrictions
            lastLogin: adminUser.lastLoginAt?.toISOString?.() || new Date().toISOString(),
            photoURL: adminUser.picture || undefined,
        };

        res.json({ user: mappedUser, sessionId: session.id });
    } catch (error) {
        console.error("Admin session error:", error);
        res.status(500).json({ error: "Failed to create admin session" });
    }
});

// Email Verify Hook
app.post("/api/auth/verify", authLimiter, async (req, res) => {
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
app.post("/api/auth/resend", authLimiter, async (req, res) => {
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
    const {
        email, name, username, streak, xp, level,
        emailNotifs, pushNotifs, courseUpdates, soundEffects,
        profileVisibility, showProgress, showStreak
    } = req.body;

    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const [updatedUser] = await db.update(users)
            .set({
                name,
                username,
                streak: streak !== undefined ? streak : undefined,
                xp: xp !== undefined ? xp : undefined,
                level: level !== undefined ? level : undefined,
                emailNotifs: emailNotifs !== undefined ? emailNotifs : undefined,
                pushNotifs: pushNotifs !== undefined ? pushNotifs : undefined,
                courseUpdates: courseUpdates !== undefined ? courseUpdates : undefined,
                soundEffects: soundEffects !== undefined ? soundEffects : undefined,
                profileVisibility: profileVisibility !== undefined ? profileVisibility : undefined,
                showProgress: showProgress !== undefined ? showProgress : undefined,
                showStreak: showStreak !== undefined ? showStreak : undefined,
            })
            .where(eq(users.email, email))
            .returning();
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// Lesson Completion Hook — server-side ownership validated
app.post("/api/progress/lesson", async (req, res) => {
    const { email, lessonId } = req.body;
    if (!email || !lessonId) return res.status(400).json({ error: "Email and Lesson ID required" });

    try {
        // Verify session belongs to this user
        const authHeader = req.headers.authorization || '';
        const sessionId = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        if (!sessionId) return res.status(401).json({ error: "Authentication required" });
        const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
        if (!session) return res.status(401).json({ error: "Invalid session" });
        const [sessionUser] = await db.select().from(users).where(eq(users.id, session.userId));
        if (!sessionUser || sessionUser.email !== email) return res.status(403).json({ error: "Cannot update another user's progress" });

        // Fetch current user
        let [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return res.status(404).json({ error: "User not found" });

        // Server-side ownership check: verify lesson belongs to a purchased course
        if (user.role !== 'admin') {
            const [lessonRow] = await db.select().from(lessons).where(eq(lessons.slug, lessonId));
            if (!lessonRow) return res.status(404).json({ error: "Lesson not found" });
            const [moduleRow] = await db.select().from(modules).where(eq(modules.id, lessonRow.moduleId));
            if (!moduleRow) return res.status(404).json({ error: "Module not found" });
            const [courseRow] = await db.select().from(courses).where(eq(courses.id, moduleRow.courseId));
            if (!courseRow) return res.status(404).json({ error: "Course not found" });
            if (!user.purchasedCourses?.includes(courseRow.slug)) {
                return res.status(403).json({ error: "You have not purchased this course" });
            }
        }

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
    const { email, courseId } = req.body;
    if (!email || !courseId) return res.status(400).json({ error: "Email and courseId required" });

    try {
        // Verify session belongs to this user
        const authHeader = req.headers.authorization || '';
        const sessionId = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        if (!sessionId) return res.status(401).json({ error: "Authentication required" });
        const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
        if (!session) return res.status(401).json({ error: "Invalid session" });
        const [sessionUser] = await db.select().from(users).where(eq(users.id, session.userId));
        if (!sessionUser || sessionUser.email !== email) return res.status(403).json({ error: "Cannot purchase for another user" });

        const [existingUser] = await db.select().from(users).where(eq(users.email, email));
        if (!existingUser) return res.status(404).json({ error: "User not found" });

        const currentCourses = existingUser.purchasedCourses || [];

        // Determine which courses to grant
        let coursesToGrant: string[] = [];
        if (courseId === 'fullstack') {
            // Full Stack + AI Bundle: grant both
            coursesToGrant = ['fullstack', 'ai'];
        } else if (courseId === 'ai_upgrade') {
            // Upgrade: grant just the AI course
            coursesToGrant = ['ai'];
        } else if (courseId) {
            coursesToGrant = [courseId];
        }

        for (const c of coursesToGrant) {
            if (!currentCourses.includes(c)) {
                currentCourses.push(c);
            }
        }

        const [user] = await db.update(users)
            .set({ purchasedCourses: currentCourses })
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
        const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
        if (!session) return res.status(401).json({ error: "Invalid session" });

        const [user] = await db.select().from(users).where(eq(users.id, session.userId));
        if (!user) return res.status(401).json({ error: "User not found" });

        if (user.status !== 'active') {
            return res.status(403).json({ error: "Account inactive" });
        }

        await db.update(sessions)
            .set({ lastHeartbeat: new Date() })
            .where(eq(sessions.id, sessionId));

        // Map admin user to match frontend expectations
        const mappedUser = user.email === 'admin@devmastery.com' ? {
            ...user,
            role: 'admin',
            purchasedCourses: (user.purchasedCourses && user.purchasedCourses.length > 0)
                ? user.purchasedCourses
                : ['fullstack', 'cyber', 'datascience', 'cloudcomputing'],
            completedLessons: user.completedLessons || [],
            trialExpiresAt: undefined, // Admin never has trial restrictions
        } : user;

        res.json({ success: true, user: mappedUser });
    } catch (error) {
        console.error("Heartbeat error:", error);
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

// Global Settings (Public)
app.get("/api/settings/offer", async (req, res) => {
    try {
        const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'bundle_offer_active'));
        const isActive = setting ? setting.value === 'true' : true;
        console.log(`[API] Fetching offer state: ${isActive} (from DB: ${setting?.value})`);
        res.json({ isActive });
    } catch (error) {
        console.error("[API] Failed to fetch settings", error);
        res.status(500).json({ error: "Failed to fetch settings" });
    }
});

// Admin Update Settings
// Admin middleware helper
const requireAdmin = async (req: any, res: any, next: any) => {
    try {
        const authHeader = req.headers.authorization || '';
        const sessionId = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        if (!sessionId || sessionId.length < 10) return res.status(401).json({ error: 'No session' });
        const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
        if (!session) return res.status(401).json({ error: 'Invalid session' });
        const [user] = await db.select().from(users).where(eq(users.id, session.userId));
        if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        req.adminUser = user;
        next();
    } catch (error) {
        console.error('[requireAdmin] Middleware error:', error);
        res.status(500).json({ error: 'Admin auth failed' });
    }
};

app.post("/api/admin/settings/offer", requireAdmin, async (req, res) => {
    const { isActive } = req.body;
    console.log(`[API] Toggling offer to: ${isActive}`);
    try {
        // Upsert the setting
        const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, 'bundle_offer_active'));
        if (existing.length > 0) {
            await db.update(systemSettings)
                .set({ value: String(isActive) })
                .where(eq(systemSettings.key, 'bundle_offer_active'));
            console.log(`[API] Updated existing setting to ${isActive}`);
        } else {
            await db.insert(systemSettings)
                .values({ key: 'bundle_offer_active', value: String(isActive) });
            console.log(`[API] Inserted new setting as ${isActive}`);
        }
        res.json({ success: true, isActive });
    } catch (error) {
        console.error("[API] Failed to update settings", error);
        res.status(500).json({ error: "Failed to update settings" });
    }
});

// Admin Stats
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
        const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
        const proMembers = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`array_length(${users.purchasedCourses}, 1) > 0`);
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
        console.error("Admin stats error:", error);
        res.status(500).json({
            error: "Failed to fetch admin stats",
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// Telemetry/Tracking
app.post("/api/track", async (req, res) => {
    const { userId, type, description, path, metadata } = req.body;
    if (!userId || !type) return res.status(400).json({ error: "userId and type required" });
    if (userId === 'admin-id') return res.json({ success: true, bypassed: true });

    try {
        await db.insert(activityLogs).values({
            userId,
            type,
            description,
            path,
            metadata: metadata ? JSON.stringify(metadata) : null,
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Tracking error:", error);
        res.status(500).json({ error: "Failed to log activity" });
    }
});

// Admin activity stream
app.get("/api/admin/activity", requireAdmin, async (req, res) => {
    try {
        const logs = await db.select({
            id: activityLogs.id,
            name: users.name,
            email: users.email,
            type: activityLogs.type,
            description: activityLogs.description,
            path: activityLogs.path,
            metadata: activityLogs.metadata,
            createdAt: activityLogs.createdAt,
        })
            .from(activityLogs)
            .innerJoin(users, eq(activityLogs.userId, users.id))
            .orderBy(desc(activityLogs.createdAt))
            .limit(50);
        res.json(logs);
    } catch (error) {
        console.error("Activity stream error:", error);
        res.status(500).json({ error: "Failed to fetch activity logs" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE UPDATE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const NOTIFICATIONS_FILE = path.join(__dirname, '..', 'server', 'notifications.json');

function readNotifications() {
    try {
        if (!fs.existsSync(NOTIFICATIONS_FILE)) return [];
        return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8'));
    } catch { return []; }
}

function writeNotifications(data: any[]) {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2));
}

// Admin: Send a notification
app.post("/api/admin/notifications", requireAdmin, async (req, res) => {
    const { title, message, courseId, targetCourse } = req.body;
    if (!title || !message) return res.status(400).json({ error: "Title and message required" });

    const notification = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title,
        message,
        courseId: courseId || null,         // specific course slug or null for all
        targetCourse: targetCourse || null, // which course's students to target
        sentBy: req.body.adminEmail || 'admin',
        createdAt: new Date().toISOString(),
        readBy: [],
    };

    const notifications = readNotifications();
    notifications.unshift(notification);
    writeNotifications(notifications);

    res.json({ success: true, notification });
});

// Admin: Get all notifications
app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    const notifications = readNotifications();
    res.json(notifications);
});

// Admin: Delete a notification
app.delete("/api/admin/notifications/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const notifications = readNotifications().filter((n: any) => n.id !== id);
    writeNotifications(notifications);
    res.json({ success: true });
});

// User: Get notifications relevant to them (based on purchased courses)
app.get("/api/notifications", async (req, res) => {
    const sessionId = req.headers.authorization?.split(" ")[1];
    if (!sessionId) return res.json([]);

    try {
        const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
        if (!session) return res.json([]);

        const [user] = await db.select().from(users).where(eq(users.id, session.userId));
        if (!user) return res.json([]);

        const notifications = readNotifications();
        const purchased = user.purchasedCourses || [];

        // Filter: show notifications that target all courses or target a course the user owns
        const relevant = notifications.filter((n: any) => {
            if (!n.targetCourse) return true; // broadcast to all
            return purchased.includes(n.targetCourse);
        });

        res.json(relevant.map((n: any) => ({
            ...n,
            read: n.readBy?.includes(user.email) || false,
        })));
    } catch {
        res.json([]);
    }
});

// User: Mark notification as read
app.post("/api/notifications/:id/read", async (req, res) => {
    const sessionId = req.headers.authorization?.split(" ")[1];
    if (!sessionId) return res.status(401).json({ error: "No session" });

    try {
        const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
        if (!session) return res.status(401).json({ error: "Invalid session" });

        const [user] = await db.select().from(users).where(eq(users.id, session.userId));
        if (!user) return res.status(401).json({ error: "User not found" });

        const { id } = req.params;
        const notifications = readNotifications();
        const notification = notifications.find((n: any) => n.id === id);
        if (notification && !notification.readBy?.includes(user.email)) {
            if (!notification.readBy) notification.readBy = [];
            notification.readBy.push(user.email);
            writeNotifications(notifications);
        }
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: "Failed" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════

// Specific user activity history
app.get("/api/admin/users/:userId/activity", requireAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        const logs = await db.select()
            .from(activityLogs)
            .where(eq(activityLogs.userId, userId))
            .orderBy(desc(activityLogs.createdAt))
            .limit(100);
        res.json(logs);
    } catch (error) {
        console.error("User activity error:", error);
        res.status(500).json({ error: "Failed to fetch user history" });
    }
});

// ── Admin User Management ──────────────────────────────────────────────

// List all users with online status
app.get("/api/admin/users", requireAdmin, async (req, res) => {
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
app.patch("/api/admin/users/:email/status", requireAdmin, async (req, res) => {
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

        // If suspended, invalidate all active sessions
        if (status === 'inactive') {
            await db.delete(sessions).where(eq(sessions.userId, updated.id));
        }

        res.json(updated);
    } catch (error) {
        console.error("Status update error:", error);
        res.status(500).json({ error: "Failed to update user status" });
    }
});

// Delete user
app.delete("/api/admin/users/:email", requireAdmin, async (req, res) => {
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
    const { email, courseId } = req.body;
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
app.post("/api/admin/certificate/:email/approve", requireAdmin, async (req, res) => {
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
app.post("/api/admin/certificate/:email/reject", requireAdmin, async (req, res) => {
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
        let [user] = await db.select().from(users).where(eq(users.email, email));

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
        console.error("Save project error:", error);
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
app.post("/api/admin/codes/generate", requireAdmin, async (req, res) => {
    const { type } = req.body; // '3days', '5mins', or 'lifetime'
    if (!type || !['3days', '5mins', 'lifetime'].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Must be '3days', '5mins', or 'lifetime'" });
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
app.get("/api/admin/codes", requireAdmin, async (req, res) => {
    try {
        const codes = await db.select().from(accessCodes).orderBy(desc(accessCodes.createdAt));
        res.json(codes);
    } catch (error) {
        console.error("Codes fetch error:", error);
        res.status(500).json({ error: "Failed to fetch codes" });
    }
});

// Revoke a code
app.post("/api/admin/codes/:code/revoke", requireAdmin, async (req, res) => {
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

// Delete access code
app.delete("/api/admin/codes/:code", requireAdmin, async (req, res) => {
    const { code } = req.params;

    try {
        const [deleted] = await db.delete(accessCodes)
            .where(eq(accessCodes.code, code))
            .returning();

        if (!deleted) return res.status(404).json({ error: "Code not found" });
        res.json({ success: true });
    } catch (error) {
        console.error("Code delete error:", error);
        res.status(500).json({ error: "Failed to delete code" });
    }
});

// Redeem a code (user-facing)
app.post("/api/codes/redeem", async (req, res) => {
    const { code, email, courseId = 'fullstack' } = req.body;
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
        let trialExpiresAt: string | null = null;
        let isPaidFlag = false;

        if (accessCode.type === 'lifetime') {
            isPaidFlag = true;
        } else {
            const duration = accessCode.type === '3days' ? (3 * 24 * 60 * 60 * 1000) : (5 * 60 * 1000);
            trialExpiresAt = new Date(now.getTime() + duration).toISOString();
        }

        // Update user access tier and specific course
        const [existingUser] = await db.select().from(users).where(eq(users.email, email));

        if (!existingUser && email !== 'admin@devmastery.com') {
            return res.status(404).json({ error: "User not found" });
        }

        const currentCourses = existingUser?.purchasedCourses || [];
        if (!currentCourses.includes(courseId)) {
            currentCourses.push(courseId);
        }

        let updatedUser;
        if (existingUser) {
            const [updated] = await db.update(users)
                .set({
                    purchasedCourses: currentCourses,
                    trialExpiresAt: trialExpiresAt ? new Date(trialExpiresAt) : null
                })
                .where(eq(users.email, email))
                .returning();
            updatedUser = updated;
        } else {
            updatedUser = { email: 'admin@devmastery.com', purchasedCourses: currentCourses };
        }

        // Mark code as used ONLY after successful user update
        await db.update(accessCodes)
            .set({ isUsed: true, usedBy: email, usedAt: now })
            .where(eq(accessCodes.id, accessCode.id));

        res.json({
            success: true,
            trialExpiresAt: trialExpiresAt || undefined,
            isPaid: isPaidFlag,
            message: accessCode.type === 'lifetime' ? "Lifetime Access Granted! Welcome to the family." : "Trial Activated! Timer started.",
            user: updatedUser
        });
    } catch (error) {
        console.error("Code redeem error:", error);
        res.status(500).json({
            error: "Failed to redeem code",
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC COURSE MANAGEMENT — CRUD Endpoints


// ─── PUBLIC: List published courses ──────────────────────────────────────────
app.get("/api/courses", async (req, res) => {
    try {
        const allCourses = await db.select().from(courses).orderBy(asc(courses.sortOrder));
        res.json(allCourses);
    } catch (error) {
        console.error("Failed to fetch courses:", error);
        res.json([]);
    }
});

// ─── Get course with modules and lessons (redacts video IDs for non-purchased) ─
app.get("/api/courses/:slug", async (req, res) => {
    try {
        const [course] = await db.select().from(courses).where(eq(courses.slug, req.params.slug));
        if (!course) return res.status(404).json({ error: "Course not found" });

        // Optional session auth to check purchase status
        let hasAccess = false;
        const authHeader = req.headers.authorization || '';
        const sessionId = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        if (sessionId) {
            try {
                const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
                if (session) {
                    const [sessionUser] = await db.select().from(users).where(eq(users.id, session.userId));
                    if (sessionUser) {
                        hasAccess = sessionUser.role === 'admin' || (sessionUser.purchasedCourses || []).includes(course.slug);
                    }
                }
            } catch { /* not logged in */ }
        }

        const courseModules = await db.select().from(modules)
            .where(eq(modules.courseId, course.id))
            .orderBy(asc(modules.sortOrder));

        const moduleIds = courseModules.map(m => m.id);
        const courseLessons = moduleIds.length > 0
            ? await db.select().from(lessons)
                .where(sql`${lessons.moduleId} IN ${moduleIds}`)
                .orderBy(asc(lessons.sortOrder))
            : [];

        // Group lessons by moduleId
        const lessonsByModule: Record<string, any[]> = {};
        courseLessons.forEach(l => {
            if (!lessonsByModule[l.moduleId]) lessonsByModule[l.moduleId] = [];
            lessonsByModule[l.moduleId].push(l);
        });

        const modulesWithLessons = courseModules.map(m => ({
            ...m,
            lessons: (lessonsByModule[m.id] || []).map(l => ({
                ...l,
                youtubeId: hasAccess ? l.youtubeId : null,
                notesPath: hasAccess ? l.notesPath : null,
            }))
        }));

        res.json({ ...course, modules: modulesWithLessons });
    } catch (error) {
        console.error("Failed to fetch course:", error);
        res.status(500).json({ error: "Failed to fetch course" });
    }
});

// ─── Get all published courses with modules+lessons (for curriculum) ────────
// Authenticated users get full data (video IDs) for purchased courses only.
// Unauthenticated or non-purchased courses: video IDs are redacted.
app.get("/api/courses/all/curriculum", async (req, res) => {
    try {
        // Optional session auth — identify the user if logged in
        let purchasedCourses: string[] = [];
        let isAdmin = false;
        const authHeader = req.headers.authorization || '';
        const sessionId = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        if (sessionId) {
            try {
                const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
                if (session) {
                    const [sessionUser] = await db.select().from(users).where(eq(users.id, session.userId));
                    if (sessionUser) {
                        purchasedCourses = sessionUser.purchasedCourses || [];
                        isAdmin = sessionUser.role === 'admin';
                    }
                }
            } catch { /* not logged in, continue as guest */ }
        }

        const allCourses = await db.select().from(courses)
            .where(eq(courses.isPublished, true))
            .orderBy(asc(courses.sortOrder));

        const result = [];
        for (const course of allCourses) {
            const courseModules = await db.select().from(modules)
                .where(eq(modules.courseId, course.id))
                .orderBy(asc(modules.sortOrder));

            const moduleIds = courseModules.map(m => m.id);
            const courseLessons = moduleIds.length > 0
                ? await db.select().from(lessons)
                    .where(sql`${lessons.moduleId} IN ${moduleIds}`)
                    .orderBy(asc(lessons.sortOrder))
                : [];

            const lessonsByModule: Record<string, any[]> = {};
            courseLessons.forEach(l => {
                if (!lessonsByModule[l.moduleId]) lessonsByModule[l.moduleId] = [];
                lessonsByModule[l.moduleId].push(l);
            });

            // Server-side access control: redact video IDs for non-purchased courses
            const hasAccess = isAdmin || purchasedCourses.includes(course.slug);

            result.push({
                ...course,
                modules: courseModules.map(m => ({
                    ...m,
                    lessons: (lessonsByModule[m.id] || []).map(l => ({
                        ...l,
                        youtubeId: hasAccess ? l.youtubeId : null,
                        notesPath: hasAccess ? l.notesPath : null,
                    }))
                }))
            });
        }

        res.json(result);
    } catch (error) {
        console.error("Failed to fetch curricula:", error);
        res.json([]);
    }
});

// ─── ADMIN: Create course ────────────────────────────────────────────────────
app.post("/api/admin/courses", requireAdmin, async (req, res) => {
    try {
        const { slug, title, subtitle, description, landingDescription, price, salePrice, features, badge, icon, color, sortOrder, isPublished } = req.body;
        if (!slug || !title) return res.status(400).json({ error: "Slug and title required" });

        const [course] = await db.insert(courses).values({
            slug, title, subtitle, description, landingDescription,
            price: price || 0, salePrice, features: features || [],
            badge, icon, color, sortOrder: sortOrder || 0, isPublished: isPublished || false
        }).returning();

        res.json(course);
    } catch (error: any) {
        console.error("Failed to create course:", error);
        if (error.code === '23505') return res.status(409).json({ error: "Course slug already exists" });
        res.status(500).json({ error: "Failed to create course" });
    }
});

// ─── ADMIN: Update course ────────────────────────────────────────────────────
app.put("/api/admin/courses/:id", requireAdmin, async (req, res) => {
    try {
        const { slug, title, subtitle, description, landingDescription, price, salePrice, features, badge, icon, color, sortOrder, isPublished } = req.body;
        const [course] = await db.update(courses).set({
            slug, title, subtitle, description, landingDescription,
            price, salePrice, features, badge, icon, color, sortOrder, isPublished,
            updatedAt: new Date()
        }).where(eq(courses.id, req.params.id)).returning();

        if (!course) return res.status(404).json({ error: "Course not found" });
        res.json(course);
    } catch (error: any) {
        console.error("Failed to update course:", error);
        if (error.code === '23505') return res.status(409).json({ error: "Course slug already exists" });
        res.status(500).json({ error: "Failed to update course" });
    }
});

// ─── ADMIN: Delete course ────────────────────────────────────────────────────
app.delete("/api/admin/courses/:id", requireAdmin, async (req, res) => {
    try {
        await db.delete(courses).where(eq(courses.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to delete course:", error);
        res.status(500).json({ error: "Failed to delete course" });
    }
});

// ─── ADMIN: Create module ────────────────────────────────────────────────────
app.post("/api/admin/courses/:courseId/modules", requireAdmin, async (req, res) => {
    try {
        const { slug, title, description, sortOrder } = req.body;
        if (!slug || !title) return res.status(400).json({ error: "Slug and title required" });

        const [mod] = await db.insert(modules).values({
            courseId: req.params.courseId, slug, title, description,
            sortOrder: sortOrder || 0
        }).returning();

        res.json(mod);
    } catch (error) {
        console.error("Failed to create module:", error);
        res.status(500).json({ error: "Failed to create module" });
    }
});

// ─── ADMIN: Update module ────────────────────────────────────────────────────
app.put("/api/admin/modules/:id", requireAdmin, async (req, res) => {
    try {
        const { slug, title, description, sortOrder } = req.body;
        const [mod] = await db.update(modules).set({
            slug, title, description, sortOrder, updatedAt: new Date()
        }).where(eq(modules.id, req.params.id)).returning();

        if (!mod) return res.status(404).json({ error: "Module not found" });
        res.json(mod);
    } catch (error) {
        console.error("Failed to update module:", error);
        res.status(500).json({ error: "Failed to update module" });
    }
});

// ─── ADMIN: Delete module ────────────────────────────────────────────────────
app.delete("/api/admin/modules/:id", requireAdmin, async (req, res) => {
    try {
        await db.delete(modules).where(eq(modules.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to delete module:", error);
        res.status(500).json({ error: "Failed to delete module" });
    }
});

// ─── ADMIN: Reorder modules ──────────────────────────────────────────────────
app.put("/api/admin/modules/reorder", requireAdmin, async (req, res) => {
    try {
        const { orderedIds } = req.body; // string[] of module IDs in new order
        if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds array required" });

        for (let i = 0; i < orderedIds.length; i++) {
            await db.update(modules).set({ sortOrder: i }).where(eq(modules.id, orderedIds[i]));
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to reorder modules:", error);
        res.status(500).json({ error: "Failed to reorder modules" });
    }
});

// ─── ADMIN: Create lesson ────────────────────────────────────────────────────
app.post("/api/admin/modules/:moduleId/lessons", requireAdmin, async (req, res) => {
    try {
        const { slug, title, duration, youtubeId, notesPath, free, sortOrder } = req.body;
        if (!slug || !title) return res.status(400).json({ error: "Slug and title required" });

        const [lesson] = await db.insert(lessons).values({
            moduleId: req.params.moduleId, slug, title, duration,
            youtubeId, notesPath, free: free || false, sortOrder: sortOrder || 0
        }).returning();

        res.json(lesson);
    } catch (error) {
        console.error("Failed to create lesson:", error);
        res.status(500).json({ error: "Failed to create lesson" });
    }
});

// ─── ADMIN: Update lesson ────────────────────────────────────────────────────
app.put("/api/admin/lessons/:id", requireAdmin, async (req, res) => {
    try {
        const { slug, title, duration, youtubeId, notesPath, free, sortOrder } = req.body;
        const [lesson] = await db.update(lessons).set({
            slug, title, duration, youtubeId, notesPath, free, sortOrder, updatedAt: new Date()
        }).where(eq(lessons.id, req.params.id)).returning();

        if (!lesson) return res.status(404).json({ error: "Lesson not found" });
        res.json(lesson);
    } catch (error) {
        console.error("Failed to update lesson:", error);
        res.status(500).json({ error: "Failed to update lesson" });
    }
});

// ─── ADMIN: Delete lesson ────────────────────────────────────────────────────
app.delete("/api/admin/lessons/:id", requireAdmin, async (req, res) => {
    try {
        await db.delete(lessons).where(eq(lessons.id, req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to delete lesson:", error);
        res.status(500).json({ error: "Failed to delete lesson" });
    }
});

// ─── ADMIN: Reorder lessons ──────────────────────────────────────────────────
app.put("/api/admin/lessons/reorder", requireAdmin, async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds array required" });

        for (let i = 0; i < orderedIds.length; i++) {
            await db.update(lessons).set({ sortOrder: i }).where(eq(lessons.id, orderedIds[i]));
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to reorder lessons:", error);
        res.status(500).json({ error: "Failed to reorder lessons" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEED: Populate courses from static curriculum data (one-time migration)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedCoursesFromStaticData() {
    try {
        const [existing] = await db.select({ count: sql<number>`count(*)` }).from(courses);
        if (existing.count > 0) {
            console.log(`[Seed] ${existing.count} courses already exist, skipping seed.`);
            return;
        }

        console.log("[Seed] No courses found. Seeding from static curriculum data...");

        // ── Full Stack ──
        const [fs] = await db.insert(courses).values({
            slug: 'fullstack', title: 'Full Stack Web Dev',
            subtitle: 'Master the Modern Stack',
            description: 'From Hello World to deployed SaaS application. Master frontend, backend, databases, and deploy real applications.',
            landingDescription: "From 'Hello World' to deployed SaaS application.",
            price: 15000, salePrice: 8000,
            features: ['Lifetime Access to Full Stack Content', 'Frontend & Backend Deep Dive', 'AI Mentor Support (Beta)', '5+ Real World Projects', 'Certificate of Completion', 'Discord Community Access'],
            icon: 'BookOpen', color: 'emerald', sortOrder: 0, isPublished: true
        }).returning();

        // ── Cybersecurity ──
        const [cy] = await db.insert(courses).values({
            slug: 'cyber', title: '90 Days Cyber Security',
            subtitle: '90 Day Program',
            description: 'Master cybersecurity in 90 days — from networking and Linux to ethical hacking and cloud security.',
            landingDescription: 'Ethical hacking, penetration testing, network security, and defensive strategies used by industry professionals.',
            price: 8000, salePrice: 5000,
            features: ['90 Days Intensive Training', 'Ethical Hacking Workshops', 'Linux & Networking Deep Dive', 'Certificate of Completion', 'Discord Community Access'],
            icon: 'Shield', color: 'blue', sortOrder: 1, isPublished: true
        }).returning();

        // ── Data Science ──
        const [ds] = await db.insert(courses).values({
            slug: 'datascience', title: 'Data Science Specialization',
            subtitle: 'Analytics & ML',
            description: 'Unlock the power of data through Python, math, machine learning, and visualization.',
            landingDescription: 'Python, statistics, data visualization, machine learning, and real-world data projects from scratch.',
            price: 12000, salePrice: 8000,
            features: ['Complete ML & Math Foundation', 'Python & Data Wrangling Projects', 'Advanced Data Visualization', 'Certificate of Completion', 'Discord Community Access'],
            icon: 'Award', color: 'purple', sortOrder: 2, isPublished: true
        }).returning();

        // ── AI ──
        const [ai] = await db.insert(courses).values({
            slug: 'ai', title: 'AI & Machine Learning',
            subtitle: 'AI Course',
            description: 'Complete AI & Machine Learning course. Builds on your Full Stack skills with hands-on AI projects.',
            landingDescription: 'Complete AI & Machine Learning course.',
            price: 5000, salePrice: 2000,
            features: ['Complete AI & ML Course Content', 'Builds on Your Full Stack Skills', 'Hands-on AI Projects', 'Early Access to New AI Modules', 'Discord Community Access'],
            icon: 'Bot', color: 'cyan', sortOrder: 3, isPublished: true
        }).returning();

        // Seed modules & lessons for each course
        const courseMap: Record<string, { course: any; moduleData: any[] }> = {
            fullstack: { course: fs, moduleData: [
                { slug: 'phase-0', title: 'Phase 0 — Setup', description: 'Setting up your development environment and mastering Git.', lessons: [
                    { slug: 'git-github', title: 'Git & GitHub Masterclass', duration: '15:00', youtubeId: 'vA5TTz6BXhY', free: true, notesPath: '/notes/Git & GitHub/Git & GitHub.pdf' }
                ]},
                { slug: 'phase-1', title: 'Phase 1 — Python & Java', description: 'Master Python from scratch and explore Java DSA.', lessons: [
                    { slug: 'python-intro', title: 'Python Introduction', duration: '4h 26s', youtubeId: 'rfscVS0vtbw' },
                    { slug: 'python-intermediate', title: 'Python Intermediate', duration: '5h 57m 46s', youtubeId: 'HGOBQPFzWKo' },
                    { slug: 'python-project', title: 'Python Project: Zero to Hero', duration: '9h 19m', youtubeId: 'NpmFbWO6HPU' },
                    { slug: 'streamlit', title: 'Streamlit Crash Course', duration: '11m', youtubeId: 'D0D4Pa22iG0' },
                    { slug: 'dsa-java', title: 'DSA In JAVA Mastery', duration: '45:00', youtubeId: 'vLqTf2b6GZw', notesPath: '/notes/DSA In JAVA/java collection framework.pdf' }
                ]},
                { slug: 'phase-2', title: 'Phase 2 — Web Foundation', description: 'The foundation of the web: HTML, CSS, and modern frameworks.', lessons: [
                    { slug: 'html', title: 'HTML Crash Course', duration: '18:00', youtubeId: 'HGTJBPNC-Gw', notesPath: '/notes/HTML_In_One_Shot/HTML Tutorial for Beginners.pdf' },
                    { slug: 'css-video', title: 'CSS Video Tutorial', duration: '41m', youtubeId: 'yfoY53QXEnI', notesPath: '/notes/Full Stack Web Development Mastery Course In Hindi/CSS/✅ 📘 CSS Animations – Detailed Notes.pdf' },
                    { slug: 'web-dev-project', title: 'Web Development Project', duration: '3h 22m', youtubeId: 'J_r6hBo9lO4' },
                    { slug: 'javascript-video', title: 'JavaScript Video Tutorial', duration: '8h 4m', youtubeId: 'a-wVHL0lpb0' },
                    { slug: 'tailwind', title: 'Tailwind CSS Mastery', duration: '22:00', youtubeId: 'lCxcTsOHrjo', notesPath: '/notes/Tailwind CSS/🎬 Tailwind CSS Mastery Course.pdf' },
                    { slug: 'bootstrap', title: 'Bootstrap 5 Foundation', duration: '20:00', youtubeId: 'Jyvffr3aCp0', notesPath: '/notes/Bootstrap Mastery Course/🎬 Bootstrap 5 Mastery Course – Web Dev Mastery.pdf' },
                    { slug: 'js-oops', title: 'JavaScript OOPS & Advanced', duration: '20:00', youtubeId: 'BS9v-YmG1vM', notesPath: '/notes/JavaScript_OOPS/OOPS_In_JS.pdf' }
                ]},
                { slug: 'phase-3', title: 'Phase 3 — React & State Management', description: 'Building modern UIs with React and Redux.', lessons: [
                    { slug: 'react-complete', title: 'React.JS Complete Tutorial', duration: '50:00', youtubeId: 'bMknfKXIFA8', notesPath: '/notes/React.JS Complete Tutorial/Complete React.js Web Dev Mastey.pdf' },
                    { slug: 'react-router', title: 'React Router v7 Mastery', duration: '20:00', youtubeId: '77m62v_mXis', notesPath: '/notes/React.JS Complete Tutorial/React_Router_v7_Web_Dev_Mastery.pdf' },
                    { slug: 'react-hooks', title: 'All React Hooks In One Shot', duration: '25:00', youtubeId: 'LlvBzyy-558', notesPath: '/notes/All_React_Hooks_In_One_Shot/📘 All React Hooks 2025 – Web Dev Mastery.pdf' },
                    { slug: 'redux-toolkit', title: 'Redux Toolkit Tutorial', duration: '30:00', youtubeId: 'EnIRy6_CC_w', notesPath: '/notes/Redux_Toolkit_In_One_Shot/Redux - Toolkit.pdf' },
                    { slug: 'react-interview', title: 'React Interview Preparation', duration: '40:00', youtubeId: 'v80vL9m2QTM', notesPath: '/notes/React_Most_Imp_Interview_Question/1_React_Interview_Questions_Web_Dev_Mastery.pdf' }
                ]},
                { slug: 'phase-4', title: 'Phase 4 — Backend & Modern DB', description: 'Building robust backends with Node/Python and MongoDB.', lessons: [
                    { slug: 'backend-development', title: 'Backend Development', duration: '4h 12m', youtubeId: 'Q-icS7yZz5k' },
                    { slug: 'backend-projects', title: 'Backend Projects', duration: '36m', youtubeId: 'JmpDGMgRFfo' },
                    { slug: 'mongodb-essentials', title: 'MongoDB Essentials & Cheat Sheet', duration: '30:00', youtubeId: 'c2M-rlkkT5o', notesPath: '/notes/MongoDB Cheat Sheet/MongoDB Cheat Sheet.pdf' },
                    { slug: 'backend-mastery', title: 'Full Stack Master Course', duration: '60:00', youtubeId: 'rOpEN1JDaD0', notesPath: '/notes/Full Stack Web Development Mastery Course In Hindi/HTML/🎓 Full Stack Web Development Mastery Course_ HTML – Beginner to Pro (With Examples).pdf' }
                ]},
                { slug: 'phase-5', title: 'Phase 5 — C++ & Programming Foundations', description: 'Deep dive into C++ and object-oriented programming.', lessons: [
                    { slug: 'cpp-mastery', title: 'C++ Mastery Course', duration: '45:00', youtubeId: 'vLqTf2b6GZw', notesPath: '/notes/C++ Mastery Course/Complete C++ Mastery Course Web Dev Mastery.pdf' },
                    { slug: 'cpp-oops', title: 'C++ OOPs Concepts', duration: '25:00', youtubeId: 'JGNvVAbM-is', notesPath: '/notes/C++ OOPs/Complete_OOPS_Web_Dev_Mastery.pdf' }
                ]}
            ]},
            cyber: { course: cy, moduleData: [
                { slug: 'cyber-phase-0', title: 'Day 1–7 — Network+ Concepts', description: 'Understand networking fundamentals with CompTIA Network+ concepts.', lessons: [
                    { slug: 'cyber-network-plus', title: "Professor Messer's N10-009 CompTIA Network+", duration: '24h', youtubeId: 'As6g6IXcVa4', free: true }
                ]},
                { slug: 'cyber-phase-1', title: 'Day 8–14 — Security+ Concepts', description: 'Learn core security principles with CompTIA Security+ preparation.', lessons: [
                    { slug: 'cyber-security-plus-messer', title: "Professor Messer's SY0-701 CompTIA Security+", duration: '11h', youtubeId: 'KiEptGbnEBc' },
                    { slug: 'cyber-security-plus-alt', title: "Pete Zerger's SY0-701 Security+", duration: '6h', youtubeId: '1E7pI7PB4KI' }
                ]},
                { slug: 'cyber-phase-2', title: 'Day 15–28 — Linux Fundamentals', description: 'Master the Linux command line, file system, and system administration.', lessons: [
                    { slug: 'cyber-linux-journey', title: 'Linux Journey — Full Walkthrough', duration: '10h' },
                    { slug: 'cyber-linux-cisco', title: 'Linux Unhatched (Cisco NetAcad)', duration: '8h' }
                ]},
                { slug: 'cyber-phase-3', title: 'Day 29–42 — Python for Cybersecurity', description: 'Learn Python with a focus on cybersecurity scripting and automation.', lessons: [
                    { slug: 'cyber-python-codecademy', title: 'Learn Python (Codecademy Track)', duration: '12h' },
                    { slug: 'cyber-python-cybermentor', title: 'Python for Ethical Hacking — TheCyberMentor', duration: '2h 50m', youtubeId: 'egg-GoT5iVk' }
                ]},
                { slug: 'cyber-phase-4', title: 'Day 43–56 — Traffic Analysis', description: 'Analyze network traffic with Wireshark, tcpdump, and Suricata IDS/IPS.', lessons: [
                    { slug: 'cyber-wireshark-tutorial', title: 'Wireshark Tutorial for Beginners', duration: '3h', youtubeId: 'NjvR4LmwcMU' },
                    { slug: 'cyber-suricata-ids', title: 'Suricata Network IDS/IPS', duration: '1h 30m', youtubeId: 'S0-vsjhPDN0' }
                ]},
                { slug: 'cyber-phase-5', title: 'Day 57–63 — Git & Version Control', description: 'Learn Git for collaboration, version control, and security auditing.', lessons: [
                    { slug: 'cyber-git-basics', title: 'Git for Beginners (Codecademy)', duration: '4h' },
                    { slug: 'cyber-git-branching', title: 'Learn Git Branching — Interactive', duration: '3h' }
                ]},
                { slug: 'cyber-phase-6', title: 'Day 64–70 — ELK Stack (SIEM)', description: 'Set up and use Elasticsearch, Logstash, and Kibana for log analysis and SIEM.', lessons: [
                    { slug: 'cyber-elk-tutorial', title: 'Complete ELK Stack Tutorial', duration: '6h' }
                ]},
                { slug: 'cyber-phase-7', title: 'Day 71–84 — Cloud Security (AWS / Azure / GCP)', description: 'Explore cloud platforms and learn cloud security fundamentals.', lessons: [
                    { slug: 'cyber-cloud-aws', title: 'AWS Getting Started & Security Basics', duration: '6h' },
                    { slug: 'cyber-cloud-azure', title: 'Azure Fundamentals & Security', duration: '6h' },
                    { slug: 'cyber-cloud-gcp', title: 'GCP Getting Started & Security', duration: '6h' }
                ]},
                { slug: 'cyber-phase-8', title: 'Day 85–90 — Ethical Hacking', description: 'Practice ethical hacking with Hack The Box and VulnHub challenges.', lessons: [
                    { slug: 'cyber-hacking-pt1', title: 'Ethical Hacking in 15 Hours — Part 1 (TheCyberMentor)', duration: '8h', youtubeId: '3FNYvj2U0HM' },
                    { slug: 'cyber-hacking-pt2', title: 'Ethical Hacking — Part 2 (TheCyberMentor)', duration: '7h', youtubeId: 'sH4JCwjybGs' }
                ]},
                { slug: 'cyber-phase-9', title: 'Day 91–95 — Resume & Career Prep', description: 'Build a one-page cybersecurity resume and learn where to apply.', lessons: [
                    { slug: 'cyber-resume', title: 'Cybersecurity Resume — One Page Template', duration: '2h' },
                    { slug: 'cyber-job-search', title: 'Where and How to Apply for Cybersecurity Jobs', duration: '2h' }
                ]}
            ]},
            datascience: { course: ds, moduleData: [
                { slug: 'ds-phase-1', title: 'Phase 1 — Introduction to Data Science', description: 'Learn the basic concepts behind data science, ethics, and early statistics.', lessons: [
                    { slug: 'ds-defining', title: 'Defining Data Science', duration: '15:00', youtubeId: 'beZ7Mb_oz9I', free: true, notesPath: '/Data Science Course/1-Introduction/01-defining-data-science/README.md' },
                    { slug: 'ds-ethics', title: 'Data Science Ethics', duration: '20:00', free: true, notesPath: '/Data Science Course/1-Introduction/02-ethics/README.md' },
                    { slug: 'ds-defining-data', title: 'Defining Data', duration: '25:00', notesPath: '/Data Science Course/1-Introduction/03-defining-data/README.md' },
                    { slug: 'ds-stats-prob', title: 'Introduction to Statistics & Probability', duration: '45:00', youtubeId: 'Z5Zy85g4Yjw', notesPath: '/Data Science Course/1-Introduction/04-stats-and-probability/README.md' }
                ]},
                { slug: 'ds-phase-2', title: 'Phase 2 — Working With Data', description: 'Introduction to SQL, NoSQL, Python, and data preparation techniques.', lessons: [
                    { slug: 'ds-relational', title: 'Working with Relational Data (SQL)', duration: '40:00', notesPath: '/Data Science Course/2-Working-With-Data/05-relational-databases/README.md' },
                    { slug: 'ds-nonrelational', title: 'Working with NoSQL Data', duration: '35:00', notesPath: '/Data Science Course/2-Working-With-Data/06-non-relational/README.md' },
                    { slug: 'ds-python', title: 'Working with Python (Pandas)', duration: '1h 20m', notesPath: '/Data Science Course/2-Working-With-Data/07-python/README.md' },
                    { slug: 'ds-prep', title: 'Data Preparation', duration: '50:00', notesPath: '/Data Science Course/2-Working-With-Data/08-data-preparation/README.md' }
                ]},
                { slug: 'ds-phase-3', title: 'Phase 3 — Data Visualization', description: 'Learn how to visualize quantities, distributions, proportions, and relationships.', lessons: [
                    { slug: 'ds-vis-quant', title: 'Visualizing Quantities', duration: '30:00', notesPath: '/Data Science Course/3-Data-Visualization/09-visualization-quantities/README.md' },
                    { slug: 'ds-vis-dist', title: 'Visualizing Distributions of Data', duration: '25:00', notesPath: '/Data Science Course/3-Data-Visualization/10-visualization-distributions/README.md' },
                    { slug: 'ds-vis-prop', title: 'Visualizing Proportions', duration: '20:00', notesPath: '/Data Science Course/3-Data-Visualization/11-visualization-proportions/README.md' },
                    { slug: 'ds-vis-rel', title: 'Visualizing Relationships', duration: '35:00', notesPath: '/Data Science Course/3-Data-Visualization/12-visualization-relationships/README.md' },
                    { slug: 'ds-vis-meaning', title: 'Meaningful Visualizations', duration: '40:00', notesPath: '/Data Science Course/3-Data-Visualization/13-meaningful-visualizations/README.md' }
                ]},
                { slug: 'ds-phase-4', title: 'Phase 4 — Real-World Application', description: 'The data science lifecycle, cloud deployment, and real-world scenarios.', lessons: [
                    { slug: 'ds-lifecycle', title: 'Introduction to Lifecycle & Analyzing', duration: '1h 10m', notesPath: '/Data Science Course/4-Data-Science-Lifecycle/README.md' },
                    { slug: 'ds-cloud', title: 'Data Science in the Cloud', duration: '1h 45m', notesPath: '/Data Science Course/5-Data-Science-In-Cloud/README.md' },
                    { slug: 'ds-wild', title: 'Data Science in the Wild', duration: '40:00', notesPath: '/Data Science Course/6-Data-Science-In-Wild/README.md' }
                ]}
            ]},
            ai: { course: ai, moduleData: [
                { slug: 'ai-phase-0', title: 'Phase 0 — AI Foundations', description: 'Introduction to Artificial Intelligence and Machine Learning concepts.', lessons: [
                    { slug: 'ai-intro', title: 'Complete AI & Machine Learning Course', duration: '1h 30m', youtubeId: 'tchN4xa4pfg' }
                ]}
            ]}
        };

        for (const [key, data] of Object.entries(courseMap)) {
            for (let i = 0; i < data.moduleData.length; i++) {
                const md = data.moduleData[i];
                const [mod] = await db.insert(modules).values({
                    courseId: data.course.id, slug: md.slug, title: md.title,
                    description: md.description, sortOrder: i
                }).returning();

                for (let j = 0; j < md.lessons.length; j++) {
                    const ld = md.lessons[j];
                    await db.insert(lessons).values({
                        moduleId: mod.id, slug: ld.slug, title: ld.title,
                        duration: ld.duration, youtubeId: ld.youtubeId || null,
                        notesPath: ld.notesPath || null, free: ld.free || false,
                        sortOrder: j
                    });
                }
            }
        }

        console.log("[Seed] Successfully seeded 4 courses with modules and lessons!");
    } catch (error) {
        console.error("[Seed] Failed to seed courses:", error);
    }
}
seedCoursesFromStaticData();

// SEED: Add Cloud Computing course if it doesn't exist yet (migration)
async function seedCloudComputingCourse() {
    try {
        const [existing] = await db.select().from(courses).where(eq(courses.slug, 'cloudcomputing')).limit(1);
        if (existing) return; // already seeded

        console.log("[Seed] Cloud Computing course not found. Seeding...");
        const [cc] = await db.insert(courses).values({
            slug: 'cloudcomputing', title: 'Cloud Computing',
            subtitle: 'NPTEL Cloud Computing',
            description: 'Master cloud computing from fundamentals to platform deployment — covering architecture, virtualization, XML & web services, MapReduce, OpenStack, Azure, and GCP.',
            landingDescription: 'From cloud fundamentals to Azure & GCP deployment.',
            price: 11500, salePrice: null,
            features: ['25+ Video Lessons', 'Cloud Architecture & Deployment', 'Azure & GCP Hands-On', 'OpenStack & MapReduce', 'Certificate of Completion', 'Discord Community Access'],
            icon: 'Cloud', color: 'sky', sortOrder: 4, isPublished: true
        }).returning();

        const ccModules = [
            { slug: 'cc-phase-1', title: 'Phase 1 — Cloud Computing Fundamentals', description: 'Understand the core concepts, architecture, deployment models, and virtualization in cloud computing.', lessons: [
                { slug: 'cc-overview', title: 'Cloud Computing - Overview', duration: '24:59', youtubeId: 'NzZXz3fJf6o', free: true },
                { slug: 'cc-overview-contd', title: 'Cloud Computing - Overview (contd..)', duration: '31:50', youtubeId: 'SqG-b5E9vHs' },
                { slug: 'cc-introduction', title: 'Cloud Computing - Introduction', duration: '30:47', youtubeId: 'lOh2x-UACaU' },
                { slug: 'cc-architecture', title: 'Cloud Computing Architecture', duration: '30:16', youtubeId: 'fZ3D6HQrWzs' },
                { slug: 'cc-deployment-models', title: 'Cloud Computing Architecture - Deployment Models', duration: '29:46', youtubeId: '4xrYN2Ecmas' },
                { slug: 'cc-virtualization', title: 'Cloud Computing Virtualization', duration: '30:55', youtubeId: 'R4spydpBbYk' },
            ]},
            { slug: 'cc-phase-2', title: 'Phase 2 — XML & Web Services', description: 'Learn XML fundamentals, web services, and Service-Oriented Architecture (SOA) for cloud environments.', lessons: [
                { slug: 'cc-xml-basics', title: 'Cloud Computing XML Basics', duration: '31:37', youtubeId: 'u6q_hD73qwM' },
                { slug: 'cc-xml-basics-ii', title: 'Cloud Computing XML Basics II', duration: '25:17', youtubeId: 'S6REPwyWoxE' },
                { slug: 'cc-web-services', title: 'Cloud Computing Web Services, Service Oriented Architecture', duration: '32:24', youtubeId: 'GtJGB1WxRW8' },
            ]},
            { slug: 'cc-phase-3', title: 'Phase 3 — Cloud Agreements & Economics', description: 'Explore Service Level Agreements (SLA) and the economics behind cloud computing models.', lessons: [
                { slug: 'cc-sla', title: 'Service Level Agreement', duration: '30:27', youtubeId: '9Btb72NZwg4' },
                { slug: 'cc-economics', title: 'Cloud Economics', duration: '32:05', youtubeId: 'HmQhz0DPF9g' },
            ]},
            { slug: 'cc-phase-4', title: 'Phase 4 — Data Management & MapReduce', description: 'Learn how data is managed in the cloud and dive into the MapReduce paradigm for distributed computing.', lessons: [
                { slug: 'cc-managing-data', title: 'Managing Data', duration: '35:20', youtubeId: 'Dr6MSqRFaZQ' },
                { slug: 'cc-mapreduce', title: 'Introduction to MapReduce', duration: '34:38', youtubeId: 'XWNEhv-b2PM' },
            ]},
            { slug: 'cc-phase-5', title: 'Phase 5 — OpenStack', description: 'Explore OpenStack as an open-source cloud platform with hands-on demos.', lessons: [
                { slug: 'cc-openstack', title: 'Open Stack', duration: '32:39', youtubeId: 'R4CUs7I9Irs' },
                { slug: 'cc-openstack-demo-1', title: 'Cloud Computing Opensource Cloud-Openstack Demo (Part 1)', duration: '20:50', youtubeId: 'ATFu-VUrogE' },
                { slug: 'cc-openstack-demo-2', title: 'Cloud Computing Opensource Cloud-Openstack Demo (Part 2)', duration: '20:48', youtubeId: 'TOOSVsxEIpo' },
            ]},
            { slug: 'cc-phase-6', title: 'Phase 6 — Cloud Platforms: Azure & GCP', description: 'Hands-on case studies and demos with Microsoft Azure and Google Cloud Platform.', lessons: [
                { slug: 'cc-azure-case-study', title: 'Cloud Computing Case Study - Microsoft Azure', duration: '21:32', youtubeId: 'Mkuf4pTqIdU' },
                { slug: 'cc-azure-demo', title: 'Cloud Computing Demo - Microsoft Azure', duration: '17:54', youtubeId: 'jOhZ80XbymI' },
                { slug: 'cc-gcp-case-study', title: 'Cloud Computing Case Study - Google Cloud Platform (GCP)', duration: '17:36', youtubeId: 'FYjXsXdbZTo' },
                { slug: 'cc-gcp-demo', title: 'Cloud Computing Demo - Google Cloud Platform (GCP)', duration: '19:36', youtubeId: 'XTW3ujxnndo' },
            ]},
            { slug: 'cc-phase-7', title: 'Phase 7 — Tutorials & Advanced Topics', description: 'In-depth tutorials on SLA, economics, MapReduce, and resource management in cloud systems.', lessons: [
                { slug: 'cc-sla-tutorial', title: 'SLA Tutorial', duration: '36:00', youtubeId: 'AvL3bY9tUwI' },
                { slug: 'cc-economics-tutorial', title: 'Economics Tutorial', duration: '33:18', youtubeId: 'JiNgg2dfBhU' },
                { slug: 'cc-mapreduce-tutorial', title: 'MapReduce Tutorial', duration: '39:15', youtubeId: 'ENYSofxVJ1U' },
                { slug: 'cc-resource-mgmt-1', title: 'Resource Management - I', duration: '31:43', youtubeId: 'Imj8L-po4kw' },
                { slug: 'cc-resource-mgmt-2', title: 'Resource Management - II', duration: '32:10', youtubeId: 'M38DDZvr-YI' },
            ]},
        ];

        for (let i = 0; i < ccModules.length; i++) {
            const md = ccModules[i];
            const [mod] = await db.insert(modules).values({
                courseId: cc.id, slug: md.slug, title: md.title,
                description: md.description, sortOrder: i
            }).returning();
            for (let j = 0; j < md.lessons.length; j++) {
                const ld = md.lessons[j];
                await db.insert(lessons).values({
                    moduleId: mod.id, slug: ld.slug, title: ld.title,
                    duration: ld.duration, youtubeId: ld.youtubeId || null,
                    notesPath: (ld as any).notesPath || null, free: ld.free || false,
                    sortOrder: j
                });
            }
        }
        console.log("[Seed] Successfully seeded Cloud Computing course with 7 modules and 25 lessons!");
    } catch (error) {
        console.error("[Seed] Failed to seed Cloud Computing course:", error);
    }
}
seedCloudComputingCourse();


// ═══════════════════════════════════════════════════════════════════════════════
// AI PROXY — keeps API key server-side
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/ai/chat", apiLimiter, async (req, res) => {
    const { messages, model, stream, ...extraParams } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array required" });
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    const baseURL = process.env.NVIDIA_BASE_URL;
    if (!apiKey || !baseURL) {
        return res.status(500).json({ error: "AI service not configured" });
    }

    try {
        const response = await fetch(baseURL + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey,
            },
            body: JSON.stringify({
                model: model || 'meta/llama-3.1-8b-instruct',
                messages,
                stream: !!stream,
                ...extraParams,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("AI proxy error:", response.status, errorText);
            return res.status(502).json({ error: "AI service error" });
        }

        // Stream SSE response to client
        if (stream && response.body) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(decoder.decode(value, { stream: true }));
                }
            } catch (e) { /* stream ended */ }
            res.end();
        } else {
            const data = await response.json();
            res.json(data);
        }
    } catch (error) {
        console.error("AI proxy failed:", error);
        res.status(500).json({ error: "AI service unavailable" });
    }
});

export default app;
