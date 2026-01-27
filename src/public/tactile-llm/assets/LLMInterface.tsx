import { Card, Flex, Modal } from '@mantine/core';
import { useState, useEffect, useMemo, useCallback } from 'react';
import ChatInterface from './ChatInterface';
import InstructionsDisplay from './InstructionsDisplay';
import { StimulusParams } from '../../../store/types';
import { ChatInterfaceParams, ChatMessage, ChatProvenanceState } from './types';
import { Registry, initializeTrrack } from '@trrack/core';

export default function LLMInterface({ parameters, setAnswer, answers, provenanceState }: StimulusParams<ChatInterfaceParams, ChatProvenanceState>) {
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullMessages, setFullMessages] = useState<ChatMessage[]>([]);

  function setModal(open: boolean) {
    trrack.apply('modalOpened', actions.modalOpened(open));
    setIsModalOpen(open);
    updateProvenanceState(fullMessages, open);
  }

  const handleMessagesUpdate = useCallback((messages: ChatMessage[]) => {
    setFullMessages(messages);
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 't' || event.key === 'T') {
        setModal(true);
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // Setup provenance tracking (Trrack)
  const { actions, trrack } = useMemo(() => {
    const reg = Registry.create();

    // Register an "updateMessages" action to update chat history state
    const updateMessages = reg.register('brush', (state, newMessages: ChatMessage[]) => {
      state.messages = newMessages;
      return state;
    });

    const modalOpened = reg.register('modalOpened', (state, newState: boolean) => {
      state.modalOpened = newState;
      return state;
    });

    // Initialize Trrack with an empty message list
    const trrackInst = initializeTrrack({
      registry: reg,
      initialState: {
        messages: [],
        modalOpened: false,
      },
    });

    return {
      actions: {
        updateMessages,
        modalOpened,
      },
      trrack: trrackInst,
    };
  }, []);

  const updateProvenanceState = useCallback((messages: unknown[], modalOpened: boolean) => {
    setAnswer({
      status: true,
      provenanceGraph: trrack.graph.backend,
      answers: {
        modalOpened,
        messages: JSON.stringify(messages),
      },
    });
  }, [setAnswer, trrack.graph.backend]);

  useEffect(() => {
    if (provenanceState) {
      setIsModalOpen(provenanceState.modalOpened);
    }
  }, [provenanceState]);


  return (
    <>
      <Card shadow="md" style={{ flex: 1 }} withBorder>
        <InstructionsDisplay 
          modality={parameters.modality} 
          chartType={parameters.chartType}
          dataset={parameters.dataset}
          contentType={parameters.contentType}
          onOpenChat={() => setModal(true)}
        />
      </Card>

      <Modal
        opened={isModalOpen}
        onClose={() => setModal(false)}
        title="AI Assistant Chat"
        size="lg"
        centered
        styles={{
          body: { padding: 0 },
          header: { padding: '1rem' }
        }}
      >
        <ChatInterface 
          modality={parameters.modality}
          chartType={parameters.chartType} 
          dataset={parameters.dataset}
          contentType={parameters.contentType}
          setAnswer={setAnswer} 
          provenanceState={provenanceState} 
          onClose={() => setModal(false)}
          trrack={trrack}
          actions={actions as any}
          updateProvenanceState={updateProvenanceState}
          modalOpened={isModalOpen}
          onMessagesUpdate={handleMessagesUpdate}
        />
      </Modal>
    </>
  );
}
