import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Next.js dynamic route params are asynchronous
        const { id } = await params;

        const installmentId = parseInt(id, 10);

        if (isNaN(installmentId)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid installment ID",
                },
                { status: 400 }
            );
        }

        const { amount, paymentMethod, paidDate } = await request.json();

        const paymentAmount = Number(amount);

        if (!paymentAmount || paymentAmount <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid payment amount",
                },
                { status: 400 }
            );
        }

        // Check installment contract
        const contract = await prisma.installment.findUnique({
            where: { id: installmentId },
        });

        if (!contract) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Installment contract not found",
                },
                { status: 404 }
            );
        }

        // Prevent payment greater than remaining balance
        const actualPayment = Math.min(
            paymentAmount,
            Number(contract.remainingBalance)
        );

        // Create payment
        const payment = await prisma.installmentPayment.create({
            data: {
                contractId: installmentId,
                amount: actualPayment,
                paymentMethod: paymentMethod || "CASH",
                paidDate: paidDate ? new Date(paidDate) : new Date(),
                status: "PAID",
            },
        });

        // Update remaining balance
        const newBalance =
            Number(contract.remainingBalance) - actualPayment;

        await prisma.installment.update({
            where: { id: installmentId },
            data: {
                remainingBalance: Math.max(newBalance, 0),
                status: newBalance <= 0 ? "COMPLETED" : "ACTIVE",
            },
        });

        return NextResponse.json(payment, { status: 201 });
    } catch (error) {
        console.error("Installment payment error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to process installment payment",
            },
            { status: 500 }
        );
    }
}