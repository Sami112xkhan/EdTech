import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { db } from "../server/db/index.js";
import { users, sessions, feedback as feedbackTable, accessCodes, discountCoupons, paymentOrders, userNotes, playgroundProjects, aiChats, systemSettings, activityLogs, courses, modules, lessons } from "../server/db/schema.js";
import { eq, and, gte, sql, desc, ne, asc, isNull, lt, or, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Vercel can start several function instances at once. Serialize the one-time
// additive schema update so simultaneous cold starts do not race DDL on Postgres.
async function applyApplicationSchema() {
    await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(73638198730211::bigint)`);
        const result = await tx.execute(sql`
            SELECT
                EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'trial_course_id'
                ) AS has_trial_course_id,
                to_regclass('public.courses') IS NOT NULL AS has_courses,
                to_regclass('public.modules') IS NOT NULL AS has_modules,
                to_regclass('public.lessons') IS NOT NULL AS has_lessons,
                to_regclass('public.activity_logs') IS NOT NULL AS has_activity_logs,
                to_regclass('public.discount_coupons') IS NOT NULL AS has_discount_coupons,
                to_regclass('public.payment_orders') IS NOT NULL AS has_payment_orders,
                to_regclass('public.discount_coupons_status_idx') IS NOT NULL AS has_coupon_index
        `);
        const schemaState = result.rows[0] as Record<string, boolean>;
        if (Object.values(schemaState).every(Boolean)) return;

        await tx.execute(sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_course_id text`);
        await tx.execute(sql`
            CREATE TABLE IF NOT EXISTS public.courses (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                slug text NOT NULL UNIQUE,
                title text NOT NULL,
                subtitle text,
                description text,
                landing_description text,
                price integer NOT NULL,
                sale_price integer,
                features text[] NOT NULL DEFAULT '{}',
                badge text,
                icon text,
                color text,
                sort_order integer NOT NULL DEFAULT 0,
                is_published boolean NOT NULL DEFAULT false,
                created_at timestamp NOT NULL DEFAULT now(),
                updated_at timestamp NOT NULL DEFAULT now()
            )
        `);
        await tx.execute(sql`
            CREATE TABLE IF NOT EXISTS public.modules (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
                slug text NOT NULL,
                title text NOT NULL,
                description text,
                sort_order integer NOT NULL DEFAULT 0,
                created_at timestamp NOT NULL DEFAULT now(),
                updated_at timestamp NOT NULL DEFAULT now()
            )
        `);
        await tx.execute(sql`
            CREATE TABLE IF NOT EXISTS public.lessons (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
                slug text NOT NULL,
                title text NOT NULL,
                duration text,
                youtube_id text,
                notes_path text,
                free boolean NOT NULL DEFAULT false,
                sort_order integer NOT NULL DEFAULT 0,
                created_at timestamp NOT NULL DEFAULT now(),
                updated_at timestamp NOT NULL DEFAULT now()
            )
        `);
        await tx.execute(sql`
            CREATE TABLE IF NOT EXISTS public.activity_logs (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL REFERENCES public.users(id),
                type text NOT NULL,
                description text,
                path text,
                metadata text,
                created_at timestamp NOT NULL DEFAULT now()
            )
        `);
        await tx.execute(sql`
            CREATE TABLE IF NOT EXISTS public.discount_coupons (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                code text NOT NULL,
                amount_off integer NOT NULL,
                is_used boolean NOT NULL DEFAULT false,
                is_revoked boolean NOT NULL DEFAULT false,
                used_by text,
                used_at timestamp,
                reserved_by uuid,
                reserved_at timestamp,
                reserved_order_id text,
                created_at timestamp NOT NULL DEFAULT now(),
                CONSTRAINT discount_coupons_code_unique UNIQUE (code)
            )
        `);
        await tx.execute(sql`
            CREATE TABLE IF NOT EXISTS public.payment_orders (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                razorpay_order_id text NOT NULL,
                razorpay_payment_id text,
                user_id uuid NOT NULL REFERENCES public.users(id),
                course_id text NOT NULL,
                base_amount integer NOT NULL,
                discount_amount integer NOT NULL DEFAULT 0,
                amount integer NOT NULL,
                coupon_id uuid REFERENCES public.discount_coupons(id),
                status text NOT NULL DEFAULT 'created',
                created_at timestamp NOT NULL DEFAULT now(),
                paid_at timestamp,
                CONSTRAINT payment_orders_razorpay_order_id_unique UNIQUE (razorpay_order_id),
                CONSTRAINT payment_orders_razorpay_payment_id_unique UNIQUE (razorpay_payment_id)
            )
        `);
        await tx.execute(sql`CREATE INDEX IF NOT EXISTS discount_coupons_status_idx ON public.discount_coupons (is_used, is_revoked, reserved_at)`);
    });
}

function isTransientDatabaseConnectionError(error: unknown) {
    let current = error as any;
    while (current?.cause && current.cause !== current) current = current.cause;
    return (
        typeof current?.code === 'string' && (current.code.startsWith('08') || ['ECONNRESET', 'EPIPE', 'ETIMEDOUT', '57P01', '57P02', '57P03'].includes(current.code))
    ) || /connection terminated unexpectedly|connection terminated/i.test(String(current?.message || error));
}

const applicationSchemaReady = (async () => {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            await applyApplicationSchema();
            return;
        } catch (error) {
            if (attempt === maxAttempts - 1 || !isTransientDatabaseConnectionError(error)) throw error;
            await new Promise((resolve) => setTimeout(resolve, 200 * (2 ** attempt)));
        }
    }
})();

// Temporary production diagnostic: report only the database host and presence
// of required public tables, never the connection string or credentials.
const databaseTargetHost = (() => {
    try {
        return new URL(process.env.DATABASE_URL || '').hostname || 'invalid DATABASE_URL';
    } catch {
        return 'invalid DATABASE_URL';
    }
})();
void applicationSchemaReady.then(async () => {
    const result = await db.execute(sql`
        SELECT current_database() AS database_name,
            to_regclass('public.users') IS NOT NULL AS has_public_users,
            to_regclass('public.sessions') IS NOT NULL AS has_public_sessions,
            to_regclass('public.courses') IS NOT NULL AS has_public_courses
    `);
    console.info('[database target diagnostic]', { host: databaseTargetHost, ...result.rows[0] });
}).catch((error) => {
    console.error('[database target diagnostic] schema readiness failed', {
        host: databaseTargetHost,
        message: error instanceof Error ? error.message : String(error),
    });
});

let courseCatalogReady: Promise<void> = Promise.resolve();
let courseCatalogSeedError: unknown = null;

app.use(async (req, res, next) => {
    try {
        await applicationSchemaReady;
        const needsCourseCatalog = req.path === '/api/courses' || req.path.startsWith('/api/courses/') || req.path.startsWith('/api/admin/courses');
        if (needsCourseCatalog) {
            await courseCatalogReady;
            if (courseCatalogSeedError) throw courseCatalogSeedError;
        }
        next();
    } catch (error) {
        if (req.path === '/api/courses' || req.path.startsWith('/api/courses/') || req.path.startsWith('/api/admin/courses')) {
            console.error('[course catalog] Initialization failed:', error);
            res.status(503).json({ error: 'Course catalog is temporarily unavailable' });
        } else {
            console.error('[database schema] Startup migration failed:', error);
            res.status(503).json({ error: 'Database schema update failed; API is temporarily unavailable' });
        }
    }
});

// Initialize hardcoded legacy codes into the database so they are tracked
async function initStaticCodes() {
    try {
        await applicationSchemaReady;
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
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'https://devmastery.space', 'https://www.devmastery.space'],
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

// Session middleware is defined before routes so user-owned endpoints can use it.
const requireSessionUser = async (req: any, res: any, next: any) => {
    try {
        const authHeader = req.headers.authorization || '';
        const sessionId = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        if (!sessionId || sessionId.length < 10) return res.status(401).json({ error: 'Authentication required' });
        const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
        if (!session) return res.status(401).json({ error: 'Invalid session' });
        const [user] = await db.select().from(users).where(eq(users.id, session.userId));
        if (!user || user.status !== 'active') return res.status(403).json({ error: 'Account is unavailable' });
        req.authUser = user;
        next();
    } catch (error) {
        console.error('[requireSessionUser] Middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

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

        const { sub: googleId, email, name, picture, email_verified: emailVerified } = payload;
        if (!email || !emailVerified) return res.status(403).json({ error: 'A verified Google email is required' });
        const adminEmails = new Set(['admin@devmastery.com', 'sami112xxkhan@gmail.com']);

        // 1. Sync User
        let [user] = await db.select().from(users).where(eq(users.googleId, googleId));

        if (!user) {
            const [existingEmailUser] = await db.select().from(users).where(eq(users.email, email));
            if (existingEmailUser) {
                if (existingEmailUser.googleId && existingEmailUser.googleId !== 'hardcoded-admin') {
                    return res.status(409).json({ error: 'This account is linked to a different Google identity' });
                }
                [user] = await db.update(users).set({
                    googleId,
                    lastLoginAt: new Date(),
                    name: name || existingEmailUser.name,
                    picture: picture || existingEmailUser.picture,
                    role: adminEmails.has(email.toLowerCase()) ? 'admin' : existingEmailUser.role,
                }).where(eq(users.id, existingEmailUser.id)).returning();
            } else {
                [user] = await db.insert(users).values({
                    googleId,
                    email,
                    name: name || email,
                    picture,
                    role: adminEmails.has(email.toLowerCase()) ? 'admin' : 'student',
                }).returning();
            }
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

        res.json({ user, sessionId: session.id });
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

// Retired: the former endpoint created admin sessions from a public email-only request.
app.post("/api/auth/admin-session", (_req, res) => {
    res.status(410).json({ error: "Use an authenticated admin account to sign in" });
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
app.post("/api/auth/profile", requireSessionUser, async (req: any, res) => {
    const {
        name, username,
        emailNotifs, pushNotifs, courseUpdates, soundEffects,
        profileVisibility, showProgress, showStreak
    } = req.body;

    try {
        const [updatedUser] = await db.update(users)
            .set({
                name,
                username,
                emailNotifs: emailNotifs !== undefined ? emailNotifs : undefined,
                pushNotifs: pushNotifs !== undefined ? pushNotifs : undefined,
                courseUpdates: courseUpdates !== undefined ? courseUpdates : undefined,
                soundEffects: soundEffects !== undefined ? soundEffects : undefined,
                profileVisibility: profileVisibility !== undefined ? profileVisibility : undefined,
                showProgress: showProgress !== undefined ? showProgress : undefined,
                showStreak: showStreak !== undefined ? showStreak : undefined,
            })
            .where(eq(users.id, req.authUser.id))
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
        if (!sessionUser || sessionUser.status !== 'active' || sessionUser.email !== email) return res.status(403).json({ error: "Cannot update another user's progress" });

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
            const hasActiveTrial = user.trialCourseId === courseRow.slug
                && !!user.trialExpiresAt
                && user.trialExpiresAt.getTime() > Date.now();
            if (!user.purchasedCourses?.includes(courseRow.slug) && !hasActiveTrial) {
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
app.post("/api/auth/logout", requireSessionUser, async (req: any, res) => {
    const sessionId = (req.headers.authorization || '').replace(/^Bearer /, '');

    try {
        await db.update(sessions)
            .set({ isActive: false })
            .where(eq(sessions.id, sessionId));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to logout" });
    }
});

// Kept as a closed legacy route so old clients cannot grant courses without a verified payment.
app.post("/api/auth/purchase", async (_req, res) => {
    res.status(410).json({ error: "Purchases must be completed through verified Razorpay checkout" });
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

        res.json({ success: true, user });
    } catch (error) {
        console.error("Heartbeat error:", error);
        res.status(500).json({ error: "Heartbeat failed" });
    }
});

// Feedback Endpoints
app.get("/api/feedback", requireSessionUser, async (req: any, res) => {
    try {
        const items = req.authUser.role === 'admin'
            ? await db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt))
            : await db.select().from(feedbackTable).where(eq(feedbackTable.userId, req.authUser.id)).orderBy(desc(feedbackTable.createdAt));
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch feedback" });
    }
});

app.post("/api/feedback", requireSessionUser, async (req: any, res) => {
    const { content, type } = req.body;
    if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: "Feedback content required" });
    try {
        const [item] = await db.insert(feedbackTable).values({
            userId: req.authUser.id,
            userName: req.authUser.name,
            content: content.trim(),
            type: type || "feedback",
        }).returning();
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: "Failed to add feedback" });
    }
});

app.patch("/api/feedback/:id", requireAdmin, async (req, res) => {
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

app.delete("/api/feedback/:id", requireAdmin, async (req, res) => {
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
const getRazorpayCredentials = () => ({
    keyId: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
});

const razorpayRequest = async (endpoint: string, init: RequestInit = {}) => {
    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret) throw new Error('Razorpay is not configured on the server');
    const response = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
        ...init,
        headers: {
            Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
        console.error('[Razorpay API]', response.status, data?.error?.description || data?.error?.code || 'request failed');
        throw new Error(data?.error?.description || 'Razorpay request failed');
    }
    return data;
};

const getCourseQuote = async (courseId: string, user: any) => {
    if (courseId === 'ai_upgrade') {
        const [offerSetting] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'bundle_offer_active'));
        const isOfferActive = offerSetting ? offerSetting.value === 'true' : true;
        const owned = user.purchasedCourses || [];
        const hasAnotherCourse = owned.some((slug: string) => slug !== 'ai');
        if (!isOfferActive || !hasAnotherCourse || owned.includes('ai')) return null;
        return { courseId, title: 'AI Course Upgrade', amount: 2000 };
    }

    const fallbackCatalog: Record<string, { title: string; price: number; salePrice: number | null }> = {
        fullstack: { title: 'Full Stack Web Dev', price: 15000, salePrice: 8000 },
        cyber: { title: '90 Days Cyber Security', price: 8000, salePrice: 5000 },
        datascience: { title: 'Data Science Specialization', price: 12000, salePrice: 8000 },
        ai: { title: 'AI & Machine Learning', price: 5000, salePrice: 2000 },
        cloudcomputing: { title: 'Cloud Computing', price: 11500, salePrice: null },
    };
    let course: typeof courses.$inferSelect | undefined;
    try {
        [course] = await db.select().from(courses).where(eq(courses.slug, courseId));
    } catch (error) {
        // Older installations use the bundled catalogue and may not have the dynamic courses table yet.
        console.warn('[checkout] Dynamic course catalogue unavailable; using bundled prices:', error);
    }
    if (course && !course.isPublished) return null;
    const fallback = fallbackCatalog[courseId];
    if (!course && !fallback) return null;
    let isOfferActive = true;
    try {
        const [offerSetting] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'bundle_offer_active'));
        if (offerSetting) isOfferActive = offerSetting.value === 'true';
    } catch {
        // The bundled catalogue keeps its default offer when settings have not been migrated yet.
    }
    const catalogPrice = course
        ? (course.salePrice ?? course.price)
        : (fallback!.salePrice ?? fallback!.price);
    const amount = courseId === 'fullstack' && isOfferActive
        ? 10000
        : catalogPrice;
    if (!Number.isInteger(amount) || amount < 1) return null;
    return { courseId, title: course?.title || fallback!.title, amount };
};

const getAvailableCoupon = async (code: string) => {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) return null;
    const [coupon] = await db.select().from(discountCoupons).where(and(
        eq(discountCoupons.code, normalized),
        eq(discountCoupons.isUsed, false),
        eq(discountCoupons.isRevoked, false),
    ));
    if (!coupon) return null;
    const reservationExpiredAt = new Date(Date.now() - 21 * 60 * 1000);
    if (coupon.reservedBy && coupon.reservedAt && coupon.reservedAt > reservationExpiredAt) return null;
    return coupon;
};

const createDiscountCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join('');
};

app.post('/api/coupons/preview', requireSessionUser, async (req: any, res) => {
    const { couponCode, courseId } = req.body || {};
    if (!couponCode || !courseId) return res.status(400).json({ error: 'Coupon code and course are required' });
    try {
        const user = req.authUser;
        if ((user.purchasedCourses || []).includes(courseId) || (courseId === 'ai_upgrade' && (user.purchasedCourses || []).includes('ai'))) {
            return res.status(409).json({ error: 'You already own this course' });
        }
        const quote = await getCourseQuote(courseId, user);
        if (!quote) return res.status(400).json({ error: 'This course is not available for purchase' });
        const coupon = await getAvailableCoupon(couponCode);
        if (!coupon) return res.status(400).json({ error: 'Coupon is invalid, already used, revoked, or in another checkout' });
        const discountAmount = Math.min(coupon.amountOff, Math.max(0, quote.amount - 1));
        res.json({
            code: coupon.code,
            baseAmount: quote.amount,
            amountOff: coupon.amountOff,
            discountAmount,
            finalAmount: quote.amount - discountAmount,
            discountCapped: discountAmount < coupon.amountOff,
        });
    } catch (error) {
        console.error('Coupon preview error:', error);
        res.status(500).json({ error: 'Could not validate coupon right now' });
    }
});

app.post('/api/payments/create-order', requireSessionUser, async (req: any, res) => {
    const { courseId, couponCode } = req.body || {};
    if (!courseId) return res.status(400).json({ error: 'Course is required' });
    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret) return res.status(503).json({ error: 'Razorpay is not configured on the server' });

    const user = req.authUser;
    const ownedCourses = user.purchasedCourses || [];
    if (ownedCourses.includes(courseId) || (courseId === 'ai_upgrade' && ownedCourses.includes('ai'))) {
        return res.status(409).json({ error: 'You already own this course' });
    }

    let couponId: string | null = null;
    let couponReserved = false;
    try {
        const quote = await getCourseQuote(courseId, user);
        if (!quote) return res.status(400).json({ error: 'This course is not available for purchase' });

        let coupon: any = null;
        let discountAmount = 0;
        if (couponCode) {
            coupon = await getAvailableCoupon(couponCode);
            if (!coupon) return res.status(400).json({ error: 'Coupon is invalid, already used, revoked, or in another checkout' });
            const reservationExpiredAt = new Date(Date.now() - 21 * 60 * 1000);
            const [reserved] = await db.update(discountCoupons)
                .set({ reservedBy: user.id, reservedAt: new Date(), reservedOrderId: null })
                .where(and(
                    eq(discountCoupons.id, coupon.id),
                    eq(discountCoupons.isUsed, false),
                    eq(discountCoupons.isRevoked, false),
                    or(isNull(discountCoupons.reservedBy), lt(discountCoupons.reservedAt, reservationExpiredAt)),
                ))
                .returning();
            if (!reserved) return res.status(409).json({ error: 'This coupon is currently being used in another checkout' });
            couponId = coupon.id;
            couponReserved = true;
            discountAmount = Math.min(coupon.amountOff, Math.max(0, quote.amount - 1));
        }

        const amount = quote.amount - discountAmount;
        const razorpayOrder = await razorpayRequest('/orders', {
            method: 'POST',
            body: JSON.stringify({
                amount: amount * 100,
                currency: 'INR',
                receipt: `dm${Date.now().toString(36)}${randomInt(0xffffff).toString(36)}`,
                expire_by: Math.floor(Date.now() / 1000) + 20 * 60,
                notes: { userId: user.id, courseId: quote.courseId, couponCode: coupon?.code || '' },
            }),
        });

        await db.transaction(async (tx) => {
            await tx.insert(paymentOrders).values({
                razorpayOrderId: razorpayOrder.id,
                userId: user.id,
                courseId: quote.courseId,
                baseAmount: quote.amount,
                discountAmount,
                amount,
                couponId,
                status: 'created',
            });
            if (couponId) {
                const [linkedCoupon] = await tx.update(discountCoupons)
                    .set({ reservedOrderId: razorpayOrder.id })
                    .where(and(
                        eq(discountCoupons.id, couponId),
                        eq(discountCoupons.reservedBy, user.id),
                        isNull(discountCoupons.reservedOrderId),
                        eq(discountCoupons.isUsed, false),
                    ))
                    .returning();
                if (!linkedCoupon) throw new Error('Could not reserve coupon for this payment');
            }
        });

        res.json({
            orderId: razorpayOrder.id,
            keyId,
            amount: amount * 100,
            currency: 'INR',
            courseId: quote.courseId,
            title: quote.title,
            baseAmount: quote.amount,
            discountAmount,
            finalAmount: amount,
        });
    } catch (error) {
        if (couponReserved && couponId) {
            await db.update(discountCoupons)
                .set({ reservedBy: null, reservedAt: null, reservedOrderId: null })
                .where(and(eq(discountCoupons.id, couponId), eq(discountCoupons.reservedBy, user.id), eq(discountCoupons.isUsed, false)))
                .catch((releaseError) => console.error('Coupon reservation cleanup error:', releaseError));
        }
        console.error('Payment order creation error:', error);
        res.status(502).json({ error: error instanceof Error ? error.message : 'Could not start payment' });
    }
});

app.post('/api/payments/verify', requireSessionUser, async (req: any, res) => {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (!orderId || !paymentId || !signature) return res.status(400).json({ error: 'Payment verification details are incomplete' });
    const { keySecret } = getRazorpayCredentials();
    if (!keySecret) return res.status(503).json({ error: 'Razorpay is not configured on the server' });

    try {
        const [order] = await db.select().from(paymentOrders).where(and(
            eq(paymentOrders.razorpayOrderId, orderId),
            eq(paymentOrders.userId, req.authUser.id),
        ));
        if (!order) return res.status(404).json({ error: 'Payment order not found' });

        const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest();
        const provided = Buffer.from(String(signature), 'hex');
        if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
            return res.status(400).json({ error: 'Payment signature is invalid' });
        }

        let payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
        if (payment.order_id !== orderId || payment.amount !== order.amount * 100 || payment.currency !== 'INR') {
            return res.status(400).json({ error: 'Payment amount or order does not match' });
        }
        if (payment.status === 'authorized') {
            payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/capture`, {
                method: 'POST',
                body: JSON.stringify({ amount: order.amount * 100, currency: 'INR' }),
            });
        }
        if (payment.status !== 'captured') return res.status(409).json({ error: 'Payment has not been captured yet' });

        const user = await db.transaction(async (tx) => {
            const [lockedOrder] = await tx.select().from(paymentOrders)
                .where(eq(paymentOrders.razorpayOrderId, orderId))
                .for('update');
            if (!lockedOrder || lockedOrder.userId !== req.authUser.id) throw new Error('Payment order not found');
            if (lockedOrder.status === 'paid') {
                if (lockedOrder.razorpayPaymentId !== paymentId) throw new Error('A different payment already completed this order');
                const [existingUser] = await tx.select().from(users).where(eq(users.id, lockedOrder.userId)).for('update');
                return existingUser;
            }
            if (lockedOrder.status !== 'created') throw new Error('This payment order is no longer active');

            if (lockedOrder.couponId) {
                const [claimedCoupon] = await tx.update(discountCoupons)
                    .set({ isUsed: true, usedBy: req.authUser.email, usedAt: new Date(), reservedBy: null, reservedAt: null })
                    .where(and(
                        eq(discountCoupons.id, lockedOrder.couponId),
                        eq(discountCoupons.reservedBy, req.authUser.id),
                        eq(discountCoupons.reservedOrderId, orderId),
                        eq(discountCoupons.isUsed, false),
                        eq(discountCoupons.isRevoked, false),
                    ))
                    .returning();
                if (!claimedCoupon) throw new Error('Coupon reservation could not be confirmed');
            }

            const [existingUser] = await tx.select().from(users).where(eq(users.id, lockedOrder.userId)).for('update');
            if (!existingUser) throw new Error('User not found');
            const currentCourses = existingUser.purchasedCourses || [];
            const grantedCourses = lockedOrder.courseId === 'fullstack'
                ? ['fullstack', 'ai']
                : lockedOrder.courseId === 'ai_upgrade' ? ['ai'] : [lockedOrder.courseId];
            const purchasedCourses = [...new Set([...currentCourses, ...grantedCourses])];
            const [updatedUser] = await tx.update(users)
                .set({ purchasedCourses, trialExpiresAt: null, trialCourseId: null })
                .where(eq(users.id, lockedOrder.userId))
                .returning();
            await tx.update(paymentOrders)
                .set({ razorpayPaymentId: paymentId, status: 'paid', paidAt: new Date() })
                .where(eq(paymentOrders.id, lockedOrder.id));
            return updatedUser;
        });

        res.json({ success: true, courseId: order.courseId, user });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'Payment verification failed' });
    }
});

app.post('/api/payments/release', requireSessionUser, async (req: any, res) => {
    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: 'Payment order is required' });
    try {
        await db.transaction(async (tx) => {
            const [order] = await tx.select().from(paymentOrders).where(and(
                eq(paymentOrders.razorpayOrderId, orderId),
                eq(paymentOrders.userId, req.authUser.id),
            )).for('update');
            if (!order || order.status === 'paid') return;
            await tx.update(paymentOrders).set({ status: 'cancelled' }).where(eq(paymentOrders.id, order.id));
            if (order.couponId) {
                await tx.update(discountCoupons)
                    .set({ reservedBy: null, reservedAt: null, reservedOrderId: null })
                    .where(and(
                        eq(discountCoupons.id, order.couponId),
                        eq(discountCoupons.reservedBy, req.authUser.id),
                        eq(discountCoupons.reservedOrderId, orderId),
                        eq(discountCoupons.isUsed, false),
                    ));
            }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Payment release error:', error);
        res.status(500).json({ error: 'Could not release this checkout' });
    }
});

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
app.post("/api/track", requireSessionUser, async (req: any, res) => {
    const { type, description, path, metadata } = req.body;
    if (!type) return res.status(400).json({ error: "type required" });

    try {
        await db.insert(activityLogs).values({
            userId: req.authUser.id,
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
app.post("/api/certificate/request", requireSessionUser, async (req: any, res) => {
    const { courseId } = req.body;
    if (!courseId || (!(req.authUser.purchasedCourses || []).includes(courseId) && req.authUser.role !== 'admin')) {
        return res.status(403).json({ error: "You must own this course to request its certificate" });
    }

    try {
        const [updated] = await db.update(users)
            .set({ certificateStatus: "pending" })
            .where(eq(users.id, req.authUser.id))
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
app.get("/api/notes/list", requireSessionUser, async (req: any, res) => {
    try {
        const notes = await db.select().from(userNotes).where(eq(userNotes.userId, req.authUser.id));
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch notes" });
    }
});

app.post("/api/notes/save", requireSessionUser, async (req: any, res) => {
    const { lessonId, content } = req.body;
    if (!lessonId || content === undefined) return res.status(400).json({ error: "Lesson ID and Content required" });

    try {
        const user = req.authUser;

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
app.get("/api/playground/list", requireSessionUser, async (req: any, res) => {
    try {
        const user = req.authUser;
        const projects = await db.select().from(playgroundProjects).where(eq(playgroundProjects.userId, user.id)).orderBy(desc(playgroundProjects.updatedAt));
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

app.post("/api/playground/save", requireSessionUser, async (req: any, res) => {
    const { name, type, files, projectId } = req.body;
    if (!name || !type || !files) return res.status(400).json({ error: "Missing required fields" });

    try {
        const user = req.authUser;

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
app.get("/api/ai/chat/history", requireSessionUser, async (req: any, res) => {
    try {
        const user = req.authUser;
        const history = await db.select().from(aiChats).where(eq(aiChats.userId, user.id)).orderBy(aiChats.createdAt);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
});

app.post("/api/ai/chat/save", requireSessionUser, async (req: any, res) => {
    const { role, content, reasoning } = req.body;
    if (!role || !content) return res.status(400).json({ error: "Missing required fields" });

    try {
        const user = req.authUser;

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

app.delete("/api/ai/chat/clear", requireSessionUser, async (req: any, res) => {
    try {
        const user = req.authUser;

        await db.delete(aiChats).where(eq(aiChats.userId, user.id));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to clear chat history" });
    }
});

// ── Access Codes (Trials) ──────────────────────────────────────────────

// Generate a new access code
app.post("/api/admin/codes/generate", requireAdmin, async (req, res) => {
    const { type } = req.body; // New codes: '5mins' or 'lifetime'. Existing '3days' codes remain redeemable.
    if (type !== '5mins' && type !== 'lifetime') {
        return res.status(400).json({ error: "Invalid type. Must be '5mins' or 'lifetime'" });
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

app.get('/api/admin/coupons', requireAdmin, async (_req, res) => {
    try {
        const coupons = await db.select().from(discountCoupons).orderBy(desc(discountCoupons.createdAt));
        res.json(coupons);
    } catch (error) {
        console.error('Coupon list error:', error);
        res.status(500).json({ error: 'Failed to fetch discount coupons' });
    }
});

app.post('/api/admin/coupons/generate', requireAdmin, async (req, res) => {
    const amountOff = Number(req.body?.amountOff);
    if (!Number.isSafeInteger(amountOff) || amountOff < 1 || amountOff > 2147483647) {
        return res.status(400).json({ error: 'Enter a whole-number discount amount greater than zero' });
    }
    try {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const [coupon] = await db.insert(discountCoupons).values({ code: createDiscountCode(), amountOff }).returning();
                return res.json(coupon);
            } catch (error: any) {
                if (error?.code !== '23505' || attempt === 2) throw error;
            }
        }
        return res.status(500).json({ error: 'Could not generate a unique coupon' });
    } catch (error) {
        console.error('Coupon generation error:', error);
        res.status(500).json({ error: 'Failed to generate discount coupon' });
    }
});

app.post('/api/admin/coupons/:code/revoke', requireAdmin, async (req, res) => {
    try {
        const [existing] = await db.select().from(discountCoupons).where(eq(discountCoupons.code, String(req.params.code).toUpperCase()));
        if (!existing) return res.status(404).json({ error: 'Coupon not found' });
        const reservationIsActive = existing.reservedBy && existing.reservedAt && existing.reservedAt > new Date(Date.now() - 21 * 60 * 1000);
        if (reservationIsActive) return res.status(409).json({ error: 'This coupon is reserved by an active checkout. Try again after the checkout expires.' });
        const [coupon] = await db.update(discountCoupons)
            .set({ isRevoked: true })
            .where(eq(discountCoupons.code, String(req.params.code).toUpperCase()))
            .returning();
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        res.json(coupon);
    } catch (error) {
        console.error('Coupon revoke error:', error);
        res.status(500).json({ error: 'Failed to revoke coupon' });
    }
});

app.delete('/api/admin/coupons/:code', requireAdmin, async (req, res) => {
    try {
        const code = String(req.params.code).toUpperCase();
        const [coupon] = await db.select().from(discountCoupons).where(eq(discountCoupons.code, code));
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        const reservationIsActive = coupon.reservedBy && coupon.reservedAt && coupon.reservedAt > new Date(Date.now() - 21 * 60 * 1000);
        if (reservationIsActive) return res.status(409).json({ error: 'This coupon is reserved by an active checkout. Try again after the checkout expires.' });
        const [paymentHistory] = await db.select({ id: paymentOrders.id }).from(paymentOrders).where(eq(paymentOrders.couponId, coupon.id)).limit(1);
        if (paymentHistory || coupon.isUsed) return res.status(409).json({ error: 'Coupons in payment history cannot be deleted. Revoke unused coupons instead.' });
        await db.delete(discountCoupons).where(eq(discountCoupons.id, coupon.id));
        res.json({ success: true });
    } catch (error) {
        console.error('Coupon delete error:', error);
        res.status(500).json({ error: 'Failed to delete coupon' });
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

// Redeem an access code for the authenticated account. Trial access stays separate
// from permanent purchases, and the code claim + grant commit as one transaction.
app.post("/api/codes/redeem", requireSessionUser, async (req: any, res) => {
    const rawCode = req.body?.code;
    const requestedCourseId = req.body?.courseId || 'fullstack';
    if (typeof rawCode !== 'string' || typeof requestedCourseId !== 'string') {
        return res.status(400).json({ error: 'Code and course are required' });
    }
    const normalizedCode = rawCode.toUpperCase().trim();
    const courseId = requestedCourseId === 'ai_upgrade' ? 'ai' : requestedCourseId;

    try {
        const [course] = await db.select().from(courses).where(and(eq(courses.slug, courseId), eq(courses.isPublished, true)));
        if (!course) return res.status(400).json({ error: 'Choose an available course' });
        const result = await db.transaction(async (tx) => {
            const [currentUser] = await tx.select().from(users).where(eq(users.id, req.authUser.id)).for('update');
            if (!currentUser) throw new Error('User account not found');
            const currentCourses: string[] = currentUser.purchasedCourses || [];
            if (currentCourses.includes(courseId)) throw new Error('You already own this course');
            const [accessCode] = await tx.select().from(accessCodes)
                .where(and(eq(accessCodes.code, normalizedCode), eq(accessCodes.isUsed, false), eq(accessCodes.isRevoked, false)))
                .for('update');
            if (!accessCode) throw new Error('Invalid, used, or revoked code');

            const [claimed] = await tx.update(accessCodes)
                .set({ isUsed: true, usedBy: req.authUser.email })
                .where(and(eq(accessCodes.id, accessCode.id), eq(accessCodes.isUsed, false), eq(accessCodes.isRevoked, false)))
                .returning();
            if (!claimed) throw new Error('Invalid, used, or revoked code');

            const isLifetime = accessCode.type === 'lifetime';
            const now = new Date();
            const duration = accessCode.type === '3days' ? 3 * 24 * 60 * 60 * 1000 : 5 * 60 * 1000;
            const trialExpiresAt = isLifetime ? null : new Date(now.getTime() + duration);
            const coursesToGrant = courseId === 'fullstack' ? ['fullstack', 'ai'] : [courseId];
            const updatedCourses = isLifetime
                ? [...new Set([...currentCourses, ...coursesToGrant])]
                : currentCourses;
            const [updatedUser] = await tx.update(users).set({
                purchasedCourses: updatedCourses,
                trialExpiresAt,
                trialCourseId: isLifetime ? null : courseId,
            }).where(eq(users.id, req.authUser.id)).returning();
            if (!updatedUser) throw new Error('User account could not be updated');
            return { accessCode, updatedUser, trialExpiresAt };
        });

        res.json({
            success: true,
            trialExpiresAt: result.trialExpiresAt?.toISOString(),
            isPaid: result.accessCode.type === 'lifetime',
            type: result.accessCode.type,
            courseId,
            message: result.accessCode.type === 'lifetime'
                ? 'Lifetime access granted for this course. This one-time code cannot be used again.'
                : 'Trial activated. Your timer has started.',
            user: result.updatedUser,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to redeem code';
        const isClientError = message.startsWith('Invalid, used') || message.startsWith('User account') || message.startsWith('You already own');
        if (!isClientError) console.error('Code redeem error:', error);
        res.status(isClientError ? 400 : 500).json({ error: message });
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
                    if (sessionUser?.status === 'active') {
                        const hasActiveTrial = sessionUser.trialCourseId === course.slug
                            && !!sessionUser.trialExpiresAt
                            && sessionUser.trialExpiresAt.getTime() > Date.now();
                        hasAccess = sessionUser.role === 'admin' || (sessionUser.purchasedCourses || []).includes(course.slug) || hasActiveTrial;
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
        let trialCourseId: string | null = null;
        let trialExpiresAt: Date | null = null;
        const authHeader = req.headers.authorization || '';
        const sessionId = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        if (sessionId) {
            try {
                const [session] = await db.select().from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)));
                if (session) {
                    const [sessionUser] = await db.select().from(users).where(eq(users.id, session.userId));
                    if (sessionUser?.status === 'active') {
                        purchasedCourses = sessionUser.purchasedCourses || [];
                        isAdmin = sessionUser.role === 'admin';
                        trialCourseId = sessionUser.trialCourseId;
                        trialExpiresAt = sessionUser.trialExpiresAt;
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
            const hasActiveTrial = trialCourseId === course.slug && !!trialExpiresAt && trialExpiresAt.getTime() > Date.now();
            const hasAccess = isAdmin || purchasedCourses.includes(course.slug) || hasActiveTrial;

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
// SEED: Populate missing courses, modules, and lessons without overwriting edits
// ═══════════════════════════════════════════════════════════════════════════════

async function withCourseSeedLock<T>(work: (tx: any) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(73638198730212::bigint)`);
        return work(tx);
    });
}

const minimumSeededCurricula = {
    fullstack: { modules: 6, lessons: 24 },
    cyber: { modules: 10, lessons: 19 },
    datascience: { modules: 4, lessons: 16 },
    ai: { modules: 1, lessons: 1 },
    cloudcomputing: { modules: 7, lessons: 25 },
};

async function hasSeededCurricula(tx: any, expected: Record<string, { modules: number; lessons: number }>) {
    const counts = await tx.select({
        slug: courses.slug,
        moduleCount: sql<number>`count(distinct ${modules.id})::int`,
        lessonCount: sql<number>`count(${lessons.id})::int`,
    })
        .from(courses)
        .leftJoin(modules, eq(modules.courseId, courses.id))
        .leftJoin(lessons, eq(lessons.moduleId, modules.id))
        .where(inArray(courses.slug, Object.keys(expected)))
        .groupBy(courses.slug);

    const countBySlug = new Map(counts.map((row: any) => [row.slug, row]));
    return Object.entries(expected).every(([slug, minimum]) => {
        const row = countBySlug.get(slug) as any;
        return row && Number(row.moduleCount) >= minimum.modules && Number(row.lessonCount) >= minimum.lessons;
    });
}

async function findOrCreateCourse(courseData: any, tx: any) {
    const [existing] = await tx.select().from(courses).where(eq(courses.slug, courseData.slug)).limit(1);
    if (existing) return existing;

    const [inserted] = await tx.insert(courses).values(courseData)
        .onConflictDoNothing({ target: courses.slug })
        .returning();
    if (inserted) return inserted;

    const [createdConcurrently] = await tx.select().from(courses).where(eq(courses.slug, courseData.slug)).limit(1);
    if (!createdConcurrently) throw new Error(`Course ${courseData.slug} could not be created`);
    return createdConcurrently;
}

async function seedCourseCurriculum(courseId: string, moduleData: any[], tx: any) {
    const existingModules: Array<typeof modules.$inferSelect> = await tx.select().from(modules).where(eq(modules.courseId, courseId));
    const modulesBySlug = new Map<string, typeof modules.$inferSelect>(existingModules.map((module) => [module.slug, module]));
    const missingModules = moduleData
        .map((module, index) => ({ module, index }))
        .filter(({ module }) => !modulesBySlug.has(module.slug))
        .map(({ module, index }) => ({
            courseId,
            slug: module.slug,
            title: module.title,
            description: module.description,
            sortOrder: index,
        }));

    if (missingModules.length) {
        const insertedModules: Array<typeof modules.$inferSelect> = await tx.insert(modules).values(missingModules).returning();
        for (const module of insertedModules) modulesBySlug.set(module.slug, module);
    }

    const moduleIds = [...modulesBySlug.values()].map((module) => module.id);
    if (!moduleIds.length) return;

    const existingLessons: Array<typeof lessons.$inferSelect> = await tx.select().from(lessons).where(inArray(lessons.moduleId, moduleIds));
    const lessonKeys = new Set(existingLessons.map((lesson) => `${lesson.moduleId}:${lesson.slug}`));
    const missingLessons: Array<typeof lessons.$inferInsert> = [];

    for (const module of moduleData) {
        const seededModule = modulesBySlug.get(module.slug);
        if (!seededModule) continue;
        for (let index = 0; index < module.lessons.length; index++) {
            const lesson = module.lessons[index];
            const key = `${seededModule.id}:${lesson.slug}`;
            if (lessonKeys.has(key)) continue;
            lessonKeys.add(key);
            missingLessons.push({
                moduleId: seededModule.id,
                slug: lesson.slug,
                title: lesson.title,
                duration: lesson.duration,
                youtubeId: lesson.youtubeId || null,
                notesPath: lesson.notesPath || null,
                free: lesson.free || false,
                sortOrder: index,
            });
        }
    }

    if (missingLessons.length) await tx.insert(lessons).values(missingLessons);
}

async function seedCoursesFromStaticData() {
    try {
        await applicationSchemaReady;
        await withCourseSeedLock(async (tx) => {
        if (await hasSeededCurricula(tx, {
            fullstack: minimumSeededCurricula.fullstack,
            cyber: minimumSeededCurricula.cyber,
            datascience: minimumSeededCurricula.datascience,
            ai: minimumSeededCurricula.ai,
        })) {
            console.log('[Seed] Core course curricula already complete; skipping seed queries.');
            return;
        }

        // ── Full Stack ──
        const fs = await findOrCreateCourse({
            slug: 'fullstack', title: 'Full Stack Web Dev',
            subtitle: 'Master the Modern Stack',
            description: 'From Hello World to deployed SaaS application. Master frontend, backend, databases, and deploy real applications.',
            landingDescription: "From 'Hello World' to deployed SaaS application.",
            price: 15000, salePrice: 8000,
            features: ['Lifetime Access to Full Stack Content', 'Frontend & Backend Deep Dive', 'AI Mentor Support (Beta)', '5+ Real World Projects', 'Certificate of Completion', 'Discord Community Access'],
            icon: 'BookOpen', color: 'emerald', sortOrder: 0, isPublished: true
        }, tx);

        // ── Cybersecurity ──
        const cy = await findOrCreateCourse({
            slug: 'cyber', title: '90 Days Cyber Security',
            subtitle: '90 Day Program',
            description: 'Master cybersecurity in 90 days — from networking and Linux to ethical hacking and cloud security.',
            landingDescription: 'Ethical hacking, penetration testing, network security, and defensive strategies used by industry professionals.',
            price: 8000, salePrice: 5000,
            features: ['90 Days Intensive Training', 'Ethical Hacking Workshops', 'Linux & Networking Deep Dive', 'Certificate of Completion', 'Discord Community Access'],
            icon: 'Shield', color: 'blue', sortOrder: 1, isPublished: true
        }, tx);

        // ── Data Science ──
        const ds = await findOrCreateCourse({
            slug: 'datascience', title: 'Data Science Specialization',
            subtitle: 'Analytics & ML',
            description: 'Unlock the power of data through Python, math, machine learning, and visualization.',
            landingDescription: 'Python, statistics, data visualization, machine learning, and real-world data projects from scratch.',
            price: 12000, salePrice: 8000,
            features: ['Complete ML & Math Foundation', 'Python & Data Wrangling Projects', 'Advanced Data Visualization', 'Certificate of Completion', 'Discord Community Access'],
            icon: 'Award', color: 'purple', sortOrder: 2, isPublished: true
        }, tx);

        // ── AI ──
        const ai = await findOrCreateCourse({
            slug: 'ai', title: 'AI & Machine Learning',
            subtitle: 'AI Course',
            description: 'Complete AI & Machine Learning course. Builds on your Full Stack skills with hands-on AI projects.',
            landingDescription: 'Complete AI & Machine Learning course.',
            price: 5000, salePrice: 2000,
            features: ['Complete AI & ML Course Content', 'Builds on Your Full Stack Skills', 'Hands-on AI Projects', 'Early Access to New AI Modules', 'Discord Community Access'],
            icon: 'Bot', color: 'cyan', sortOrder: 3, isPublished: true
        }, tx);

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

        for (const data of Object.values(courseMap)) {
            await seedCourseCurriculum(data.course.id, data.moduleData, tx);
        }

        console.log("[Seed] Verified static course curricula and filled missing modules and lessons.");
        });
    } catch (error) {
        console.error("[Seed] Failed to seed courses:", error);
        throw error;
    }
}

// SEED: Ensure Cloud Computing course curriculum is complete
async function seedCloudComputingCourse() {
    try {
        await applicationSchemaReady;
        await withCourseSeedLock(async (tx) => {
        if (await hasSeededCurricula(tx, { cloudcomputing: minimumSeededCurricula.cloudcomputing })) {
            console.log('[Seed] Cloud Computing curriculum already complete; skipping seed queries.');
            return;
        }

        const cc = await findOrCreateCourse({
            slug: 'cloudcomputing', title: 'Cloud Computing',
            subtitle: 'NPTEL Cloud Computing',
            description: 'Master cloud computing from fundamentals to platform deployment — covering architecture, virtualization, XML & web services, MapReduce, OpenStack, Azure, and GCP.',
            landingDescription: 'From cloud fundamentals to Azure & GCP deployment.',
            price: 11500, salePrice: null,
            features: ['25+ Video Lessons', 'Cloud Architecture & Deployment', 'Azure & GCP Hands-On', 'OpenStack & MapReduce', 'Certificate of Completion', 'Discord Community Access'],
            icon: 'Cloud', color: 'sky', sortOrder: 4, isPublished: true
        }, tx);

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

        await seedCourseCurriculum(cc.id, ccModules, tx);
        console.log("[Seed] Verified Cloud Computing curriculum and filled missing modules and lessons.");
        });
    } catch (error) {
        console.error("[Seed] Failed to seed Cloud Computing course:", error);
        throw error;
    }
}

courseCatalogReady = seedCoursesFromStaticData()
    .then(() => seedCloudComputingCourse())
    .then(() => undefined)
    .catch((error) => {
        courseCatalogSeedError = error;
        console.error('[course catalog] Seed startup failed:', error);
    });


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
