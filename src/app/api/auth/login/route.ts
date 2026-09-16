import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/src/lib/jwt";

export async function POST(request: NextRequest) {
    try {
        // Check request content type
        const contentType = request.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            return NextResponse.json(
                { message: "Invalid request format" },
                { status: 400 }
            );
        }

        // Read request body
        const body = await request.json();

        const email =
            typeof body?.email === "string"
                ? body.email.trim().toLowerCase()
                : "";

        const password =
            typeof body?.password === "string"
                ? body.password
                : "";

        // Validate inputs
        if (!email || !password) {
            return NextResponse.json(
                { message: "Email and password are required" },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            return NextResponse.json(
                { message: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Check password
        const isValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isValid) {
            return NextResponse.json(
                { message: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Create JWT
        const token = signToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Return response
        const response = NextResponse.json(
            {
                success: true,
                message: "Login successful",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
            { status: 200 }
        );

        // Set authentication cookie
        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("LOGIN API ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Server error during login",
            },
            { status: 500 }
        );
    }
}