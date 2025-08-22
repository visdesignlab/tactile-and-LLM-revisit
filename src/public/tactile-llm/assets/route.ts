// import { NextRequest, NextResponse } from 'next/server';
// import OpenAI from 'openai';
// import { readFileSync, existsSync } from 'fs';
// import { join } from 'path';

// // Initialize OpenAI client
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export async function POST(request: NextRequest) {
//   try {
//     const { message, chartType, participantId, studyId } = await request.json();

//     if (!message || !chartType || !studyId) {
//       return NextResponse.json(
//         { error: 'Message, chartType, and studyId are required' },
//         { status: 400 }
//       );
//     }

//     if (!process.env.OPENAI_API_KEY) {
//       return NextResponse.json(
//         { error: 'OpenAI API key not configured' },
//         { status: 500 }
//       );
//     }

//     // Load study configuration from server file
//     let prePrompt: string;
//     try {
//       const configPath = join(process.cwd(), 'study-configs', `${studyId}.json`);
//       const configData = readFileSync(configPath, 'utf-8');
//       const config = JSON.parse(configData);
//       prePrompt = config.prePrompt;
//     } catch (fileError) {
//       return NextResponse.json(
//         { error: 'Study configuration not found' },
//         { status: 404 }
//       );
//     }

//     // Prepare chart-specific files
//     const csvFileName = `${chartType}.csv`;
//     const pngFileName = `${chartType}.png`;

//     let csvContent: string;
//     let pngBuffer: Buffer;

//     try {
//       // Check if files exist
//       const csvPath = join(process.cwd(), 'data', csvFileName);
//       const pngPath = join(process.cwd(), 'images', pngFileName);

//       if (!existsSync(csvPath)) {
//         return NextResponse.json(
//           { error: `CSV file not found for chart type: ${chartType}` },
//           { status: 404 }
//         );
//       }

//       if (!existsSync(pngPath)) {
//         return NextResponse.json(
//           { error: `Image file not found for chart type: ${chartType}` },
//           { status: 404 }
//         );
//       }

//       // Read CSV file
//       csvContent = readFileSync(csvPath, 'utf-8');

//       // Read PNG file
//       pngBuffer = readFileSync(pngPath);
//     } catch (fileError) {
//       console.error('Error reading chart files:', fileError);
//       return NextResponse.json(
//         { error: `Failed to load chart files for ${chartType}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}` },
//         { status: 500 }
//       );
//     }

//     // Create a system prompt that includes context about the chart type and study
//     const systemPrompt = `You are an AI assistant helping a participant learn about ${chartType.replace('-', ' ')} charts in an accessibility study.

// ${prePrompt}

// Your role is to:
// - Help participants understand the chart type and its purpose
// - Answer questions about data visualization concepts
// - Provide clear, accessible explanations
// - Be patient and supportive of learning
// - Keep responses concise but informative

// IMPORTANT: You will receive both the CSV data and the visual image for the chart. Use them to:
// 1. Analyze the CSV data to understand the underlying data structure, statistics, and relationships
// 2. Interpret the visual image to understand how the data is represented graphically
// 3. Combine both data and visual analysis to provide comprehensive, accurate answers
// 4. When appropriate, suggest Python code examples for data analysis (you can write code in your responses)
// 5. Help participants understand the connection between the raw data and the visual representation

// The participant is working with ${chartType} charts. Be helpful and encouraging in your responses.`;

//     // Create the chat completion request with file attachments
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4o",
//       messages: [
//         {
//           role: "system",
//           content: systemPrompt
//         },
//         {
//           role: "user",
//           content: [
//             {
//               type: "text",
//               text: message
//             },
//             {
//               type: "text",
//               text: `\n\nHere is the CSV data for the ${chartType}:\n\n${csvContent}`
//             },
//             {
//               type: "image_url",
//               image_url: {
//                 url: `data:image/png;base64,${pngBuffer.toString('base64')}`
//               }
//             }
//           ]
//         }
//       ],
//       max_tokens: 1000,
//       temperature: 0.7,
//     });

//     const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

//     return NextResponse.json({
//       response,
//       participantId,
//       chartType,
//       timestamp: new Date().toISOString(),
//     });

//   } catch (error) {
//     console.error('Error in chat API:', error);

//     if (error instanceof OpenAI.APIError) {
//       return NextResponse.json(
//         { error: `OpenAI API error: ${error.message}` },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }
