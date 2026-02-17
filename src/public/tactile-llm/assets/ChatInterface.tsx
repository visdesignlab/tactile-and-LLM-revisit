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
import { ChatMessage, ChatProvenanceState } from './types';
import { StimulusParams } from '../../../store/types';
import { Trrack } from '@trrack/core';
import { ActionCreatorWithPayload } from '@reduxjs/toolkit';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PREFIX } from '../../../utils/Prefix';
import { useStudyId } from '../../../routes/utils';

export default function ChatInterface(
  {
    modality,
    chartType,
    dataset,
    contentType,
    setAnswer,
    provenanceState,
    onClose,
    trrack,
    actions,
    updateProvenanceState,
    modalOpened,
    onMessagesUpdate,
    onInputRef,
  }:
  {
    modality: 'tactile' | 'text',
    chartType: 'violin-plot' | 'clustered-heatmap',
    dataset: 'simple' | 'complex',
    contentType: 'instructions' | 'alt-text',
    setAnswer: StimulusParams<never>['setAnswer'],
    provenanceState?: ChatProvenanceState,
    onClose?: () => void,
    trrack: Trrack<{
      messages: never[];
      modalOpened: boolean;
    }, string>,
    actions: {
      updateMessages: ActionCreatorWithPayload<ChatMessage[], string>;
      modalOpened: ActionCreatorWithPayload<boolean, string>;
    },
    updateProvenanceState: (messages: unknown[], modalOpened: boolean) => void,
    modalOpened: boolean,
    onMessagesUpdate?: (messages: ChatMessage[]) => void,
    onInputRef?: (el: HTMLTextAreaElement | null) => void,
  },
) {
  const studyId = useStudyId();

  const srOnlyStyles = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  } as const;

  // ---------- Prompts ----------
  const instructionsTactilePrompt = `
You are an accessibility-focused AI tutor helping a blind user learn the **${chartType.replace('-', ' ')}** chart type using an example template chart. The main goal is understanding the chart type; use this example only to illustrate and practice.

The user is blind and has a tactile version of this example chart. They will explore it by touch and ask questions.

You are given:
(1) The chart image (visual rendering of the example chart). The tactile version of the chart is based on this image.
(2) The underlying dataset as dataset.csv for the same example.
(3) The instructions for exploring the tactile chart.

Gating policy:
- Default: respond normally and do not mention chart/data/instructions.
- Only use background when the user explicitly asks about the chart, dataset/CSV, or instructions, or when the question clearly depends on them.
- If unclear, ask one short clarifying question.

How to respond:
- Be concise, clear, and direct.
- Refer to touch-perceivable structure (axes, groups, rows/columns, ordering, clusters, peaks/valleys). Avoid “look/see” language.
- Use dataset.csv for exact values and comparisons. Do not invent labels or numbers. If something is missing, say so and ask one short follow-up question.
`;

  const instructionsTextPrompt = `
You are an accessibility-focused AI tutor helping a blind user learn the **${chartType.replace('-', ' ')}** chart type using an example template chart. The main goal is understanding the chart type; use this example only to illustrate and practice.

The user is blind and will learn from the textual explanation and ask questions.

You are given:
(1) The chart image (visual rendering of the example chart).
(2) The underlying dataset as dataset.csv for the same example.
(3) The textual explanation of the chart.

Gating policy:
- Default: respond normally and do not mention chart/data/instructions.
- Only use background when the user explicitly asks about the chart, dataset/CSV, or instructions, or when the question clearly depends on them.
- If unclear, ask one short clarifying question.

How to respond:
- Be concise, clear, and direct.
- Prefer non-visual descriptions (structure, values, trends). Avoid assuming the user can see color or small text.
- Use dataset.csv for exact values and comparisons. Do not invent labels or numbers. If something is missing, say so and ask one short follow-up question.
`;

  const altTextPrompt = `
You are an accessibility assistant for a blind user. Your goal is to help the user explore and understand a data visualization while they read the alt text of the chart. You will be given: (1) the chart image and (2) the underlying dataset as a CSV file.

Gating policy:
- Default: respond normally and do not mention chart/data/instructions.
- Only use background when the user explicitly asks about the chart, dataset/CSV, or instructions, or when the question clearly depends on them.
- If unclear, ask one short clarifying question.
`;

  const prePrompt = contentType === 'alt-text'
    ? altTextPrompt
    : (modality === 'tactile' ? instructionsTactilePrompt : instructionsTextPrompt);

  // IMPORTANT: only mention tools you actually provide
  const toolPolicy =
`Tools (call only when needed):
- get_dataset_csv: returns dataset.csv as JSON { csv: string }
- get_instructions: returns instructions markdown as JSON { instructions: string }
- get_chart_image_file_id: returns JSON { file_id: string } for the chart image

Rules:
- If the user asks for exact values, rankings, or anything that depends on dataset.csv, call get_dataset_csv BEFORE answering.
- If the user asks about the instructions (and contentType is instructions), call get_instructions BEFORE answering.
- If the user asks about chart layout/axes/structure that requires the chart image, call get_chart_image_file_id BEFORE answering.
- Do not invent numbers; use the CSV for exact values.`;

  const instructions = `${prePrompt}\n\n${toolPolicy}`;

  // ---------- State ----------
  const initialMessages: ChatMessage[] = useMemo(() => [], []);
  const [messages, setMessages] = useState<ChatMessage[]>([...initialMessages]);
  const messagesRef = useRef<ChatMessage[]>([...initialMessages]);

  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);

  useEffect(() => {
    if (provenanceState) {
      setMessages(provenanceState.messages);
    } else {
      setMessages([...initialMessages]);
    }
    setPreviousResponseId(null);
  }, [provenanceState, initialMessages]);

  useEffect(() => {
    if (onMessagesUpdate) {
      onMessagesUpdate(messages);
    }
    messagesRef.current = messages;
  }, [messages, onMessagesUpdate]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [srStatus, setSrStatus] = useState('');
  const [srResponseAnnouncement, setSrResponseAnnouncement] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingTsRef = useRef(0);
  const srResponseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- Helpers ----------
  const maintainInputFocus = () => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    requestAnimationFrame(() => {
      if (document.activeElement !== inputEl) {
        inputEl.focus({ preventScroll: true });
      }
    });
  };

  const markTyping = () => {
    lastTypingTsRef.current = Date.now();
  };

  const announceAssistantResponse = (text: string) => {
    setSrResponseAnnouncement('');
    if (srResponseTimeoutRef.current) {
      clearTimeout(srResponseTimeoutRef.current);
    }
    srResponseTimeoutRef.current = setTimeout(() => {
      setSrResponseAnnouncement(text);
    }, 0);
  };

  useEffect(() => () => {
    if (srResponseTimeoutRef.current) {
      clearTimeout(srResponseTimeoutRef.current);
    }
  }, []);

  const getChartImageFileId = (chart: typeof chartType, data: typeof dataset) => {
    if (chart === 'violin-plot') {
      return data === 'simple'
        ? 'file-NnvHu4fUdz5oeqkTxJkRSz' // Violin Plot - Simple Dataset
        : 'file-NiSf9xDPgv21d6dTzFxaqH'; // Violin Plot - Complex Dataset
    }
    return data === 'simple'
      ? 'file-2jqhMr5MJe3bxfvXeaJYpd' // Clustered Heatmap - Simple Dataset
      : 'file-AXbDvppNy7Fy6NmwrcaE3p'; // Clustered Heatmap - Complex Dataset
  };

  // Auto-scroll
  useEffect(() => {
    const headerHeight = 80;
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

  // ---------- Tools (BEST PRACTICE: no args; use app state) ----------
  const toolDefinitions = [
    {
      type: 'function',
      name: 'get_dataset_csv',
      description: 'Return dataset.csv for the current chartType+dataset as JSON { csv: string }.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: 'function',
      name: 'get_instructions',
      description: 'Return instructions markdown for the current chartType+modality as JSON { instructions: string }.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: 'function',
      name: 'get_chart_image_file_id',
      description: 'Return JSON { file_id: string } for the chart image for the current chartType+dataset.',
      strict: true,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  ] as const;

  const executeToolCall = async (call: any): Promise<{ name: string; output: any }> => {
    if (call.name === 'get_dataset_csv') {
      const csvResponse = await fetch(`${PREFIX}tactile-llm/assets/data/${chartType}_${dataset}.csv`);
      if (!csvResponse.ok) {
        throw new Error(`Failed to load dataset CSV for ${chartType}_${dataset}`);
      }
      const csv = await csvResponse.text();
      return { name: call.name, output: { csv } };
    }

    if (call.name === 'get_instructions') {
      if (contentType !== 'instructions') return { name: call.name, output: { instructions: '' } };
      const instructionPath = `${PREFIX}tactile-llm/assets/instructions/${chartType}_instructions_${modality}.md`;
      const instructionResponse = await fetch(instructionPath);
      if (!instructionResponse.ok) {
        throw new Error(`Failed to load instructions from ${instructionPath}`);
      }
      const instructionsText = await instructionResponse.text();
      return { name: call.name, output: { instructions: instructionsText } };
    }

    if (call.name === 'get_chart_image_file_id') {
      const file_id = getChartImageFileId(chartType, dataset);
      return { name: call.name, output: { file_id } };
    }

    throw new Error(`Unknown tool: ${call.name}`);
  };

  const tryExtractFunctionCalls = (data: any) => {
    const out = Array.isArray(data?.output) ? data.output : [];
    return out.filter((item: any) => item?.type === 'function_call');
  };

  // ---------- Streaming ----------
  const streamAssistantResponse = async (
    inputPayload: unknown[],
    streamPreviousResponseId?: string | null,
  ) => {
    const response = await fetch(
      `${import.meta.env.VITE_OPENAI_API_URL}/v1/responses`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-5.2',
          stream: true,
          store: true,
          truncation: 'auto',
          instructions,
          tools: toolDefinitions, // ✅ allow tools even in streaming call
          tool_choice: 'auto',
          input: inputPayload,
          temperature: 0.7,
          max_output_tokens: 400,
          ...(streamPreviousResponseId ? { previous_response_id: streamPreviousResponseId } : {}),
        }),
      },
    );

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to start stream: ${response.status} ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      display: true,
    };

    let firstTokenSeen = false;
    let streamedResponseId: string | null = null;
    let streamDone = false;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (!dataStr) continue;

        if (dataStr === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(dataStr);

          if (parsed.type === 'response.created') {
            streamedResponseId = parsed.response?.id || parsed.response_id || streamedResponseId;
          }

          if (parsed.type === 'response.output_text.delta') {
            if (!firstTokenSeen) {
              firstTokenSeen = true;
              setIsLoading(false);

              setMessages((prev) => [
                ...prev,
                { ...assistantMessage, content: parsed.delta },
              ]);
            }

            assistantMessage.content += parsed.delta;

            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return [...prev.slice(0, -1), { ...last, content: assistantMessage.content }];
              }
              return prev;
            });
          }

          if (parsed.type === 'response.output_text.done' || parsed.type === 'response.output_item.done') {
            streamedResponseId = parsed.response?.id || parsed.response_id || streamedResponseId;
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Failed to parse SSE line', dataStr, err);
        }
      }

      if (streamDone) break;
    }

    if (!firstTokenSeen) {
      setIsLoading(false);
    }

    setSrStatus('Response ready.');
    if (assistantMessage.content.trim()) {
      announceAssistantResponse(assistantMessage.content);
    }
    return { assistantMessage, streamedResponseId };
  };

  // ---------- Tool selection (non-stream) ----------
  const requestToolSelection = async (
    userInputItem: any,
    priorResponseId: string | null,
  ) => {
    const response = await fetch(`${import.meta.env.VITE_OPENAI_API_URL}/v1/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.2',
        stream: false,
        store: true,
        truncation: 'auto',
        instructions,
        tools: toolDefinitions,
        tool_choice: 'auto', // ✅ always auto
        input: [userInputItem],
        // Keep this call small; we just want tool requests, not a full answer here.
        max_output_tokens: 64,
        temperature: 0,
        ...(priorResponseId ? { previous_response_id: priorResponseId } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Tool selection failed: ${response.status} ${errorText || response.statusText}`);
    }

    return response.json();
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
      display: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    setSrStatus('AI is thinking.');

    try {
      const priorResponseId = previousResponseId;

      const userInputItem = {
        role: 'user',
        content: [{ type: 'input_text', text: userMessage.content }],
      };

      // 1) Non-stream call: let the model decide whether it needs any tools.
      const firstData = await requestToolSelection(userInputItem, priorResponseId);

      const firstResponseId: string | null = firstData?.id || firstData?.response?.id || null;
      const functionCalls = tryExtractFunctionCalls(firstData);

      if (!functionCalls.length) {
        // No tools requested -> stream normally (single turn)
        const streamResult = await streamAssistantResponse([userInputItem], priorResponseId);
        if (streamResult.streamedResponseId) setPreviousResponseId(streamResult.streamedResponseId);

        const fullMessages = messagesRef.current;
        trrack.apply('updateMessages', actions.updateMessages(fullMessages));
        updateProvenanceState(fullMessages, modalOpened);
        return;
      }

      // Tools requested -> execute and continue the same response.
      if (firstResponseId) setPreviousResponseId(firstResponseId);

      const functionCallOutputs: any[] = [];
      let pendingImageFileId: string | null = null;

      for (const call of functionCalls) {
        const toolResult = await executeToolCall(call);

        if (toolResult.name === 'get_chart_image_file_id') {
          pendingImageFileId = toolResult.output?.file_id || null;
        }

        functionCallOutputs.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify(toolResult.output), // ✅ structured tool output
        });
      }

      // If an image was requested, include it as context for the streaming continuation.
      // Note: In Responses, the image can be provided as a user message content item.
      const streamInputPayload: any[] = [...functionCallOutputs];
      if (pendingImageFileId) {
        streamInputPayload.push({
          role: 'user',
          content: [
            {
              type: 'input_image',
              file_id: pendingImageFileId,
            },
          ],
        });
      }

      // 2) Stream the final answer by continuing from the tool-requesting response.
      const streamResult = await streamAssistantResponse(streamInputPayload, firstResponseId);
      if (streamResult.streamedResponseId) setPreviousResponseId(streamResult.streamedResponseId);

      const fullMessages = messagesRef.current;
      trrack.apply('updateMessages', actions.updateMessages(fullMessages));
      updateProvenanceState(fullMessages, modalOpened);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error getting LLM response:', err);
      setError('Failed to get response. Please try again.');
      setSrStatus('Failed to get response.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    markTyping();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // @ts-ignore
      handleSubmit(e);
    }
  };

  return (
    <Box mah="100%" p="md">
      <Text
        component="div"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={srOnlyStyles}
      >
        {srStatus}
      </Text>
      <Text
        component="div"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="additions text"
        style={srOnlyStyles}
      >
        {srResponseAnnouncement}
      </Text>
      {/* <Divider my="sm" /> */}

      <ScrollArea style={{ flex: 1, minHeight: rem(320), marginBottom: rem(16) }} offsetScrollbars>
        {messages.length === 0 ? (
          <Flex direction="column" align="center" justify="center" py="xl" style={{ color: '#6B7280' }}>
            {/* <IconMessage size={48} style={{ opacity: 0.5, marginBottom: rem(12) }} /> */}
            {/* <Text size="lg" fw={500} mb={4}>Start a conversation</Text> */}
            {/* <Text size="sm" color="dimmed">
              Ask me anything about{' '}
              {chartType.replace('-', ' ')}s!
            </Text> */}
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
                  {message.role === 'user' ? (
                    <Text component="h5" className="sr-only" style={srOnlyStyles}>
                      You said:
                    </Text>
                  ) : (
                    <Text component="h6" className="sr-only" style={srOnlyStyles}>
                      Assistant said:
                    </Text>
                  )}

                  {message.role === 'assistant' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => <Text size="sm" {...props} />,
                        li: ({ node, ...props }) => (
                          <li style={{ marginLeft: 16 }} {...props} />
                        ),
                        code: ({ inline, children, ...props }: any) => (
                          <code
                            style={{
                              backgroundColor: inline ? '#e9ecef' : '#f1f3f5',
                              borderRadius: 4,
                              padding: inline ? '2px 4px' : '8px',
                              display: inline ? 'inline' : 'block',
                              overflowX: 'auto',
                              fontFamily: 'monospace',
                              color: '#212529',
                            }}
                            {...props}
                          >
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <Text size="sm">{message.content}</Text>
                  )}
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

      {error && (
        <Paper mb="md" p="sm" radius="md" withBorder style={{ backgroundColor: '#fff0f0', borderColor: '#ffe3e3' }}>
          <Text color="red" size="sm">{error}</Text>
        </Paper>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: rem(8) }}>
        <Textarea
          ref={(el) => {
            inputRef.current = el;
            onInputRef?.(el);
          }}
          value={inputValue}
          onChange={(e) => {
            markTyping();
            setInputValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            const recentlyTyped = Date.now() - lastTypingTsRef.current < 1000;
            if (recentlyTyped) {
              maintainInputFocus();
            }
          }}
          placeholder="Ask me about the chart..."
          minRows={2}
          maxRows={4}
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

      <Text mt="md" size="xs" color="dimmed">
        Press Enter to send, Shift+Enter for new line. All conversations are recorded for research purposes.
      </Text>
    </Box>
  );
}
