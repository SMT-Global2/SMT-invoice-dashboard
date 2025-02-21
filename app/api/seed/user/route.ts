import { prisma } from '@/lib/prisma'
import { userSeed } from "./data"

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await prisma.user.createMany({
      data: userSeed.map((item) => ({
        ...item
      }))
    })
    return Response.json({data})
  } catch (error) {
    console.log(error) 
    return Response.json({error}, {status: 500})  
  }
}