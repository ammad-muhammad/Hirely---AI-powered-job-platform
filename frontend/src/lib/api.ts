import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

export const clearApiCache = (pattern?: string) => {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true, // Send httpOnly cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept GET requests for fast session caching
const originalGet = api.get.bind(api);
(api as any).get = function (
  url: string,
  config?: AxiosRequestConfig & { bypassCache?: boolean; ttl?: number }
) {
  const isBypass = config?.bypassCache === true;
  const cacheKey = `${url}?${JSON.stringify(config?.params || {})}`;

  if (!isBypass && apiCache.has(cacheKey)) {
    const entry = apiCache.get(cacheKey)!;
    const now = Date.now();
    const ttl = config?.ttl || CACHE_TTL_MS;
    if (now - entry.timestamp < ttl) {
      // Return cached response instantly
      return Promise.resolve({
        data: entry.data,
        status: 200,
        statusText: 'OK (Cached)',
        headers: {},
        config: config || {},
      });
    } else {
      apiCache.delete(cacheKey);
    }
  }

  return originalGet(url, config).then((response) => {
    if (response && response.data) {
      apiCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }
    return response;
  });
};

// Automatically invalidate cache on mutations
const originalPost = api.post.bind(api);
(api as any).post = function (...args: any[]) {
  clearApiCache();
  return (originalPost as any)(...args);
};

const originalPut = api.put.bind(api);
(api as any).put = function (...args: any[]) {
  clearApiCache();
  return (originalPut as any)(...args);
};

const originalDelete = api.delete.bind(api);
(api as any).delete = function (...args: any[]) {
  clearApiCache();
  return (originalDelete as any)(...args);
};

const originalPatch = api.patch.bind(api);
(api as any).patch = function (...args: any[]) {
  clearApiCache();
  return (originalPatch as any)(...args);
};

// Global response interceptor for clean error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';
    return Promise.reject(new Error(message));
  }
);
