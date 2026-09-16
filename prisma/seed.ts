import { PrismaClient, RepairStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Get customers
    const customers = await prisma.customer.findMany({
        orderBy: {
            id: "asc",
        },
        take: 5,
    });

    // Get products
    const products = await prisma.product.findMany({
        orderBy: {
            id: "asc",
        },
        take: 5,
    });

    // Validate required data
    if (customers.length === 0) {
        throw new Error(
            "No customers found. Please create customers first."
        );
    }

    if (products.length === 0) {
        throw new Error(
            "No products found. Please create products first."
        );
    }

    console.log(`Found ${customers.length} customers`);
    console.log(`Found ${products.length} products`);

    // Sample repair data
    const repairData = [
        {
            customerId: customers[0].id,
            productId: products[0]?.id ?? null,
            problem: "Broken display",
            technicianId: null,
            status: RepairStatus.PENDING,
            costEstimate: 18000,
            actualCost: null,
            advancePayment: 5000,
            condition: "Screen cracked, device working normally",
            device: "iPhone 13",
            expectedCompletionDate: new Date("2026-09-06"),
            completedAt: null,
            updatedAt: new Date(),
        },

        {
            customerId: customers[1 % customers.length].id,
            productId: products[1 % products.length]?.id ?? null,
            problem: "Battery replacement",
            technicianId: null,
            status: RepairStatus.IN_PROGRESS,
            costEstimate: 9500,
            actualCost: null,
            advancePayment: 3000,
            condition: "Phone turns on but battery drains quickly",
            device: "Samsung Galaxy A54",
            expectedCompletionDate: new Date("2026-09-07"),
            completedAt: null,
            updatedAt: new Date(),
        },

        {
            customerId: customers[2 % customers.length].id,
            productId: products[2 % products.length]?.id ?? null,
            problem: "Rear camera issue",
            technicianId: null,
            status: RepairStatus.PENDING,
            costEstimate: 12000,
            actualCost: null,
            advancePayment: 2500,
            condition: "Camera glass damaged",
            device: "iPhone 11",
            expectedCompletionDate: new Date("2026-09-08"),
            completedAt: null,
            updatedAt: new Date(),
        },

        {
            customerId: customers[3 % customers.length].id,
            productId: products[3 % products.length]?.id ?? null,
            problem: "Charging port damaged",
            technicianId: null,
            status: RepairStatus.COMPLETED,
            costEstimate: 7500,
            actualCost: 7000,
            advancePayment: 2000,
            condition: "Phone not charging",
            device: "Redmi Note 12",
            expectedCompletionDate: new Date("2026-09-03"),
            completedAt: new Date("2026-09-03"),
            updatedAt: new Date(),
        },

        {
            customerId: customers[4 % customers.length].id,
            productId: products[4 % products.length]?.id ?? null,
            problem: "Water damage and motherboard inspection",
            technicianId: null,
            status: RepairStatus.IN_PROGRESS,
            costEstimate: 25000,
            actualCost: null,
            advancePayment: 5000,
            condition: "Phone has water damage",
            device: "Samsung Galaxy S22",
            expectedCompletionDate: new Date("2026-09-10"),
            completedAt: null,
            updatedAt: new Date(),
        },
    ];

    // Create repair records
    const result = await prisma.repair.createMany({
        data: repairData,
    });

    console.log(
        `Created ${result.count} repair records successfully.`
    );
}

main()
    .then(async () => {
        console.log("Seed completed successfully.");
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error("Seed error:", error);
        await prisma.$disconnect();
        process.exit(1);
    });