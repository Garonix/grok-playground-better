import { handleGrokRequest } from "./handle_grok.js";


async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // 账户持久化API
  if (url.pathname === '/api/accounts' && req.method === 'GET') {
    try {
      const data = await Deno.readTextFile('/app/data/grok_cookies.json');
      return new Response(data, { headers: { 'Content-Type': 'application/json' } });
    } catch {
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }
  }
  if (url.pathname === '/api/accounts' && req.method === 'POST') {
    const body = await req.text();
    await Deno.writeTextFile('/app/data/grok_cookies.json', body);
    return new Response('ok');
  }
  console.log('Request URL:', req.url);

  // 处理主页面
  const filePath = url.pathname;
  console.log('filePath:', filePath);
  if (filePath === '/' || filePath === '/index.html') {
      const fullPath = `${Deno.cwd()}/src/static/index.html`;
      const file = await Deno.readFile(fullPath);
      return new Response(file, {
        headers: {
          'content-type': `text/html;charset=UTF-8`,
        },
      });
  }

  if (filePath === '/how_to_get_cookie.png') {
    const fullPath = `${Deno.cwd()}/src/static/how_to_get_cookie.png`;
    const file = await Deno.readFile(fullPath);
    return new Response(file, {
      headers: {
      },
    });
}
  
  //处理grok请求
  return handleGrokRequest(req);

};

Deno.serve({ port: 80 },handleRequest); 