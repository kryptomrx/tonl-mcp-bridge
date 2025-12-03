import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface TokenBarProps {
  label: string;
  tokens: number;
  maxTokens: number;
  color: string;
  showSavings?: boolean;
  savingsPercent?: number;
  animated?: boolean;
  thin?: boolean;
}

export const TokenBar: React.FC<TokenBarProps> = ({
  label,
  tokens,
  maxTokens,
  color,
  showSavings = false,
  savingsPercent = 0,
  animated = true,
  thin = false
}) => {
  const [animatedTokens, setAnimatedTokens] = useState(animated ? 0 : tokens);

  useEffect(() => {
    if (!animated) return;

    const duration = 600;
    const steps = 40;
    const increment = tokens / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= tokens) {
        setAnimatedTokens(tokens);
        clearInterval(interval);
      } else {
        setAnimatedTokens(Math.round(current));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [tokens, animated]);

  const barWidth = 50;
  const filledWidth = Math.round((animatedTokens / maxTokens) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  const filledChar = thin ? '▓' : '█';
  const emptyChar = thin ? '░' : '░';

  const filledBar = filledChar.repeat(filledWidth);
  const emptyBar = emptyChar.repeat(emptyWidth);

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold color={color}>{label}</Text>
        <Text bold>{animatedTokens.toLocaleString()}</Text>
      </Box>
      <Box marginTop={0}>
        <Text color={color}>{filledBar}</Text>
        <Text dimColor>{emptyBar}</Text>
      </Box>
      {showSavings && (
        <Box marginTop={0}>
          <Text color="green">Reduction: {savingsPercent.toFixed(1)}%</Text>
        </Box>
      )}
    </Box>
  );
};
