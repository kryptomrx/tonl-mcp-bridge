import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { getPackageVersion, checkMcpServerStatus } from '../../utils/package-info.js';

export const Header: React.FC = () => {
  const [version] = useState(getPackageVersion());
  const [mcpStatus, setMcpStatus] = useState<{ online: boolean; latency?: number }>({
    online: false
  });

  useEffect(() => {
    checkMcpServerStatus(3000).then(setMcpStatus);
    const interval = setInterval(() => {
      checkMcpServerStatus(3000).then(setMcpStatus);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column" marginBottom={2}>
      <Box justifyContent="center">
        <Gradient name="pastel">
          <BigText text="TONL" font="block" />
        </Gradient>
      </Box>
      
      <Box justifyContent="center" gap={2}>
        <Text dimColor>Enterprise Token Optimization</Text>
        <Text bold>v{version}</Text>
        <Text color={mcpStatus.online ? 'green' : 'gray'}>
          {mcpStatus.online ? '●' : '○'} {mcpStatus.online ? 'LIVE' : 'OFFLINE'}
        </Text>
      </Box>
    </Box>
  );
};
