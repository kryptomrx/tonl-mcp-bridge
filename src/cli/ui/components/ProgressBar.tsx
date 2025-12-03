import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  showValue?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  max,
  color,
  showValue = true
}) => {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const duration = 600;
    const steps = 40;
    const increment = value / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setAnimated(value);
        clearInterval(interval);
      } else {
        setAnimated(Math.round(current));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [value]);

  const width = 50;
  const filled = Math.round((animated / max) * width);
  const empty = width - filled;

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text color={color}>{label}</Text>
        {showValue && <Text>{animated.toLocaleString()}</Text>}
      </Box>
      <Box>
        <Text color={color}>{'━'.repeat(filled)}</Text>
        <Text dimColor>{'━'.repeat(empty)}</Text>
      </Box>
    </Box>
  );
};
