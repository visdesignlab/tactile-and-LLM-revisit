'use client';

import { useState, useEffect } from 'react';
import { PREFIX } from '../../../utils/Prefix';
import { useStudyId } from '../../../routes/utils';
import { ReactMarkdownWrapper } from '../../../components/ReactMarkdownWrapper';

interface InstructionsDisplayProps {
  chartType: 'violin-plot' | 'clustered-heatmap';
  modality: 'tactile' | 'text';
}

export default function InstructionsDisplay({ chartType, modality }: InstructionsDisplayProps) {
  const studyId = useStudyId();

  const [instructions, setInstructions] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInstructions = async () => {
      try {
        setLoading(true);

        // Determine which instruction file to load
        const instructionType = modality === 'tactile' ? 'tactile' : 'text';
        const fileName = `${chartType}_instructions_${instructionType}.md`;

        // In production, this would fetch from an API
        // For now, we'll simulate loading the content
        const response = await fetch(`${PREFIX}${studyId}/assets/instructions/${fileName}`);

        if (!response.ok) {
          throw new Error(`Failed to load instructions: ${response.statusText}`);
        }

        const content = await response.text();
        setInstructions(content);
      } catch (err) {
        console.error('Error loading instructions:', err);
        setError('Failed to load instructions. Please try refreshing the page.');

        // Fallback to basic instructions
        if (modality === 'tactile') {
          setInstructions(`# ${chartType.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} - Tactile Instructions

This is a tactile chart exploration session. You will be provided with tactile instructions to explore the chart.

## What to expect:
- Detailed tactile exploration steps
- Chart orientation guidance
- Data interpretation instructions
- Interactive exploration techniques

Please follow the tactile instructions carefully and ask the AI assistant any questions you have about the chart.`);
        } else {
          setInstructions(`# ${chartType.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} - Text Instructions

This is a text-based learning session about ${chartType.replace('-', ' ')} charts.

## What you'll learn:
- Chart structure and components
- Data representation methods
- Interpretation techniques
- Key concepts and terminology

Read through the instructions and ask the AI assistant any questions you have about the chart.`);
        }
      } finally {
        setLoading(false);
      }
    };

    loadInstructions();
  }, [chartType, modality, studyId]);

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600">Loading instructions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-6">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="heading-2">
          {modality === 'tactile' ? 'Tactile Chart Instructions' : 'Chart Explanation'}
        </h2>
        <p className="text-caption">
          {modality === 'tactile'
            ? 'Follow these tactile exploration instructions to learn about the chart'
            : 'Read this explanation to understand the chart type'}
        </p>
      </div>

      <div className="prose prose-sm max-w-none">
        <ReactMarkdownWrapper text={instructions} />
      </div>
    </div>
  );
}
