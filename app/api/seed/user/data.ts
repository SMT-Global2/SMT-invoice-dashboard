import bcrypt from 'bcryptjs';

export const userSeed = [
    {
        username: 'admin',
        password: bcrypt.hashSync('admin', 10),
        type: 'ADMIN'
    },
    {
        username: 'user',
        password: bcrypt.hashSync('user', 10),
        type: 'USER'
    }
]