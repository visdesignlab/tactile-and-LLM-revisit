import { Card, Flex } from '@mantine/core';
import ChatInterface from './ChatInterface';
import InstructionsDisplay from './InstructionsDisplay';
import { StimulusParams } from '../../../store/types';
import { ChatInterfaceParams, ChatProvenanceState } from './types';

export default function LLMInterface({ parameters, setAnswer, provenanceState }: StimulusParams<ChatInterfaceParams, ChatProvenanceState>) {
  return (
    <Flex direction="row" gap="lg">
      <Card shadow="md" style={{ flex: 1 }} withBorder>
        <InstructionsDisplay modality={parameters.modality} chartType={parameters.chartType} />
      </Card>

      <Card shadow="md" style={{ flex: 1 }} withBorder>
        <ChatInterface chartType={parameters.chartType} setAnswer={setAnswer} provenanceState={provenanceState} />
      </Card>
    </Flex>
  );
}
