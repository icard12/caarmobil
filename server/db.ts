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

// Reconstruct URL if missing but individual PG vars exist (Common in Railway)
if (!databaseUrl && process.env.PGHOST) {
    databaseUrl = `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE}`;
}

// Ensure SSL for Production
if (databaseUrl && !databaseUrl.includes('sslmode=') && (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production')) {
    databaseUrl += databaseUrl.includes('?') ? '&sslmode=no-verify' : '?sslmode=no-verify';
}

export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl || "file:./dev.db"
        }
    }
});
