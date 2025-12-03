import React from 'react';
import { Box, Text } from 'ink';

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  color?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  color = 'white'
}) => {
  return (
    <Box 
      flexDirection="column" 
      borderStyle="round" 
      borderColor="gray" 
      paddingX={3}
      paddingY={1}
      flexGrow={1}
    >
      <Text dimColor>{label}</Text>
      <Text bold color={color}>{value}</Text>
      {change && <Text dimColor>{change}</Text>}
    </Box>
  );
};
