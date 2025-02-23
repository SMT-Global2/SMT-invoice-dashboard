import { prisma } from '@/lib/prisma'
import { partyCodeSeed } from "./data"

export async function GET(request: Request) {
  try {

    const { searchParams } = new URL(request.url)
    const password = searchParams.get('password')

    if(!password) {
      return Response.json({error: 'Password is required'}, {status: 400})
    }

    if(password !== process.env.SEED_PASSWORD) {
      return Response.json({error: 'Invalid password'}, {status: 400})
    }

    const data = await prisma.partyCode.createMany({
      data: partyCodeSeed.map((item) => ({
        code: item.CODE,
        customerName: item["CUSTOMER NAME"] ?? null,
        city: item?.City ?? null,
      }))
    })
    return Response.json({data})
  } catch (error) {
    return Response.json({error}, {status: 500})  
  }
}