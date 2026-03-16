import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

// Cross-tab synchronization
const refreshChannel = new BroadcastChannel("auth_refresh_channel");

refreshChannel.onmessage = (event) => {
  if (event.data?.type === "REFRESH_STARTED") {
    isRefreshing = true;
  } else if (event.data?.type === "REFRESH_SUCCESS") {
    isRefreshing = false;
    processQueue(null, event.data.token);
  } else if (event.data?.type === "REFRESH_ERROR") {
    isRefreshing = false;
    processQueue(event.data.error, null);
  }
};

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("token");

  if (token && !config._skipRefresh) {
    const decoded = parseJwt(token);
    if (decoded && decoded.exp && (decoded.exp * 1000) - Date.now() < 120 * 1000) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshChannel.postMessage({ type: "REFRESH_STARTED" });

        try {
          const refreshRes = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, {
            withCredentials: true
          });
          const newToken = refreshRes.data?.token;
          if (newToken) {
            localStorage.setItem("token", newToken);
            token = newToken;
            isRefreshing = false;

            refreshChannel.postMessage({ type: "REFRESH_SUCCESS", token: newToken });
            processQueue(null, newToken);
          }
        } catch (error) {
          refreshChannel.postMessage({ type: "REFRESH_ERROR", error });
          processQueue(error, null);
          localStorage.removeItem("token");
          if (window.location.pathname === '/dashboard') {
            window.location.href = "/login";
          }
          token = null;
        } finally {
          isRefreshing = false;
        }
      } else {
        try {
          token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
        } catch (error) {
          token = null;
        }
      }
    }
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    if (!error.response) {
      return Promise.reject(error);
    }

    const isRefreshPath = originalRequest.url?.includes("/api/auth/refresh");

    if (originalRequest._skipRefresh || originalRequest._retry || isRefreshPath) {
      if (isRefreshPath) {
        localStorage.removeItem("token");
        if (window.location.pathname === '/dashboard') {
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }

    // 2. Handle 401 Unauthorized
    if (error.response.status === 401) {
      if (isRefreshing) {
        // Queue this request and wait for the refresh in progress (in this tab or another)
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          originalRequest._retry = true; // Mark as retry
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      refreshChannel.postMessage({ type: "REFRESH_STARTED" });

      try {
        const refreshRes = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, {
          withCredentials: true,
          _skipRefresh: true // Extra safety to avoid interceptor recursion
        });

        const newToken = refreshRes.data?.token;
        if (newToken) {
          localStorage.setItem("token", newToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          refreshChannel.postMessage({ type: "REFRESH_SUCCESS", token: newToken });
        }

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        refreshChannel.postMessage({ type: "REFRESH_ERROR", error: refreshError });
        processQueue(refreshError, null);

        localStorage.removeItem("token");
        if (window.location.pathname === '/dashboard') {
          window.location.href = "/login?session_expired=true";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
