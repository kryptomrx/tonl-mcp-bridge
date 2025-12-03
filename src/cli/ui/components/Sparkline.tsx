import React from 'react';
import { Box, Text } from 'ink';

interface SparklineProps {
  data: number[];
  width?: number;
  color?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 20,
  color = 'cyan'
}) => {
  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const normalized = data.slice(-width).map(value => {
    const ratio = (value - min) / range;
    const index = Math.floor(ratio * (chars.length - 1));
    return chars[index];
  });

  return (
    <Box>
      <Text color={color}>{normalized.join('')}</Text>
    </Box>
  );
};
