/**
 * Chat API Route with TONL Compression
 * 
 * POST /api/chat
 * Body: { message: string, useTONL?: boolean }
 */

import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { searchWithTONL, searchWithoutTONL } from '@/lib/vector-store';

export async function POST(request) {
  try {
    const { message, useTONL = true } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Search vector database
    const searchFn = useTONL ? searchWithTONL : searchWithoutTONL;
    const results = await searchFn(message, { limit: 5 });

    // Prepare context
    let context;
    let stats = null;

    if (useTONL) {
      context = results.tonl;
      stats = results.stats;
    } else {
      // Format as JSON for non-TONL
      context = JSON.stringify(results, null, 2);
    }

    // Generate LLM response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Answer questions based on the provided context. If the context doesn\'t contain relevant information, say so.',
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${message}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = completion.choices[0].message.content;

    return NextResponse.json({
      answer,
      stats: stats ? {
        originalTokens: stats.originalTokens,
        compressedTokens: stats.compressedTokens,
        savedTokens: stats.savedTokens,
        compressionRatio: stats.compressionRatio,
        resultsCount: results.results?.length || 0,
      } : null,
      usedTONL: useTONL,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
