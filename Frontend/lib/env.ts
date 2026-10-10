const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!backendUrl) {
  throw new Error("NEXT_PUBLIC_BACKEND_URL is required");
}

export const BACKEND_URL = backendUrl;
export const API_V1_URL =
  backendUrl === "/api"
    ? "/api/v1"
    : `${backendUrl.replace(/\/$/, "")}/v1`;
