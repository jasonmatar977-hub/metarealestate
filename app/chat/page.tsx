"use client";

/**
 * AI Chatbot Page
 * Route: /chat
 * Full-page chat interface connected to OpenAI API
 * 
 * SECURITY: Protected route - requires authentication
 * All messages are validated and rendered safely
 */

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function ChatContent() {
  const { isAuthenticated, isLoading: authLoading, loadingSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [areaContext, setAreaContext] = useState<{
    areaSlug?: string;
    city?: string;
    areaName?: string;
    journalData?: any;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // SECURITY: Front-end route protection
    // Do not redirect until initial session check completes
    if (!loadingSession && !authLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, loadingSession, router, hasRedirected]);

  // Load area context from URL params
  useEffect(() => {
    const loadAreaContext = async () => {
      const areaSlug = searchParams?.get("area");
      const city = searchParams?.get("city") || "beirut";

      if (areaSlug) {
        try {
          // Try to fetch area journal data
          const { data: journalData } = await supabase
            .from("area_journals")
            .select("*")
            .eq("slug", areaSlug)
            .eq("city", city)
            .single();

          if (journalData) {
            setAreaContext({
              areaSlug,
              city,
              areaName: journalData.name,
              journalData,
            });
          } else {
            // Fallback: use slug as name
            setAreaContext({
              areaSlug,
              city,
              areaName: areaSlug.charAt(0).toUpperCase() + areaSlug.slice(1).replace(/-/g, " "),
            });
          }
        } catch (error) {
          console.error("[Chat] Error loading area context:", error);
          setAreaContext({
            areaSlug,
            city,
            areaName: areaSlug.charAt(0).toUpperCase() + areaSlug.slice(1).replace(/-/g, " "),
          });
        }
      }
      setIsLoadingContext(false);
    };

    if (isAuthenticated) {
      loadAreaContext();
    } else {
      setIsLoadingContext(false);
    }
  }, [searchParams, isAuthenticated]);

  // Initialize messages with area context if available
  useEffect(() => {
    if (!isLoadingContext && messages.length === 0) {
      let initialMessage = "Hello! I'm your AI real estate assistant. I can help you with property searches, buying, selling, investing, renting, or guide you through our website. How can I assist you today?";
      
      if (areaContext?.areaName) {
        initialMessage = `Hello! I'm your Area Analyst for ${areaContext.areaName}. I can help you understand this area's market conditions, trends, risks, and opportunities. What would you like to know about ${areaContext.areaName}?`;
      }
      
      setMessages([{ role: "assistant", content: initialMessage }]);
    }
  }, [isLoadingContext, areaContext]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildSystemContext = (): string => {
    if (!areaContext?.journalData) {
      return "";
    }

    const journal = areaContext.journalData;
    let context = `You are the Area Analyst for ${journal.name}, ${journal.city}. Use the following verified journal content to answer accurately:\n\n`;
    
    context += `AREA JOURNAL DATA:\n`;
    context += `- Status: ${journal.status}\n`;
    context += `- Demand: ${journal.demand}\n`;
    context += `- Inventory Trend: ${journal.inventory_trend}\n`;
    context += `- Price Flexibility: ${journal.price_flexibility}\n`;
    
    if (journal.rent_1br_min) {
      context += `- Rent Ranges: 1BR $${journal.rent_1br_min}-${journal.rent_1br_max}/mo, 2BR $${journal.rent_2br_min}-${journal.rent_2br_max}/mo, 3BR $${journal.rent_3br_min}-${journal.rent_3br_max}/mo\n`;
    }
    if (journal.sale_min) {
      context += `- Sale Range: $${journal.sale_min}-${journal.sale_max} per sqm\n`;
    }
    
    if (journal.driving_factors && Array.isArray(journal.driving_factors)) {
      context += `- Driving Factors: ${journal.driving_factors.join(", ")}\n`;
    }
    
    if (journal.risks && Array.isArray(journal.risks)) {
      context += `- Risks: ${journal.risks.join(", ")}\n`;
    }
    
    if (journal.outlook) {
      context += `- 90-Day Outlook: ${journal.outlook}\n`;
    }
    
    if (journal.what_would_change) {
      context += `- What Would Change This View: ${journal.what_would_change}\n`;
    }
    
    if (journal.takeaway) {
      context += `- Key Takeaway: ${journal.takeaway}\n`;
    }
    
    context += `\nIMPORTANT: Base your answers on this verified data. If asked about something not in the journal, say you don't have that specific information but can help with what's available.`;
    
    return context;
  };

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

      // Build system context if area context exists
      const systemContext = buildSystemContext();
      
      // Call API with context
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          areaContext: areaContext ? {
            areaSlug: areaContext.areaSlug,
            city: areaContext.city,
            areaName: areaContext.areaName,
          } : null,
          systemContext: systemContext,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();
      
      // Use AI response if available, otherwise fallback to smart mock response
      let assistantResponse: string;
      if (data.message) {
        assistantResponse = data.message;
      } else {
        // Simulate thinking delay for fallback
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
        assistantResponse = generateSmartResponse(userMessage, areaContext);
      }
      
      setMessages([...newMessages, { role: "assistant", content: assistantResponse }]);
    } catch (error) {
      console.error("Chat error:", error);
      // Fallback to smart mock response
      const fallbackResponse = generateSmartResponse(userMessage, areaContext);
      setMessages([...newMessages, { role: "assistant", content: fallbackResponse }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSmartResponse = (userMessage: string, context: typeof areaContext): string => {
    const lowerMessage = userMessage.toLowerCase();
    const areaName = context?.areaName || "this area";
    const journal = context?.journalData;

    // Area-specific responses if journal data exists
    if (journal) {
      if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("rent")) {
        if (journal.rent_1br_min) {
          return `Based on the Area Journal for ${areaName}, rent ranges are: 1BR $${journal.rent_1br_min}-${journal.rent_1br_max}/mo, 2BR $${journal.rent_2br_min}-${journal.rent_2br_max}/mo, 3BR $${journal.rent_3br_min}-${journal.rent_3br_max}/mo. Sale prices range from $${journal.sale_min}-${journal.sale_max} per sqm.`;
        }
      }
      
      if (lowerMessage.includes("demand") || lowerMessage.includes("market") || lowerMessage.includes("trend")) {
        return `According to the Area Journal, ${areaName} has ${journal.demand.toLowerCase()} demand with ${journal.inventory_trend.toLowerCase()} inventory. The market status is ${journal.status}. ${journal.takeaway || ""}`;
      }
      
      if (lowerMessage.includes("risk") || lowerMessage.includes("concern") || lowerMessage.includes("watch")) {
        if (journal.risks && Array.isArray(journal.risks)) {
          return `Key risks to watch in ${areaName}: ${journal.risks.join(", ")}.`;
        }
      }
      
      if (lowerMessage.includes("outlook") || lowerMessage.includes("future") || lowerMessage.includes("expect")) {
        return `The 90-day outlook for ${areaName} is ${journal.outlook}. ${journal.what_would_change || ""}`;
      }
    }

    // General responses
    if (lowerMessage.includes("property") || lowerMessage.includes("house") || lowerMessage.includes("home")) {
      return `I can help you find properties! Check out our listings page to browse available properties${areaName !== "this area" ? ` in ${areaName}` : ""}. You can filter by location, price, and property type.`;
    } else if (lowerMessage.includes("buy") || lowerMessage.includes("purchase")) {
      return `Great! To buy a property${areaName !== "this area" ? ` in ${areaName}` : ""}, start by browsing our listings. You can also use the search filters to find properties that match your criteria.`;
    } else if (lowerMessage.includes("invest") || lowerMessage.includes("investment")) {
      return `Real estate investment is a great strategy! ${journal ? `Based on the Area Journal, ${areaName} shows ${journal.outlook} outlook. ` : ""}Consider location, market trends, and rental yields when evaluating opportunities.`;
    } else {
      return `I'm here to help you with ${areaName !== "this area" ? `${areaName} and ` : ""}real estate questions. What would you like to know?`;
    }
  };

  // Show loading state while checking auth or loading context
  if (authLoading || isLoadingContext) {
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
          {areaContext?.areaName ? `Area Analyst: ${areaContext.areaName}` : "AI Assistant"}
        </h1>
        <p className="text-center text-gray-600 mb-8 text-lg">
          {areaContext?.areaName 
            ? `Ask me about ${areaContext.areaName}'s market conditions, trends, and opportunities`
            : "Ask me anything about real estate or our platform"}
        </p>
        {areaContext?.areaName && (
          <div className="flex justify-center mb-6">
            <a
              href={`/journal/${areaContext.city}/${areaContext.areaSlug}`}
              className="px-4 py-2 bg-gold/10 text-gold-dark text-sm font-semibold rounded-lg hover:bg-gold/20 transition-colors border border-gold/30"
            >
              View Full Area Journal →
            </a>
          </div>
        )}

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

export default function ChatPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <ChatContent />
    </Suspense>
  );
}