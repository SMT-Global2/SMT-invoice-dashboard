import { prisma } from '@/lib/prisma'
import { userSeed } from "./data"
import { UserType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!userSeed || userSeed.length === 0) {
      throw new Error("userSeed data is empty");
    }

    const data = await prisma.user.createMany({
      data: userSeed.map((item) => ({
        username: item.username,
        password: item.password,
        type: item.type as UserType
      }))
    });

    return Response.json({ data });
  } catch (error: any) {
    console.error("Error in GET request:", error);

    return Response.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
