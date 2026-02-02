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
  { modality, chartType, dataset, contentType, setAnswer, provenanceState, onClose, trrack, actions, updateProvenanceState, modalOpened, onMessagesUpdate }:
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


  // Define the system prompts
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

Examples:
- User: "hello" → Assistant: "Hi! How can I help you today?"
- User: "thanks" → Assistant: "You're welcome! Anything else?"
- User: "What are the axes on this chart?" → Use background to answer.

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

Examples:
- User: "hello" → Assistant: "Hi! How can I help you today?"
- User: "thanks" → Assistant: "You're welcome! Anything else?"
- User: "Which category has the highest value?" → Use background to answer.

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

Examples:
- User: "hello" → Assistant: "Hi! How can I help you today?"
- User: "Explain the chart axes." → Use background to answer.
`;

  const prePrompt = contentType === 'alt-text'
    ? altTextPrompt
    : (modality === 'tactile' ? instructionsTactilePrompt : instructionsTextPrompt);


  const initialMessages: ChatMessage[] = useMemo(() => [
    {
      role: 'system',
      content: `${prePrompt}`,
      timestamp: new Date().getTime(),
      display: false,
    },
  ], [chartType, prePrompt]);

  // Local React states for chat history
  const [messages, setMessages] = useState<ChatMessage[]>([...initialMessages]);
  const messagesRef = useRef<ChatMessage[]>([...initialMessages]);
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null);

  // Load existing provenance state
  useEffect(() => {
    if (provenanceState) {
      setMessages(provenanceState.messages);
    } else {
      setMessages([...initialMessages]);
    }
    setPreviousResponseId(null);
  }, [provenanceState, initialMessages]);

  // Update parent component when messages change
  useEffect(() => {
    if (onMessagesUpdate) {
      onMessagesUpdate(messages);
    }
    messagesRef.current = messages;
  }, [messages, onMessagesUpdate]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);



  // ---------- Background gating ----------

    const backgroundKeywords = [
      "chart",
      "plot",
      "heatmap",
      "violin",
      "dataset",
      "csv",
      "value",
      "axis",
      "row",
      "column",
      "cluster",
    ];

    const hasBackgroundKeyword = (text: string) => {
      const normalized = text.toLowerCase();
      return backgroundKeywords.some((keyword) => normalized.includes(keyword));
    };

    const shouldUseBackground = async (userText: string) => {
      if (hasBackgroundKeyword(userText)) return true;

      const routerPrompt = `
You are a router. Decide if the user's message explicitly asks about the chart, dataset/CSV, or instructions.
Return exactly one token: USE_BACKGROUND or NO_BACKGROUND.
`;

      try {
        const resp = await fetch(`${import.meta.env.VITE_OPENAI_API_URL}/v1/responses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            input: [
              { role: "system", content: [{ type: "input_text", text: routerPrompt }] },
              { role: "user", content: [{ type: "input_text", text: userText }] },
            ],
            max_output_tokens: 8,
            temperature: 0,
          }),
        });

        const data = await resp.json();
        const text = (data.output?.[0]?.content?.[0]?.text || "").trim().toUpperCase();
        return text.includes("USE_BACKGROUND");
      } catch (err) {
        console.warn("Router failed, defaulting to NO_BACKGROUND", err);
        return false;
      }
    };

    const buildBackgroundMessages = (
      csvData: string,
      instructionText: string,
    ) => {
      // System messages only accept input_text, so attach the image as a hidden user message.
      const backgroundTextMessage = {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "BACKGROUND (reference only — do not mention unless user asks about chart/data/instructions).",
              instructionText
                ? `Instructions (${modality === "tactile" ? "tactile exploration" : "textual"}):\n${instructionText}`
                : "",
              `Dataset (CSV):\n${csvData}`,
            ].filter(Boolean).join("\n\n"),
          },
        ],
      };

      const backgroundImageMessage = {
        role: "user",
        content: [
          {
            type: "input_image",
            file_id:
              chartType === "violin-plot"
                ? dataset === "simple"
                  ? "file-NnvHu4fUdz5oeqkTxJkRSz" // Violin Plot - Simple Dataset
                  : "file-NiSf9xDPgv21d6dTzFxaqH" // Violin Plot - Complex Dataset
                : dataset === "simple"
                  ? "file-2jqhMr5MJe3bxfvXeaJYpd" // Clustered Heatmap - Simple Dataset
                  : "file-AXbDvppNy7Fy6NmwrcaE3p", // Clustered Heatmap - Complex Dataset
          },
        ],
      };

      return [backgroundTextMessage, backgroundImageMessage];
    };
    

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

  // Focus input when the modal opens (screen-reader friendly)
  useEffect(() => {
    if (!modalOpened) return;
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [modalOpened]);


  // handleSubmit(): Triggered when the user presses Enter or clicks Send.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!inputValue.trim() || isLoading) return;
  
    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().getTime(),
      display: true,
    };
  
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);
  
    try {
      const useBackground = await shouldUseBackground(userMessage.content);

      let csvData = "";
      let instructionText = "";

      if (useBackground) {
        // Fetch background only when needed to save tokens and prevent irrelevant replies.
        const csvResponse = await fetch(`${PREFIX}${studyId}/assets/data/${chartType}_${dataset}.csv`);
        const csvText = await csvResponse.text();
        csvData = csvText;

        if (contentType === 'instructions') {
          const instructionPath = `${PREFIX}${studyId}/assets/instructions/${chartType}_instructions_${modality}.md`;
          const instructionResponse = await fetch(instructionPath);
          if (!instructionResponse.ok) {
            throw new Error(`Failed to load instructions from ${instructionPath}`);
          }
          instructionText = await instructionResponse.text();
        }
      }
  
      const inputPayload = [
        ...(previousResponseId
          ? []
          : [{
            role: "system",
            content: [{ type: "input_text", text: initialMessages[0].content }],
          }]),
        {
          role: "user",
          content: [{ type: "input_text", text: userMessage.content }],
        },
        ...(useBackground ? buildBackgroundMessages(csvData, instructionText) : []),
      ];
  
      const response = await fetch(
        `${import.meta.env.VITE_OPENAI_API_URL}/v1/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o",
            stream: true,
            input: inputPayload,
            temperature: 0.7,
            max_output_tokens: 400,
            ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
          }),
        }
      );
  
      
      if (!response.ok || !response.body) {
        throw new Error("Failed to start stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        display: true,
      };

      // Add assistant placeholder
      // setMessages((prev) => [...prev, assistantMessage]);

      let firstTokenSeen = false;

      let streamedResponseId: string | null = null;

      let streamDone = false;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") {
              streamDone = true;
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);

              if (parsed.type === "response.created") {
                streamedResponseId = parsed.response?.id || parsed.response_id || streamedResponseId;
              }

              if (parsed.type === "response.output_text.delta") {

                // first token arrived
                if (!firstTokenSeen) {
                  firstTokenSeen = true;
                  setIsLoading(false); // hide the loader "AI is thinking"

                  // create assistant message only when first token arrives
                  setMessages((prev) => [
                    ...prev,
                    { ...assistantMessage, content: parsed.delta },
                  ]);
                }
                assistantMessage.content += parsed.delta;
            
                // update React state live
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return [...prev.slice(0, -1), { ...last, content: assistantMessage.content }];
                  }
                  return prev;
                });
              }
            
              if (parsed.type === "response.output_text.done" || parsed.type === "response.output_item.done") {
                streamedResponseId = parsed.response?.id || parsed.response_id || streamedResponseId;
              }
            } catch (err) {
              console.warn("Failed to parse SSE line", dataStr, err);
            }            
          }
        }
        if (streamDone) break;

      }
      

      // Add the new messages
      if (streamedResponseId) {
        setPreviousResponseId(streamedResponseId);
      }

      const fullMessages = (() => {
        const current = messagesRef.current;
        if (current.length === 0) {
          return [...messages, userMessage, assistantMessage];
        }
        const last = current[current.length - 1];
        if (last?.role === "assistant") {
          return current;
        }
        return [...current, assistantMessage];
      })();
  
      trrack.apply("updateMessages", actions.updateMessages(fullMessages));
  
      // setAnswer({
      //   status: true,
      //   provenanceGraph: trrack.graph.backend,
      //   answers: {
      //     // messages: JSON.stringify([...messages, userMessage, assistantMessage]),
      //     messages: JSON.stringify(fullMessages),
      //   },
      // });
      updateProvenanceState(fullMessages, modalOpened);
  
    } catch (err) {
      console.error("Error getting LLM response:", err);
      setError(err instanceof Error ? err.message : "Failed to get response. Please try again.");
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
    <Box mah="100%" p="md">
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
                  {/* <Text size="xs" mt={4} color={message.role === 'user' ? 'blue.1' : 'gray.6'}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Text> */}
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
          autoFocus
          data-autofocus
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
