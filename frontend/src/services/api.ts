const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{
  data: T | null;
  error: string | null;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      }
    );

    let responseData: any = null;

    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }

    if (!response.ok) {
      return {
        data: null,
        error:
          responseData?.message ||
          responseData?.error ||
          `Request failed with HTTP ${response.status}`,
      };
    }

    if (responseData?.success === false) {
      return {
        data: null,
        error:
          responseData.message ||
          "Backend request failed",
      };
    }

    return {
      data: responseData?.data ?? responseData,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to connect to backend",
    };
  }
}

export function get<T>(endpoint: string) {
  return apiRequest<T>(endpoint, {
    method: "GET",
  });
}

export function post<T>(
  endpoint: string,
  body: unknown
) {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}