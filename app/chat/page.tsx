"use client";

/**
 * AI Chatbot Page
 * Route: /chat
 * Full-page chat interface connected to OpenAI API
 * 
 * SECURITY: Protected route - requires authentication
 * All messages are validated and rendered safely
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const { isAuthenticated, isLoading: authLoading, loadingSession } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI real estate assistant. I can help you with property searches, buying, selling, investing, renting, or guide you through our website. How can I assist you today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // SECURITY: Front-end route protection
    // Do not redirect until initial session check completes
    if (!loadingSession && !authLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, loadingSession, router, hasRedirected]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    
    // Add user message to chat
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // SECURITY: Validate input before sending
      if (userMessage.length > 2000) {
        throw new Error("Message too long");
      }

      // Mock chatbot response (OpenAI disabled for now)
      // Simulate thinking delay
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

      // Simple mock responses based on keywords
      let response = "I'm a real estate assistant. How can I help you with property searches, buying, selling, or investing today?";
      
      const lowerMessage = userMessage.toLowerCase();
      if (lowerMessage.includes("property") || lowerMessage.includes("house") || lowerMessage.includes("home")) {
        response = "I can help you find properties! Check out our listings page to browse available properties. You can filter by location, price, and property type.";
      } else if (lowerMessage.includes("buy") || lowerMessage.includes("purchase")) {
        response = "Great! To buy a property, start by browsing our listings. You can also use the search filters to find properties that match your criteria.";
      } else if (lowerMessage.includes("sell")) {
        response = "To sell your property, you'll need to create a listing. Contact our team through the contact form for assistance with listing your property.";
      } else if (lowerMessage.includes("invest") || lowerMessage.includes("investment")) {
        response = "Real estate investment is a great strategy! Browse our listings and look for properties with good potential. Consider location, market trends, and rental yields.";
      } else if (lowerMessage.includes("help") || lowerMessage.includes("how")) {
        response = "I can help you with: finding properties, understanding the buying process, learning about selling, and investment advice. What would you like to know more about?";
      }

      setMessages([...newMessages, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "I apologize, but I'm having trouble processing your request right now. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  // Show fallback UI while redirecting
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to use the chat.</p>
          <a href="/login" className="text-gold hover:text-gold-dark font-semibold">
            Go to Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 pt-24 pb-4 px-4 flex flex-col max-w-4xl mx-auto w-full">
        <h1 className="font-orbitron text-4xl md:text-5xl font-bold text-center mb-4 text-gold-dark">
          AI Assistant
        </h1>
        <p className="text-center text-gray-600 mb-8 text-lg">
          Ask me anything about real estate or our platform
        </p>

        {/* Messages Container */}
        <div className="flex-1 glass-dark rounded-3xl p-6 overflow-y-auto mb-4 min-h-[400px] max-h-[600px]">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage key={index} role={message.role} content={message.content} />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 text-gold-dark flex items-center justify-center font-bold">
                  AI
                </div>
                <div className="bg-white border-2 border-gold/40 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gold rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}

