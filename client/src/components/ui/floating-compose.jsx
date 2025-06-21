import { Plus, MessageCircle } from "lucide-react";
import { Button } from "./button.jsx";

export function FloatingComposeButton({ onClick, className = "" }) {
  return (
    <Button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-50 
        w-16 h-16 rounded-full 
        bg-primary hover:bg-primary/90 
        text-primary-foreground 
        shadow-2xl hover:shadow-3xl 
        transition-all duration-300 
        hover:scale-110 
        animate-gradient
        ${className}
      `}
    >
      <MessageCircle className="w-7 h-7" />
    </Button>
  );
}
