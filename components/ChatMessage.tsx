/**
 * Chat Message Component
 * Displays a single message in the chat interface
 * 
 * SECURITY: All message content is rendered safely (no dangerouslySetInnerHTML)
 */

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
          isUser
            ? "bg-gradient-to-r from-gold to-gold-light text-gray-900"
            : "bg-gold/20 text-gold-dark"
        }`}
      >
        {isUser ? "You" : "AI"}
      </div>
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl ${
          isUser
            ? "bg-gradient-to-r from-gold/20 to-gold-light/20 text-gray-900 rounded-br-sm"
            : "bg-white border-2 border-gold/40 text-gray-700 rounded-bl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

