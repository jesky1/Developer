import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { getAuthUser } from '@/lib/auth'

// POST: AI chat endpoint for admin assistant (requires auth)
export async function POST(request: NextRequest) {
  try {
    // Auth check - only authenticated admins can use AI chat
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message, context } = body as { message: string; context?: string }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a helpful admin assistant for GOALZONE, a football live scores platform. Help with content ideas, data analysis, match summaries, and general admin tasks. Be concise, professional, and football-knowledgeable. When suggesting content, consider current football trends and provide actionable recommendations.${context ? `\n\nAdditional context: ${context}` : ''}`

    const client = await ZAI.create()
    const response = await client.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    })

    const reply = response.choices?.[0]?.message?.content ?? 'I apologize, I was unable to generate a response. Please try again.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Error in AI chat:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}
