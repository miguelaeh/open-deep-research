import { NextResponse } from 'next/server'
import { reportContentRatelimit } from '@/lib/redis'
import { CONFIG } from '@/lib/config'
import { extractAndParseJSON } from '@/lib/utils'
import { generateWithModel } from '@/lib/models'
import { type ModelVariant } from '@/types'

export async function POST(request: Request) {
  try {
    const { prompt, model = 'google/gemini-2.0-flash-lite-preview-02-05:free' } =
      (await request.json()) as {
        prompt: string
        model: ModelVariant
      }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Return test results for test queries
    if (prompt.toLowerCase() === 'test') {
      return NextResponse.json({
        query: 'test',
        optimizedPrompt:
          'Analyze and compare different research methodologies, focusing on scientific rigor, peer review processes, and validation techniques',
        explanation: 'Test optimization strategy',
        suggestedStructure: [
          'Test Structure 1',
          'Test Structure 2',
          'Test Structure 3',
        ],
      })
    }

    // Only check rate limit if enabled
    const platform = model.split('/')[0]
    if (CONFIG.rateLimits.enabled) {
      const { success } = await reportContentRatelimit.limit(
        'agentOptimizations'
      )
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        )
      }
    }

    // Check if selected platform is enabled
    const platformConfig =
      CONFIG.platforms[platform as keyof typeof CONFIG.platforms]
    if (!platformConfig?.enabled) {
      return NextResponse.json(
        { error: `${platform} platform is not enabled` },
        { status: 400 }
      )
    }

    // Check if selected model exists and is enabled
    const modelConfig = (platformConfig as any).models[model]
    if (!modelConfig) {
      return NextResponse.json(
        { error: `${model} model does not exist` },
        { status: 400 }
      )
    }
    if (!modelConfig.enabled) {
      return NextResponse.json(
        { error: `${model} model is disabled` },
        { status: 400 }
      )
    }

    // Get the user BrainLink access token
    const auth = request.headers.get("Authorization") || "";
    if (!auth) {
      return NextResponse.json({ error: "Missing auth header with BrainLink token" }, { status: 400 });
    }
    const brainLinkUserAccessToken = auth.split(" ")[1];
    if (!brainLinkUserAccessToken) {
      return NextResponse.json({ error: "Invalid auth header" }, { status: 400 });
    }

    const systemPrompt = `You are a research assistant tasked with optimizing a research topic into an effective search query.

Given this research topic: "${prompt}"

Your task is to:
1. Generate ONE optimized search query that will help gather comprehensive information
2. Create an optimized research prompt that will guide the final report generation
3. Suggest a logical structure for organizing the research

The query should:
- Cover the core aspects of the topic
- Use relevant technical terms and synonyms
- Be specific enough to return high-quality results
- Be comprehensive yet concise

Format your response as a JSON object with this structure:
{
  "query": "the optimized search query",
  "optimizedPrompt": "The refined research prompt that will guide report generation",
  "explanation": "Brief explanation of the optimization strategy",
  "suggestedStructure": [
    "Key aspect 1 to cover",
    "Key aspect 2 to cover",
    "Key aspect 3 to cover"
  ]
}

Make the query clear and focused, avoiding overly complex or lengthy constructions.`

    try {
      const response = await generateWithModel(systemPrompt, model, brainLinkUserAccessToken)

      if (!response) {
        throw new Error('No response from model')
      }

      try {
        const parsedResponse = extractAndParseJSON(response)
        return NextResponse.json(parsedResponse)
      } catch (parseError) {
        console.error('Failed to parse optimization:', parseError)
        return NextResponse.json(
          { error: 'Failed to optimize research' },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error('Model generation error:', error)
      return NextResponse.json(
        { error: 'Failed to generate optimization' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Research optimization failed:', error)
    return NextResponse.json(
      { error: 'Failed to optimize research' },
      { status: 500 }
    )
  }
}
