import { Card, Flex, Modal } from '@mantine/core';
import { useState, useEffect } from 'react';
import ChatInterface from './ChatInterface';
import InstructionsDisplay from './InstructionsDisplay';
import { StimulusParams } from '../../../store/types';
import { ChatInterfaceParams, ChatProvenanceState } from './types';

export default function LLMInterface({ parameters, setAnswer, answers, provenanceState }: StimulusParams<ChatInterfaceParams, ChatProvenanceState>) {
  console.log('LLMInterface answers:', answers.prePrompt_1.answer["q-prePrompt"]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 't' || event.key === 'T') {
        setIsModalOpen(true);
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <>
      <Card shadow="md" style={{ flex: 1 }} withBorder>
        <InstructionsDisplay 
          modality={parameters.modality} 
          chartType={parameters.chartType}
          onOpenChat={() => setIsModalOpen(true)}
        />
      </Card>

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="AI Assistant Chat"
        size="lg"
        centered
        styles={{
          body: { padding: 0 },
          header: { padding: '1rem' }
        }}
      >
        <ChatInterface 
          chartType={parameters.chartType} 
          setAnswer={setAnswer} 
          provenanceState={provenanceState} 
          testSystemPrompt={answers.prePrompt_1.answer["q-prePrompt"] as string}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </>
  );
}
