const DOMAIN_URL = "https://grok.com";
const ASSETS_URL = "https://assets.grok.com";
const COOKIE_FILE = '../data/grok_cookies.json'; // 注意路径相对src目录

// 读取保存的cookie
async function loadCookies() {
    try {
        const data = await Deno.readTextFile(COOKIE_FILE);
        return JSON.parse(data) || {};
    } catch (error) {
        // 文件不存在时返回空对象
        return {};
    }
}

// 保存cookie到文件
async function saveCookies(cookies) {
    try {
        await Deno.writeTextFile(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    } catch (error) {
        console.error('Error saving cookies:', error);
    }
}

export async function handleGrokRequest (req) {

    const url = new URL(req.url);
    console.log('Request URL:', req.url);
    
    let targetPath;
    let domainUrl = DOMAIN_URL;
    // 如果是 /grok 路径，移除前缀
    if (url.pathname.startsWith('/grok')) {
        targetPath = url.pathname.replace(/^\/grok/, '');
    // 如果是 /assets 路径，移除前缀，重定到资源站
    } else if (url.pathname.startsWith('/assets')) {
        targetPath = url.pathname.replace(/^\/assets/, '');
        domainUrl = ASSETS_URL
    } else {
        // 其他 直接使用路径（可能是Grok内部请求）
        targetPath = url.pathname;
    }
    
    const targetFullUrl = new URL(targetPath + url.search, domainUrl);
    console.log('Target URL:', targetFullUrl.toString());

    // 构造代理请求
    const headers = new Headers(req.headers);
    headers.set("Host", targetFullUrl.host);

    // === 持久化cookie逻辑 ===
    // 以host为key区分不同来源（如有需要可自定义）
    const savedCookies = await loadCookies();
    const host = req.headers.get('host') || 'default';
    let grokCookie = savedCookies[host] || '';
    const cookieHeader = req.headers.get('cookie');

    // 如果请求带了cookie且和已保存不同，则更新保存
    if (cookieHeader && cookieHeader !== grokCookie) {
        savedCookies[host] = cookieHeader;
        grokCookie = cookieHeader;
        saveCookies(savedCookies).catch(console.error);
    }

    // 使用已保存的cookie
    if (grokCookie) {
        headers.set("cookie", grokCookie);
    }

    headers.delete("Referer");
    //删除可能暴露IP的请求头
    headers.delete('CF-Connecting-IP');
    headers.delete('X-Forwarded-For');
    headers.delete('X-Real-IP');
    headers.delete('True-Client-IP');
    headers.delete('x-vercel-deployment-url');
    headers.delete('x-vercel-forwarded-for');
    headers.delete('x-forwarded-host');
    headers.delete('x-forwarded-port');
    headers.delete('x-forwarded-proto');
    headers.delete('x-vercel-id');
    headers.delete('origin');
    headers.delete('baggage');

    //console.log('Request Headers:', headers);

    try {
        const fetchResponse = await fetch(targetFullUrl.toString(), {
        method: req.method,
        headers,
        body: req.body,
        redirect: "manual",
        });

        const responseHeaders = new Headers(fetchResponse.headers);
        responseHeaders.delete("Content-Length");

        // 替换请求中的部分资源地址
        const textTransformStream = new TransformStream({
        transform: (chunk, controller) => {
            const contentType = responseHeaders.get("Content-Type") || "";
            if (contentType.startsWith("text/") || contentType.includes("json")) {
            let decodedText = new TextDecoder("utf-8").decode(chunk);

            // 替换assets.grok.com链接，让图片请求本地走代理
            if (contentType.includes("text/html")) {
                const serverOrigin = new URL(req.url).origin;
                decodedText = decodedText.replaceAll(ASSETS_URL, serverOrigin);
            }
            
            // 替换users/为assets/users/，适配本地图片地址
            if (contentType.includes("json") && 
                (decodedText.includes("streamingImageGenerationResponse") || 
                decodedText.includes("generatedImageUrls"))) {
                    decodedText = decodedText.replaceAll('users/', 'assets/users/');
            }
            
            controller.enqueue(new TextEncoder().encode(decodedText));
            } else {
            controller.enqueue(chunk);
            }
        }
        });

        const transformedStream = fetchResponse.body?.pipeThrough(textTransformStream);

        return new Response(transformedStream, {
        status: fetchResponse.status,
        headers: responseHeaders,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Proxy Error:', errorMessage);
        return new Response(`Proxy Error: ${errorMessage}`, { status: 500 });
    }

}
