import { prisma } from './db.ts';
import bcrypt from 'bcryptjs';

async function main() {
    const email = 'employee@caarmobil.com';
    const password = '123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'employee'
        },
        create: {
            name: 'Funcionario Teste',
            email,
            password: hashedPassword,
            role: 'employee',
            avatar: ''
        }
    });

    console.log(`User ${email} created as employee with password: ${password}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
