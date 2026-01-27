export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  display: boolean;
}

export interface ChatProvenanceState {
  messages: ChatMessage[];
  modalOpened: boolean;
}

type ChartType = 'violin-plot' | 'clustered-heatmap';
type ChartModality = 'tactile' | 'text';
type Dataset = 'simple' | 'complex';
type ContentType = 'instructions' | 'alt-text';

export interface ChatInterfaceParams {
  chartType: ChartType;
  modality: ChartModality;
  dataset: Dataset;
  contentType: ContentType;
}
