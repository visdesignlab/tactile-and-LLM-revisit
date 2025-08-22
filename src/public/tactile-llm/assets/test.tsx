import { Card, Flex } from '@mantine/core';
import ChatInterface from './ChatInterface';
import InstructionsDisplay from './InstructionsDisplay';

export default function TestComponent() {
  return (
    <Flex direction="row" gap="lg">
      <Card shadow="md" style={{ flex: 1 }} withBorder>
        <InstructionsDisplay modality="tactile" chartType="violin-plot" />
      </Card>

      <Card shadow="md" style={{ flex: 1 }} withBorder>
        <ChatInterface chartType="violin-plot" />
      </Card>
    </Flex>
  );
}
