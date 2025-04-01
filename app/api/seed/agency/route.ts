import { prisma } from '@/lib/prisma'
import { agencyDataSeed } from "./data"

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

    const data = await prisma.agencyCode.createMany({
      data: agencyDataSeed.map((item) => ({
        code: item.code.toString(),
        companyName: item.companyName,
        shortName: item.shortName,
      }))
    })
    return Response.json({data})
  } catch (error) {
    return Response.json({error}, {status: 500})  
  }
}