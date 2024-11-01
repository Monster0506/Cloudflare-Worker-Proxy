import { marked } from "marked";

addEventListener("fetch", (event) => {
  console.log("[INFO] Fetch event triggered.");
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { pathname, searchParams } = new URL(request.url);
  console.log("[INFO] Request received for path:", pathname);

  if (pathname.startsWith("/api/")) {
    return handleApiProxy(request, pathname, searchParams);
  } else if (pathname.startsWith("/jina/")) {
    return handleJinaProxy(request, pathname);
  } else if (pathname.startsWith("/extract-pdf")) {
    return handlePdfExtraction(searchParams);
  } else {
    console.log("[ERROR] Unknown path:", pathname);
    return addCorsHeaders(new Response("Not Found", { status: 404 }));
  }
}

async function handleApiProxy(request, pathname, searchParams) {
  let targetUrl = pathname.replace("/api/", "");
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "http://" + targetUrl;
  }

  console.log("[INFO] Target URL constructed for /api endpoint:", targetUrl);

  const queryParams = Array.from(searchParams.entries())
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  const fullUrl = queryParams ? `${targetUrl}?${queryParams}` : targetUrl;

  console.log("[INFO] Full URL with query params:", fullUrl);

  try {
    console.log("[INFO] Starting HEAD request to check content type...");
    const headResponse = await fetch(fullUrl, { method: "HEAD" });
    const contentType = headResponse.headers.get("content-type");
    console.log("[INFO] Content-Type detected:", contentType);

    if (contentType === "application/pdf") {
      console.log("[INFO] PDF detected. Redirecting to extraction server.");
      return handlePdfExtraction(new URLSearchParams({ url: fullUrl }));
    } else if (contentType.includes("text/html")) {
      console.log("[INFO] HTML page detected. Fetching HTML content.");
      const htmlResponse = await fetch(fullUrl);
      const htmlText = await htmlResponse.text();
      console.log("[INFO] HTML content fetched successfully.");
      return addCorsHeaders(
        new Response(htmlText, { headers: { "Content-Type": "text/html" } }),
      );
    } else {
      console.log("[ERROR] Unsupported content type:", contentType);
      return addCorsHeaders(
        new Response("<h1>Unsupported content type</h1>", { status: 415 }),
      );
    }
  } catch (error) {
    console.error("[ERROR] Error processing URL:", error.message);
    return addCorsHeaders(
      new Response("<h1>Error processing URL</h1>", { status: 500 }),
    );
  }
}

async function handleJinaProxy(request, pathname) {
  const targetPath = pathname.replace("/jina/", "");
  const jinaUrl = `https://r.jina.ai/${targetPath}`;

  console.log("[INFO] Constructed Jina URL:", jinaUrl);

  try {
    const response = await fetch(jinaUrl, {
      headers: {
        Accept: "text/markdown, text/html",
        "User-Agent": "Cloudflare Worker Proxy",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(
        "[ERROR] Jina API request failed with status:",
        response.status,
      );
      return addCorsHeaders(
        new Response("Error fetching Jina content", {
          status: response.status,
        }),
      );
    }

    const markdown = await response.text();
    console.log("[INFO] Markdown fetched successfully. Converting to HTML.");
    const htmlDocument = marked.parse(markdown);
    console.log(
      "[INFO] Markdown conversion successful. Sending HTML response.",
    );
    return addCorsHeaders(
      new Response(htmlDocument, { headers: { "Content-Type": "text/html" } }),
    );
  } catch (error) {
    console.error("[ERROR] Error processing Jina API request:", error.message);
    return addCorsHeaders(
      new Response("Error processing Jina API request", { status: 500 }),
    );
  }
}

async function handlePdfExtraction(searchParams) {
  const pdfUrl = searchParams.get("url");
  if (!pdfUrl) {
    console.error("[ERROR] No PDF URL provided in query parameters.");
    return addCorsHeaders(
      new Response("Error: No PDF URL provided", { status: 400 }),
    );
  }

  const pdfExtractionApiUrl = `https://pdftotext-one.vercel.app/extract-pdf?url=${encodeURIComponent(pdfUrl)}`;
  console.log("[INFO] Calling PDF extraction API at:", pdfExtractionApiUrl);

  try {
    const response = await fetch(pdfExtractionApiUrl);
    console.log(
      "[INFO] Received response from PDF extraction server. Status:",
      response.status,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("[INFO] PDF text extracted successfully from server.");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Extracted PDF Content</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          pre { white-space: pre-wrap; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <h1>Extracted PDF Content</h1>
        <pre>${data.text}</pre>
      </body>
      </html>
    `;
    console.log(
      "[INFO] HTML content created from extracted PDF text. Sending response.",
    );
    return addCorsHeaders(
      new Response(htmlContent, { headers: { "Content-Type": "text/html" } }),
    );
  } catch (error) {
    console.error(
      "[ERROR] Error fetching or processing PDF text:",
      error.message,
    );
    return addCorsHeaders(
      new Response("Error processing PDF text.", { status: 500 }),
    );
  }
}

function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  newHeaders.set("Access-Control-Allow-Credentials", "true"); // Allow credentials if needed
  return new Response(response.body, { ...response, headers: newHeaders });
}
