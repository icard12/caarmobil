import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const projectRoot = process.cwd();

// Load .env only for local development
if (!(process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production')) {
    const envPath = path.join(projectRoot, '.env');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    }
}

let databaseUrl = process.env.DATABASE_URL;

// 1. Search for ANY environment variable that looks like a Postgres URL
// (Sometimes Railway/Render uses keys like POSTGRES_URL, DATABASE_PUBLIC_URL, etc.)
if (!databaseUrl) {
    for (const [key, value] of Object.entries(process.env)) {
        if (value && (value.startsWith('postgres://') || value.startsWith('postgresql://'))) {
            console.log(`[DB-Config] Auto-discovered database URL in variable: ${key}`);
            databaseUrl = value;
            break;
        }
    }
}

// 2. Reconstruct URL from parts if still missing
if (!databaseUrl && process.env.PGHOST) {
    databaseUrl = `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE}`;
}

// 3. CRITICAL: Fix Protocol for Prisma
if (databaseUrl && (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production')) {
    if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
        databaseUrl = 'postgresql://' + databaseUrl;
    }
}

// 4. Force SSL for Production
if (databaseUrl && !databaseUrl.includes('sslmode=') && (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production')) {
    databaseUrl += databaseUrl.includes('?') ? '&sslmode=no-verify' : '?sslmode=no-verify';
}

// 5. Fallback for Production (Prevent Crash) but Log Loudly
if (!databaseUrl && (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production')) {
    console.error('❌ [DB-Config] CRITICAL: No DATABASE_URL found! Please add PostgreSQL in Railway.');
    console.warn('[DB-Config] Using dummy URL to keep server alive (DB features will fail).');
    databaseUrl = "postgresql://user:pass@localhost:5432/db_not_configured";
}

// 6. Update global env
if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
    // Log masked URL for debugging
    const masked = databaseUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`[DB-Config] Final Connection String: ${masked}`);
} else {
    console.warn('[DB-Config] Warning: DATABASE_URL is undefined (Using SQLite local fallback if not in prod).');
}

export const prisma = new PrismaClient({
    datasources: {
        db: {
            // Check if we have a valid URL logic, otherwise default to sqlite local
            url: databaseUrl || "file:./dev.db"
        }
    }
});
