"use client";

/**
 * Chat Input Component
 * Input field and send button for chat messages
 */

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="border-t-2 border-gold/40 bg-white/80 p-4">
      <div className="flex gap-3 items-end">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none resize-none min-h-[50px] max-h-[150px]"
          rows={1}
          disabled={isLoading}
        />
        <button
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
          className="px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isLoading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

