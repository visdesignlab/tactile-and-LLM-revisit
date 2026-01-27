import {
  Card,
  Flex,
  Text,
  Button,
  Loader,
  Divider,
  rem,
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { PREFIX } from '../../../utils/Prefix';
import { useStudyId } from '../../../routes/utils';
import { ReactMarkdownWrapper } from '../../../components/ReactMarkdownWrapper';

export default function InstructionsDisplay({ chartType, modality, dataset, contentType, onOpenChat }: {
  chartType: 'violin-plot' | 'clustered-heatmap';
  modality: 'tactile' | 'text';
  dataset: 'simple' | 'complex';
  contentType: 'instructions' | 'alt-text';
  onOpenChat?: () => void;
}) {
  const studyId = useStudyId();

  const [instructions, setInstructions] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInstructions = async () => {
      try {
        setLoading(true);

        // Determine which instruction file to load
        // const instructionType = modality === 'tactile' ? 'tactile' : 'text';
        let fileName = "";
        if (contentType === "instructions") {
          fileName = `${chartType}_${contentType}_${modality}.md`;
        } else if (contentType === "alt-text") {
          fileName = `${chartType}_${contentType}_${dataset}.md`;
        } else {
          throw new Error(`Invalid content type: ${contentType}`);
        }

        // In production, this would fetch from an API
        // For now, we'll simulate loading the content
        const response = await fetch(`${PREFIX}${studyId}/assets/instructions/${fileName}`);

        if (!response.ok) {
          throw new Error(`Failed to load instructions: ${response.statusText}`);
        }

        const content = await response.text();
        setInstructions(content);
      } catch (err) {
        console.error('Error loading texts:', err);
        setError('Failed to load texts. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    loadInstructions();
  }, [chartType, modality, studyId]);

  if (loading) {
    return (
      <Card shadow="md" radius="lg" p="lg" withBorder>
        <Flex align="center" justify="center" py="xl" gap="md">
          <Loader size={32} color="blue" />
          <Text color="gray.6" size="md">Loading texts...</Text>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card shadow="md" radius="lg" p="lg" withBorder>
        <Flex direction="column" align="center" justify="center" py="xl" gap="md">
          <Text color="red.6" size="md" mb={rem(8)}>{error}</Text>
          <Button variant="outline" color="blue" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </Flex>
      </Card>
    );
  }

  return (
    <>
      <Flex direction="column" mb="md">
        <Flex justify="space-between" align="center">
          <div>
            <Text size="sm" c="dimmed">
              {contentType === 'instructions'
                ? (modality === 'tactile'
                  ? 'Follow these tactile exploration instructions to learn about the chart. You can also ask the AI assistant any questions you have about the chart by pressing T or clicking the button.'
                  : 'Read this explanation to understand the chart type. You can also ask the AI assistant any questions you have about the chart by pressing T or clicking the button.')
                : (dataset === 'simple'
                  ? 'This is an example of alt text, which describes the chart used in the instruction you just heard.  You can also ask the AI assistant any questions you have about the chart by pressing T or clicking the button.'
                  : 'This is an alt text of a new dataset of the same chart type you just learned.  You can also ask the AI assistant any questions you have about the chart by pressing T or clicking the button.')}
            </Text>
          </div>
          {onOpenChat && (
            <Button
              variant="outline"
              color="blue"
              onClick={onOpenChat}
              size="sm"
            >
              Open AI Chat
            </Button>
          )}
        </Flex>
      </Flex>
      <Divider mb="md" />
      <div style={{ maxWidth: '100%' }}>
        <ReactMarkdownWrapper text={instructions} />
      </div>
    </>
  );
}
