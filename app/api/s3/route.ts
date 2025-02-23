import { NextResponse } from "next/server";


export async function GET(request: Request) {
    return NextResponse.json({
        data: "Time to upload file to S3"
    });
}
