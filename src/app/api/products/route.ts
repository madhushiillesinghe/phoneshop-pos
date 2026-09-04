import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';  //  fixed import

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const lowStock = searchParams.get('lowStock') === 'true';

    const where = lowStock ? { stock: { lt: 5 } } : {};

    const products = await prisma.product.findMany({
        where,
        include: { brand: true, category: true },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
    const data = await request.json();
    const product = await prisma.product.create({
        data: {
            name: data.name,
            barcode: data.barcode,
            imei: data.imei,
            serialNumber: data.serialNumber,
            brandId: data.brandId || null,
            categoryId: data.categoryId || null,
            storage: data.storage,
            ram: data.ram,
            color: data.color,
            purchasePrice: data.purchasePrice,
            sellingPrice: data.sellingPrice,
            discountPrice: data.discountPrice,
            tax: data.tax || 0,
            stock: data.stock || 0,
            reorderLevel: data.reorderLevel || 5,
            warrantyMonths: data.warrantyMonths || 12,
            description: data.description,
        },
    });
    return NextResponse.json(product, { status: 201 });
}