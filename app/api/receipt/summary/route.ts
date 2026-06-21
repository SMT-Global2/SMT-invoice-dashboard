import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import moment from "moment";
import { z } from "zod";

const getQuerySchema = z.object({
  date: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const queryParsed = getQuerySchema.safeParse({
      date: url.searchParams.get("date"),
    });

    if (!queryParsed.success) {
      return NextResponse.json(
        { message: "Invalid query parameters", errors: queryParsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date } = queryParsed.data;

    let dateFilter = {};
    if (date) {
      dateFilter = {
        generatedDate: {
          gte: moment(date).startOf("day").toDate(),
          lt: moment(date).endOf("day").toDate(),
        },
      };
    } else {
      // Default to today if no date provided
      dateFilter = {
        generatedDate: {
          gte: moment().startOf("day").toDate(),
          lt: moment().endOf("day").toDate(),
        },
      };
    }

    const receipts = await prisma.receipt.groupBy({
      by: ["receiptUsername"],
      where: {
        ...dateFilter,
        receiptUsername: { not: null },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const targetDateStr = date ? moment(date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
    const denominations = await prisma.userDailyDenomination.findMany({
      where: { date: targetDateStr }
    });

    const emptyBills = { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 };

    // Format the response (receiptUsername is always non-null here due to the `not: null` filter)
    const summary = receipts.map((r) => {
      const denom = denominations.find(d => d.username === r.receiptUsername);
      return {
        username: r.receiptUsername ?? '',
        totalAmount: r._sum.amount || 0,
        receiptCount: r._count.id || 0,
        bills: denom?.bills ?? emptyBills,
      };
    });

    return NextResponse.json({
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching receipt summary:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
