import { Card, Flex } from '@mantine/core';
import ChatInterface from './ChatInterface';
import InstructionsDisplay from './InstructionsDisplay';
import { StimulusParams } from '../../../store/types';
import { ChatInterfaceParams, ChatProvenanceState } from './types';

export default function LLMInterface({ parameters, setAnswer, answers, provenanceState }: StimulusParams<ChatInterfaceParams, ChatProvenanceState>) {
  console.log('LLMInterface answers:', answers.prePrompt_1.answer["q-prePrompt"]);
  return (
    <Flex direction="row" gap="lg">
      <Card shadow="md" style={{ flex: 1 }} withBorder>
        <InstructionsDisplay modality={parameters.modality} chartType={parameters.chartType} />
      </Card>

      <Card shadow="md" style={{ flex: 1 }} withBorder>
        <ChatInterface chartType={parameters.chartType} setAnswer={setAnswer} provenanceState={provenanceState} testSystemPrompt={answers.prePrompt_1.answer["q-prePrompt"] as string} />
      </Card>
    </Flex>
  );
}
