import { prisma } from '@/lib/prisma'
import { partyCodeSeed } from "./data"

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await prisma.partyCode.createMany({
      data: partyCodeSeed.map((item) => ({
        code: item.CODE,
        customerName: item["CUSTOMER NAME"] ?? null,
        city: item?.City ?? null,
      }))
    })
    return Response.json({data})
  } catch (error) {
    console.log(error) 
    return Response.json({error}, {status: 500})  
  }
}