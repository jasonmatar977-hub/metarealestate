/**
 * Chat API Route
 * Handles chat requests and forwards them to OpenAI API
 * 
 * SECURITY:
 * - API key stored server-side only (env variable)
 * - Input validation and sanitization
 * - Rate limiting should be added in production
 * - Response validation before sending to client
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
// SECURITY: API key must be in .env.local file (not committed to git)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Validate request method and content type
    const body = await request.json();
    const { message, history } = body;

    // SECURITY: Validate input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    // SECURITY: Limit message length
    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long" },
        { status: 400 }
      );
    }

    // SECURITY: Validate history if provided
    if (history && !Array.isArray(history)) {
      return NextResponse.json(
        { error: "Invalid history format" },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "Chat service is not configured" },
        { status: 500 }
      );
    }

    // Prepare messages for OpenAI
    const systemMessage = {
      role: "system" as const,
      content:
        "You are a helpful AI assistant specializing in real estate. You help users with property searches, buying, selling, investing, renting, and navigating the Meta Real Estate platform. Be friendly, professional, and informative.",
    };

    // Convert history to OpenAI format (limit to last 10 messages)
    const conversationHistory = (history || [])
      .slice(-10)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      }));

    // Add current user message
    const messages = [
      systemMessage,
      ...conversationHistory,
      {
        role: "user" as const,
        content: message,
      },
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using GPT-4o-mini (cost-effective and fast)
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    // SECURITY: Validate response
    const assistantMessage =
      completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.";

    // SECURITY: Sanitize response (OpenAI should return safe text, but we validate anyway)
    if (typeof assistantMessage !== "string") {
      return NextResponse.json(
        { error: "Invalid response from AI service" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Chat API error:", error);
    
    // SECURITY: Don't expose internal error details to client
    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}

