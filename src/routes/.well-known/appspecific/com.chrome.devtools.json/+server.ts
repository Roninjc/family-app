// SvelteKit endpoint to respond to /.well-known/appspecific/com.chrome.devtools.json
export async function GET() {
  return new Response(JSON.stringify({}), {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
