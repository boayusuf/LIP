import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { streak, xp, tasksToday, levelName } = await req.json();
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        system: 'You are a concise, motivating productivity coach. Give personalized 1-2 sentence encouragement based on the user\'s stats. Be energetic and specific to their level/streak.',
        messages: [
          {
            role: 'user',
            content: `My stats: streak=${streak} days, xp=${xp}, level="${levelName}", tasks completed today=${tasksToday}. Give me a motivating message.`,
          },
        ],
      }),
    });

    const data = await response.json();
    const message = data.content?.[0]?.text || 'Keep pushing — every task completed brings you closer to your goals!';

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: 'Keep pushing — every task completed brings you closer to your goals!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
