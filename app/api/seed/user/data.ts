import { Department, UserType } from '@prisma/client';
import bcrypt from 'bcryptjs';

type UserSeed = {
    username: string;
    password: string;
    visiblePassword: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    department: Department;
    type: UserType;
    email?: string;
    address?: string;
}

export const userSeed: UserSeed[] = [
    {
        username: 'admin',
        password: bcrypt.hashSync('admin', 10),
        visiblePassword: 'admin',
        type: UserType.ADMIN,
        firstName: 'Admin',
        lastName: 'Admin',
        phoneNumber: '1234567890',
        department: Department.ALL_ROUNDER,
    },
]

