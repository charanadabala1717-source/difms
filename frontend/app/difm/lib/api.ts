const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

const getActiveOrganizationId = () => {
  if (typeof window === "undefined") return null;

  const user = JSON.parse(localStorage.getItem("user") || "null");
  return user?.activeOrganization?._id || null;
};

export const setAuthSession = (token: string, user: unknown) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { skipAuth, headers, ...rest } = options;
  const token = getToken();
  const organizationId = getActiveOrganizationId();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
      ...(organizationId && !skipAuth ? { "x-organization-id": organizationId } : {}),
      ...headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data as T;
};

export const apiBlobRequest = async (
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ blob: Blob; filename?: string }> => {
  const { skipAuth, headers, ...rest } = options;
  const token = getToken();
  const organizationId = getActiveOrganizationId();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers: {
      ...(token && !skipAuth ? { Authorization: `Bearer ${token}` } : {}),
      ...(organizationId && !skipAuth ? { "x-organization-id": organizationId } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "Request failed");
  }

  const contentDisposition = response.headers.get("Content-Disposition");
  const filename = contentDisposition?.match(/filename="?([^"]+)"?/)?.[1];

  return {
    blob: await response.blob(),
    filename,
  };
};
