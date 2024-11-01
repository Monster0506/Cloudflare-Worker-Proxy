# API Documentation

## Overview

This API provides a Cloudflare Worker-based service that proxies various types of requests, allowing for API calls, markdown conversions, and PDF text extraction. It supports the following endpoints:

- `/api/`: Proxies requests to specified URLs, automatically handling HTML and PDF content types.
- `/jina/`: Fetches markdown content from the Jina API, converts it to HTML, and returns the result.
- `/extract-pdf?url=`: Extracts text content from a PDF file specified via a URL parameter.

The API adds appropriate CORS headers to all responses, making it accessible to different origins.

## Endpoints

### 1. `/api/{url}`

Proxies requests to a given target URL (specified in the path). The API verifies the content type of the target URL:

- **HTML content**: Returns the HTML page directly.
- **PDF content**: Redirects the request to a PDF extraction service.

**Request Format:**

```
GET /api/{target-url}
```

**Query Parameters:** Any query parameters provided in the original request will be passed to the target URL.

**Response:** The response varies based on the content type of the target URL.

- **HTML content**: Returns the HTML as-is.
- **PDF content**: Redirects to `/extract-pdf` to extract the text content of the PDF.

### 2. `/jina/{endpoint-path}`

Fetches markdown content from the Jina API. The markdown is converted to HTML before being returned.

**Request Format:**

```
GET /jina/{endpoint-path}
```

**Response:** Returns the converted HTML content from the markdown provided by Jina API.

### 3. `/extract-pdf`

This endpoint extracts text content from a specified PDF file, using an external PDF-to-text service.

**Request Format:**

```
GET /extract-pdf?url={pdf-url}
```

**Query Parameters:**

- `url`: The URL of the PDF file to extract text from.

**Response:** The extracted text from the PDF file is wrapped in a simple HTML structure for display.

## Error Handling

The API responds with specific errors for different cases:

- **404 Not Found**: Triggered if an unsupported path is requested.
- **415 Unsupported Media Type**: Returned if the `/api` endpoint encounters an unsupported content type.
- **400 Bad Request**: Returned if `/extract-pdf` is called without a `url` parameter.
- **500 Internal Server Error**: Triggered for any other processing errors.

## Response Headers

All responses from the API include CORS headers:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
- `Access-Control-Allow-Credentials: true`

## Setup and Deployment

This API is designed to run as a Cloudflare Worker. Deploy it by following Cloudflare’s guidelines for deploying Workers.

## Logs

The API logs various events and errors to assist with debugging. These logs include:

- `[INFO]` logs for regular processing steps.
- `[ERROR]` logs for any unexpected issues.
