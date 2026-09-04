import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const installmentId = parseInt(params.id);
    const { amount, paymentMethod, paidDate } = await request.json();

    const payment = await prisma.installmentPayment.create({
        data: {
            contractId: installmentId,
            amount: amount,
            paymentMethod: paymentMethod || 'CASH',
            paidDate: paidDate ? new Date(paidDate) : new Date(),
            status: 'PAID',
        },
    });

    // Update remaining balance
    const contract = await prisma.installment.findUnique({
        where: { id: installmentId },
    });
    if (contract) {
        const newBalance = contract.remainingBalance - amount;
        await prisma.installment.update({
            where: { id: installmentId },
            data: {
                remainingBalance: Math.max(newBalance, 0),
                status: newBalance <= 0 ? 'COMPLETED' : 'ACTIVE',
            },
        });
    }

    return NextResponse.json(payment, { status: 201 });
}