// @ts-ignore: Deno URL imports are not recognized by Vite's standard TS config
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // @ts-ignore: Deno namespace is not in the Vite TS environment
    const apiKey = Deno.env.get('VITE_EXCHANGE_RATE_API_KEY')
    if (!apiKey) {
      throw new Error('VITE_EXCHANGE_RATE_API_KEY environment variable is missing')
    }

    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/EUR`
    const res = await fetch(url)
    
    if (!res.ok) {
      throw new Error(`Failed to fetch from ExchangeRate-API: ${res.status}`)
    }

    const data = await res.json()
    if (data.result !== 'success') {
      throw new Error(data['error-type'] || 'API returned error')
    }

    // Return the successful response back to the client
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
