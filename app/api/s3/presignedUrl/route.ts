import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Define the schema for request validation
const uploadSchema = z.object({
  fileName: z.string().min(1, "Filename is required"),
  contentType: z.string().min(1, "Content type is required").refine(
    (type) => type.startsWith('image/'),
    "Only image files are allowed"
  ),
});

const s3Client = new S3Client({
  region: process.env.S3_REGION as string,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY as string,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
  },
});

export async function POST(request: Request) {
  try {

    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate the request body
    const result = uploadSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          issues: result.error.issues 
        },
        { status: 400 }
      );
    }

    const { fileName, contentType } = result.data;

    // Generate a unique key for the file
    const key = `${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // Generate pre-signed URL valid for 5 minutes
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    return NextResponse.json({
      presignedUrl,
      key,
    });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return NextResponse.json(
      { error: "Failed to generate pre-signed URL" },
      { status: 500 }
    );
  }
}
