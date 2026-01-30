import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function debugLogin() {
    const email = 'caarmobilei@gmail.com';
    const password = 'admin';

    console.log(`--- DEBUG LOGIN FOR ${email} ---`);

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log('❌ USER NOT FOUND in database.');
            return;
        }

        console.log('✅ User found in DB.');
        console.log('Role:', user.role);
        console.log('Active:', user.isActive);
        console.log('Deleted:', user.isDeleted);

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            console.log('✅ PASSWORD MATCHES!');
        } else {
            console.log('❌ PASSWORD DOES NOT MATCH!');
        }

    } catch (error) {
        console.error('❌ DATABASE/BCRYPT ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugLogin();
