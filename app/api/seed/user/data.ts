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
    // {
    //     username: 'SMTadmin',
    //     password: bcrypt.hashSync('Yash@123', 10),
    //     visiblePassword: 'Yash@123',
    //     type: UserType.ADMIN,
    //     firstName: 'Smt',
    //     lastName: 'Admin',
    //     phoneNumber: '1234567890',
    //     department: Department.ALL_ROUNDER,
    // },
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
    {
        username: 'user',
        password: bcrypt.hashSync('user', 10),
        visiblePassword: 'user',
        type: UserType.USER,
        firstName: 'User',
        lastName: 'User',
        phoneNumber: '1234567890',
        department: Department.ALL_ROUNDER,
    }
]

