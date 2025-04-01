import { prisma } from '@/lib/prisma'
import { partyCodeSeedUpdated } from "./data"

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

    const data = [];
    for (const item of partyCodeSeedUpdated) {
      const result = await prisma.partyCode.upsert({
        where: {
          code: item["Party Code"]
        },
        update: {
          regionalCode: item["Area Code"]
        },
        create: {
          code: item["Party Code"],
          regionalCode: item["Area Code"],
          customerName: item["Party name"], 
          city: "-"
        }
      });
      data.push(result);
    }

    return Response.json({data})

  } catch (error) {
    return Response.json({error}, {status: 500})  
  }
}