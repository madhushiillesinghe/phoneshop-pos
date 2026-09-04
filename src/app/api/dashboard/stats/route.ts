import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        let startDate = from ? new Date(from) : startOfMonth(new Date());
        let endDate = to ? new Date(to) : endOfMonth(new Date());
        endDate.setHours(23, 59, 59, 999);

        // ===== 1. TOP SELLING PRODUCTS (≥10 items) =====
        const topSellingProducts = await prisma.$queryRaw`
            SELECT
                p.id,
                p.name,
                p.stock AS currentStock,
                p.reorderLevel,
                COALESCE(SUM(si.quantity), 0) AS totalSold,
                COALESCE(SUM(si.quantity * si.price), 0) AS totalRevenue,
                COUNT(DISTINCT si.saleId) AS numberOfSales,
                AVG(si.price) AS averagePrice
            FROM Product p
            LEFT JOIN SaleItem si ON p.id = si.productId
            LEFT JOIN Sale s ON si.saleId = s.id AND s.status = 'PAID'
                AND s.saleDate BETWEEN ${startDate} AND ${endDate}
            GROUP BY p.id, p.name, p.stock, p.reorderLevel
            HAVING COALESCE(SUM(si.quantity), 0) >= 10
            ORDER BY totalSold DESC
            LIMIT 10
        `;

        // ===== 2. SLOW SELLING PRODUCTS (<3 items) =====
        const slowSellingProducts = await prisma.$queryRaw`
            SELECT
                p.id,
                p.name,
                p.stock AS currentStock,
                p.reorderLevel,
                COALESCE(SUM(si.quantity), 0) AS totalSold,
                COALESCE(SUM(si.quantity * si.price), 0) AS totalRevenue,
                COUNT(DISTINCT si.saleId) AS numberOfSales
            FROM Product p
                     LEFT JOIN SaleItem si ON p.id = si.productId
                     LEFT JOIN Sale s ON si.saleId = s.id AND s.status = 'PAID'
                AND s.saleDate BETWEEN ${startDate} AND ${endDate}
            GROUP BY p.id, p.name, p.stock, p.reorderLevel
            HAVING COALESCE(SUM(si.quantity), 0) < 3
               AND p.stock > 0
            ORDER BY totalSold ASC
                LIMIT 10
        `;

        // ===== 3. ZERO SALES PRODUCTS (Never Sold) =====
        const zeroSalesProducts = await prisma.$queryRaw`
            SELECT
                p.id,
                p.name,
                p.stock AS currentStock,
                p.reorderLevel,
                0 AS totalSold,
                0 AS totalRevenue,
                0 AS numberOfSales
            FROM Product p
                     LEFT JOIN SaleItem si ON p.id = si.productId
                     LEFT JOIN Sale s ON si.saleId = s.id AND s.status = 'PAID'
            WHERE si.id IS NULL
              AND p.stock > 0
            ORDER BY p.stock DESC
                LIMIT 10
        `;

        // ===== 4. LOW STOCK ITEMS (Less than 5 items in stock) =====
        const lowStockItems = await prisma.product.findMany({
            where: {
                OR: [
                    { stock: 0 },
                    { stock: { lt: 10 } },  // Less than 5 items in stock
                ],
            },
            select: {
                id: true,
                name: true,
                stock: true,
                reorderLevel: true,
                sellingPrice: true,
                purchasePrice: true,
                createdAt: true,
            },
            orderBy: { stock: 'asc' },
        });

        // ===== 5. TODAY'S DATA =====
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);

        const todaySalesAgg = await prisma.sale.aggregate({
            where: {
                saleDate: { gte: todayStart, lte: todayEnd },
                status: 'PAID',
            },
            _sum: { grandTotal: true },
        });
        const todaySales = todaySalesAgg._sum.grandTotal || 0;

        const todayOrders = await prisma.sale.count({
            where: {
                saleDate: { gte: todayStart, lte: todayEnd },
                status: 'PAID',
            },
        });

        // Today's Profit
        const todaySalesWithItems = await prisma.sale.findMany({
            where: {
                saleDate: { gte: todayStart, lte: todayEnd },
                status: 'PAID',
            },
            include: {
                saleItems: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        let todayProfit = 0;
        todaySalesWithItems.forEach((sale) => {
            sale.saleItems.forEach((item) => {
                const profit = (item.price - item.product.purchasePrice) * item.quantity;
                todayProfit += profit;
            });
        });

        // ===== 6. MONTHLY SALES =====
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        const monthlySalesAgg = await prisma.sale.aggregate({
            where: { saleDate: { gte: monthStart, lte: monthEnd }, status: 'PAID' },
            _sum: { grandTotal: true },
        });
        const monthlySales = monthlySalesAgg._sum.grandTotal || 0;

        const prevMonthStart = startOfMonth(subMonths(new Date(), 1));
        const prevMonthEnd = endOfMonth(subMonths(new Date(), 1));
        const prevMonthlySalesAgg = await prisma.sale.aggregate({
            where: { saleDate: { gte: prevMonthStart, lte: prevMonthEnd }, status: 'PAID' },
            _sum: { grandTotal: true },
        });
        const prevMonthlySales = prevMonthlySalesAgg._sum.grandTotal || 0;
        const percentChange = prevMonthlySales > 0 ? ((monthlySales - prevMonthlySales) / prevMonthlySales) * 100 : 0;

        // ===== 7. TOTAL STOCK ITEMS =====
        const totalStockItems = await prisma.product.count();

        // ===== 8. OTHER DATA =====
        const totalCustomers = await prisma.customer.count();
        const totalOrders = await prisma.sale.count({
            where: { status: 'PAID' },
        });

        // Fetch sales for raw data
        const sales = await prisma.sale.findMany({
            where: {
                saleDate: { gte: startDate, lte: endDate },
                status: 'PAID',
            },
            include: {
                saleItems: {
                    include: {
                        product: {
                            include: { category: true },
                        },
                    },
                },
            },
        });

        const rawSales = sales.map((s) => ({
            id: s.id,
            saleDate: s.saleDate,
            grandTotal: s.grandTotal,
            paymentMethod: s.paymentMethod,
            category: s.saleItems[0]?.product?.category?.name || 'Uncategorized',
        }));

        // ===== 9. PAYMENT METHODS (FIXED) =====
        // Get payment method data from sales
        const paymentMethods: Record<string, number> = {};
        sales.forEach((s) => {
            if (s.paymentMethod) {
                paymentMethods[s.paymentMethod] = (paymentMethods[s.paymentMethod] || 0) + s.grandTotal;
            }
        });

        // If no data, add sample data for testing
        if (Object.keys(paymentMethods).length === 0) {
            paymentMethods['CASH'] = 0;
            paymentMethods['CARD'] = 0;
            paymentMethods['QR'] = 0;
            paymentMethods['BANK'] = 0;
            paymentMethods['INSTALLMENT'] = 0;
        }

        // Convert to array for frontend
        const paymentMethodsArray = Object.entries(paymentMethods).map(([name, value]) => ({
            name: name,
            value: value,
        }));

        // ===== 10. PENDING REPAIRS =====
        const pendingRepairs = await prisma.repair.groupBy({
            by: ['status'],
            where: {
                status: {
                    in: ['PENDING', 'IN_PROGRESS'],
                },
            },
            _count: {
                status: true,
            },
        });

        const repairData = pendingRepairs.map((item) => ({
            status: item.status,
            count: item._count.status,
        }));

        if (repairData.length === 0) {
            repairData.push(
                { status: 'PENDING', count: 0 },
                { status: 'IN_PROGRESS', count: 0 }
            );
        }

        // ===== RESPONSE =====
        return NextResponse.json({
            // Top Selling (≥10 items)
            topSellingProducts: topSellingProducts.map((p: any) => ({
                id: p.id,
                name: p.name,
                totalSold: Number(p.totalSold),
                totalRevenue: Number(p.totalRevenue),
                currentStock: Number(p.currentStock),
                numberOfSales: Number(p.numberOfSales),
                averagePrice: Number(p.averagePrice),
                reorderLevel: Number(p.reorderLevel),
            })),

            // Slow Selling (<3 items)
            slowSellingProducts: slowSellingProducts.map((p: any) => ({
                id: p.id,
                name: p.name,
                totalSold: Number(p.totalSold),
                totalRevenue: Number(p.totalRevenue),
                currentStock: Number(p.currentStock),
                numberOfSales: Number(p.numberOfSales),
                reorderLevel: Number(p.reorderLevel),
            })),

            // Zero Sales Products
            zeroSalesProducts: zeroSalesProducts.map((p: any) => ({
                id: p.id,
                name: p.name,
                totalSold: Number(p.totalSold),
                totalRevenue: Number(p.totalRevenue),
                currentStock: Number(p.currentStock),
                numberOfSales: Number(p.numberOfSales),
                reorderLevel: Number(p.reorderLevel),
            })),

            // Low Stock Items (<5 items)
            lowStockItems: lowStockItems.map((p) => ({
                id: p.id,
                name: p.name,
                stock: p.stock,
                reorderLevel: p.reorderLevel || 5,
                sellingPrice: p.sellingPrice,
                purchasePrice: p.purchasePrice,
                status: p.stock === 0 ? 'Out of Stock' : p.stock < 3 ? 'Critical' : 'Low Stock',
                daysInStock: p.createdAt ? Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
            })),

            // Payment Methods (FIXED)
            paymentMethods: paymentMethodsArray,

            // Metric Cards
            todaySales,
            todayProfit,
            todayOrders,
            monthlySales,
            totalStockItems,
            lowStockCount: lowStockItems.length,
            percentChange,

            // Charts Data
            rawSales,
            pendingRepairs: repairData,

            // Additional counts
            totalCustomers,
            totalOrders,
            hasNewPurchase: false,
        });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data', message: error.message },
            { status: 500 }
        );
    }
}