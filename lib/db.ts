import 'server-only';
import mongoose, { Schema, model, models } from 'mongoose';
import { z } from 'zod';

const MONGODB_URI = process.env.MONGODB_URI!;

// MongoDB connection
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Product Schema
const productSchema = new Schema({
  imageUrl: { type: String, required: true },
  name: { type: String, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['active', 'inactive', 'archived']
  },
  price: { 
    type: Number, 
    required: true,
    get: (v: number) => (v/100).toFixed(2),
    set: (v: number) => v * 100
  },
  stock: { type: Number, required: true },
  availableAt: { type: Date, required: true }
}, {
  timestamps: true
});

export const Product = models.Product || model('Product', productSchema);

// Zod schema for validation
export const insertProductSchema = z.object({
  imageUrl: z.string(),
  name: z.string(),
  status: z.enum(['active', 'inactive', 'archived']),
  price: z.number(),
  stock: z.number(),
  availableAt: z.date()
});

export type ProductType = z.infer<typeof insertProductSchema>;

// Product operations
export async function getProducts(
  search: string,
  offset: number
): Promise<{
  products: ProductType[];
  newOffset: number | null;
  totalProducts: number;
}> {
  await connectDB();
  
  const query = search 
    ? { name: { $regex: search, $options: 'i' } }
    : {};
    
  const limit = 10;
  const products = await Product.find(query)
    .skip(offset)
    .limit(limit)
    .lean() as (ProductType & { _id: unknown; __v: number; })[];
    
  const totalProducts = await Product.countDocuments(query);
  const newOffset = offset + limit < totalProducts ? offset + limit : null;
  
  return {
    products: products.map(({ imageUrl, name, status, price, stock, availableAt }) => ({
      imageUrl,
      name,
      status,
      price,
      stock,
      availableAt
    })),
    newOffset,
    totalProducts
  };
}

export async function deleteProductById(id: string) {
  await connectDB();
  return Product.findByIdAndDelete(id);
}
