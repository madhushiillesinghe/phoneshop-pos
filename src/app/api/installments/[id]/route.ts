import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

// ============================================================
// GET SINGLE INSTALLMENT
// ============================================================
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const installmentId = Number(id);

        if (isNaN(installmentId)) {
            return NextResponse.json(
                { error: 'Invalid installment ID' },
                { status: 400 }
            );
        }

        const installment = await prisma.installment.findUnique({
            where: {
                id: installmentId,
            },
            include: {
                customer: true,
                sale: true,
                payments: true,
            },
        });

        if (!installment) {
            return NextResponse.json(
                { error: 'Installment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(installment);
    } catch (error) {
        console.error('Error fetching installment:', error);
        return NextResponse.json(
            { error: 'Failed to fetch installment' },
            { status: 500 }
        );
    }
}

// ============================================================
// UPDATE INSTALLMENT
// ============================================================
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const installmentId = Number(id);

        if (isNaN(installmentId)) {
            return NextResponse.json(
                { error: 'Invalid installment ID' },
                { status: 400 }
            );
        }

        const data = await request.json();

        // Check if installment exists first
        const existing = await prisma.installment.findUnique({
            where: { id: installmentId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Installment not found' },
                { status: 404 }
            );
        }

        // Only update fields that are provided in the request
        const updateData: any = {};
        if (data.totalAmount !== undefined) updateData.totalAmount = Number(data.totalAmount);
        if (data.remainingBalance !== undefined) updateData.remainingBalance = Number(data.remainingBalance);
        if (data.monthlyInstallment !== undefined) updateData.monthlyInstallment = Number(data.monthlyInstallment);
        if (data.status !== undefined) updateData.status = data.status;

        const installment = await prisma.installment.update({
            where: {
                id: installmentId,
            },
            data: updateData,
        });

        return NextResponse.json(installment);
    } catch (error) {
        console.error('Error updating installment:', error);
        return NextResponse.json(
            { error: 'Failed to update installment' },
            { status: 500 }
        );
    }
}

// ============================================================
// DELETE INSTALLMENT
// ============================================================
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const installmentId = Number(id);

        if (isNaN(installmentId)) {
            return NextResponse.json(
                { error: 'Invalid installment ID' },
                { status: 400 }
            );
        }

        // Check if installment exists first
        const existing = await prisma.installment.findUnique({
            where: { id: installmentId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Installment not found' },
                { status: 404 }
            );
        }

        await prisma.installment.delete({
            where: {
                id: installmentId,
            },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting installment:', error);
        return NextResponse.json(
            { error: 'Failed to delete installment' },
            { status: 500 }
        );
    }
}