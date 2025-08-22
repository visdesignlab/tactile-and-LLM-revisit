import { Card, Flex } from "@mantine/core";
import ChatInterface from "./ChatInterface";
import InstructionsDisplay from "./InstructionsDisplay";

export default function TestComponent() {
  return (
    <Flex direction="row">
      <Card shadow="sm" padding="lg" style={{ flex: 1 }}>
        <InstructionsDisplay modality="tactile" chartType="violin-plot" />
      </Card>

      <Card shadow="sm" padding="lg" style={{ flex: 1 }}>
        <ChatInterface chartType="violin-plot" />
      </Card>
    </Flex>
  );
}