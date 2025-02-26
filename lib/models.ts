export async function generateWithBrainLink(
  systemPrompt: string,
  model: string,
  userAccessToken: string,
): Promise<string> {
  const response = await fetch(
    'https://www.brainlink.dev/api/v1/chat/completions',
    //'http://localhost:3001/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: systemPrompt,
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    console.log(JSON.stringify(response));
    throw new Error(`BrainLink API error: ${response}`)
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error(
      `Invalid BrainLink response format: ${JSON.stringify(data)}`
    )
  }

  return data.choices[0].message.content
}

export async function generateWithModel(
  systemPrompt: string,
  model: string,
  userAccesstoken: string,
): Promise<string> {
      return generateWithBrainLink(systemPrompt, model, userAccesstoken)
}
