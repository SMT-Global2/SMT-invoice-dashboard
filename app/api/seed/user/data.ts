import { User , Department } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const userSeed : Partial<User>[] = [
    {
        username: 'admin',
        password: bcrypt.hashSync('admin', 10),
        type: 'ADMIN',
        firstName: 'Admin',
        lastName: 'Admin',
        phoneNumber: '1234567890',
        department: Department.ALL_ROUNDER,
    },
    {
        username: 'user',
        password: bcrypt.hashSync('user', 10),
        type: 'USER',
        firstName: 'User',
        lastName: 'User',
        department: Department.ALL_ROUNDER,
    }
]

