import React, { useState, useEffect } from 'react';
import './TextType.css';

interface TextTypeProps {
  text: string;
  typingSpeed?: number;
  pauseDuration?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
  className?: string;
}

export default function TextType({
  text,
  typingSpeed = 50,
  pauseDuration = 1500,
  showCursor = true,
  cursorCharacter = "|",
  className = ""
}: TextTypeProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let index = 0;
    let timeoutId: any;

    setDisplayedText('');
    setIsTyping(true);

    const typeChar = () => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
        timeoutId = setTimeout(typeChar, typingSpeed);
      } else {
        setIsTyping(false);
      }
    };

    timeoutId = setTimeout(typeChar, typingSpeed);

    return () => clearTimeout(timeoutId);
  }, [text, typingSpeed]);

  return (
    <span className={`text-type-wrapper ${className}`}>
      {displayedText}
      {showCursor && isTyping && (
        <span className="text-type-cursor">{cursorCharacter}</span>
      )}
    </span>
  );
}
