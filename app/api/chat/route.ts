/**
 * Chat API Route
 * Temporarily disabled - returns a simple message
 * 
 * TODO: Re-enable OpenAI integration when OPENAI_API_KEY is configured
 * 
 * SECURITY:
 * - API key stored server-side only (env variable)
 * - Input validation and sanitization
 * - Rate limiting should be added in production
 * - Response validation before sending to client
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Validate request
    const body = await request.json();
    const { message, areaContext, systemContext } = body;

    // Basic validation
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    // If OpenAI is configured, use it with RAG context
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    // OpenAI integration (optional - only works if package is installed)
    // Frontend will use smart fallback responses with area context if OpenAI is not available
    // Note: To enable OpenAI, install package: npm install openai
    // Then uncomment the code below and ensure OPENAI_API_KEY is set in .env.local
    
    // For now, return null to signal frontend to use RAG-based fallback responses
    // The frontend will use area journal data to generate intelligent responses

    // Return null message if OpenAI not configured
    // Frontend will handle fallback responses using area context
    return NextResponse.json({ 
      message: null // Signal to frontend to use fallback
    });
  } catch (error) {
    console.error("Chat API error:", error);
    
    // SECURITY: Don't expose internal error details to client
    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}

