import {
  useState, useRef, useEffect, useMemo,
} from 'react';
import { IconMessage, IconSend } from '@tabler/icons-react';
import {
  Flex,
  Text,
  Textarea,
  Button,
  Loader,
  ScrollArea,
  Group,
  Paper,
  Divider,
  rem,
  Box,
} from '@mantine/core';
import { initializeTrrack, Registry } from '@trrack/core';
import { ChatMessage, ChatProvenanceState } from './types';
import { StimulusParams } from '../../../store/types';

export default function ChatInterface(
  { chartType, setAnswer, provenanceState }:
  {
    chartType: 'violin-plot' | 'clustered-heatmap',
    setAnswer: StimulusParams<never>['setAnswer'],
    provenanceState?: ChatProvenanceState,
  },
) {
  const { actions, trrack } = useMemo(() => {
    const reg = Registry.create();

    const updateMessages = reg.register('brush', (state, newState: ChatProvenanceState) => {
      // eslint-disable-next-line no-param-reassign
      state = newState;
      return state;
    });

    const trrackInst = initializeTrrack({
      registry: reg,
      initialState: {
        messages: [],
      },
    });

    return {
      actions: {
        updateMessages,
      },
      trrack: trrackInst,
    };
  }, []);

  const prePrompt = chartType === 'violin-plot'
    ? `This is a tactile chart exploration session. You will be provided with tactile instructions to explore the chart.
    Please follow the tactile instructions carefully and ask the AI assistant any questions you have about the chart.`
    : `This is a text-based learning session about ${chartType.replace('-', ' ')} charts.
    You will receive text instructions to help you understand the chart. Feel free to ask the AI assistant any questions you have about the chart.`;

  const initialMessages: ChatMessage[] = useMemo(() => [
    {
      role: 'system',
      content: `You are an AI assistant helping a participant learn about ${chartType.replace('-', ' ')} charts in an accessibility study.

${prePrompt}

Your role is to:
- Help participants understand the chart type and its purpose
- Answer questions about data visualization concepts
- Provide clear, accessible explanations
- Be patient and supportive of learning
- Keep responses concise but informative

IMPORTANT: You will receive both the CSV data and the visual image for the chart. Use them to:
1. Analyze the CSV data to understand the underlying data structure, statistics, and relationships
2. Interpret the visual image to understand how the data is represented graphically
3. Combine both data and visual analysis to provide comprehensive, accurate answers
4. When appropriate, suggest Python code examples for data analysis (you can write code in your responses)
5. Help participants understand the connection between the raw data and the visual representation

The participant is working with ${chartType} charts. Be helpful and encouraging in your responses.`,
      timestamp: new Date().getTime(),
      display: false,
    },
  ], [chartType, prePrompt]);
  const [messages, setMessages] = useState<ChatMessage[]>([...initialMessages]);
  useEffect(() => {
    if (provenanceState) {
      setMessages(provenanceState.messages);
    } else {
      setMessages([...initialMessages]);
    }
  }, [provenanceState, initialMessages]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const headerHeight = 80; // Adjust this value to match your header's height in px
    if (messagesEndRef.current) {
      const scrollArea = messagesEndRef.current.parentElement;
      if (scrollArea) {
        const endRect = messagesEndRef.current.getBoundingClientRect();
        const scrollAreaRect = scrollArea.getBoundingClientRect();
        const offset = endRect.bottom - scrollAreaRect.bottom + headerHeight;
        scrollArea.scrollTop += offset;
      } else {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().getTime(),
      display: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Call the real LLM API
      const response = await fetch(`${import.meta.env.VITE_OPENAI_API_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          // message: inputValue.trim(),
          messages: [...messages, userMessage].map((msg) => ({
            role: 'user',
            content: msg.content || '',
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date().getTime(),
        display: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      trrack.apply('updateMessages', actions.updateMessages({
        messages: [...messages, userMessage, assistantMessage],
      }));

      // Update provenance state
      setAnswer({
        status: true,
        provenanceGraph: trrack.graph.backend,
        answers: {},
      });

      // Store messages in localStorage for data collection
      // const allMessages = [...messages, userMessage, assistantMessage];
      // localStorage.setItem(`chat_${participantId}_${chartType}`, JSON.stringify(allMessages));
    } catch (err) {
      console.error('Error getting LLM response:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Box mah="100%">
      <Text size="xl" fw={700} mb={36}>
        AI Assistant Chat
      </Text>
      <Divider my="sm" />
      {/* Messages Container */}
      <ScrollArea style={{ flex: 1, minHeight: rem(320), marginBottom: rem(16) }} offsetScrollbars>
        {messages.length === 0 ? (
          <Flex direction="column" align="center" justify="center" py="xl" style={{ color: '#6B7280' }}>
            <IconMessage size={48} style={{ opacity: 0.5, marginBottom: rem(12) }} />
            <Text size="lg" fw={500} mb={4}>Start a conversation</Text>
            <Text size="sm" color="dimmed">
              Ask me anything about
              {' '}
              {chartType.replace('-', ' ')}
              s!
            </Text>
          </Flex>
        ) : (
          <Flex direction="column" gap="md">
            {messages.map((message) => message.display && (
              <Flex
                key={new Date(message.timestamp).toISOString()}
                justify={message.role === 'user' ? 'flex-end' : 'flex-start'}
              >
                <Paper
                  shadow={message.role === 'user' ? 'md' : 'xs'}
                  radius="md"
                  p="md"
                  withBorder
                  style={{
                    maxWidth: 400,
                    backgroundColor: message.role === 'user' ? '#228be6' : '#f8f9fa',
                    color: message.role === 'user' ? '#fff' : '#212529',
                  }}
                >
                  <Text size="sm">{message.content}</Text>
                  <Text size="xs" mt={4} color={message.role === 'user' ? 'blue.1' : 'gray.6'}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Text>
                </Paper>
              </Flex>
            ))}
          </Flex>
        )}
        {isLoading && (
          <Flex justify="flex-start" mt="md">
            <Paper shadow="xs" radius="md" p="md" withBorder style={{ backgroundColor: '#f8f9fa', color: '#212529' }}>
              <Group gap="xs">
                <Loader size="sm" color="gray" />
                <Text size="sm">AI is thinking...</Text>
              </Group>
            </Paper>
          </Flex>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>
      {/* Error Display */}
      {error && (
        <Paper mb="md" p="sm" radius="md" withBorder style={{ backgroundColor: '#fff0f0', borderColor: '#ffe3e3' }}>
          <Text color="red" size="sm">{error}</Text>
        </Paper>
      )}
      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: rem(8) }}>
        <Textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me about the chart..."
          minRows={2}
          maxRows={4}
          disabled={isLoading}
          aria-label="Type your message"
          style={{ flex: 1 }}
          autosize
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          variant="filled"
          color="blue"
          px={rem(16)}
          aria-label="Send message"
          style={{ alignSelf: 'flex-end' }}
        >
          <IconSend size={18} />
        </Button>
      </form>
      {/* Accessibility Info */}
      <Text mt="md" size="xs" color="dimmed">
        Press Enter to send, Shift+Enter for new line. All conversations are recorded for research purposes.
      </Text>
    </Box>
  );
}
