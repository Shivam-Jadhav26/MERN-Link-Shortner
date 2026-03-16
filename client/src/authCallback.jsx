import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const completeAuth = async () => {
      try {
        // Read the access token injected into the URL by the OAuth callback redirect
        const token = searchParams.get("token");
        if (token) {
          // Persist it so the request interceptor can attach it as a Bearer header.
          // This is the cross-domain fallback — cookies may be blocked by the browser.
          localStorage.setItem("token", token);
        }

        // Also attempt a cookie-based refresh (works when cookies aren't blocked)
        try {
          const refreshRes = await api.post("/api/auth/refresh", {}, { _skipRefresh: true });
          const newToken = refreshRes.data?.token;
          if (newToken) {
            localStorage.setItem("token", newToken);
          }
        } catch {
          // Refresh cookie may not be available in strict cross-site browsers — that's fine,
          // the access token from the URL is still valid for 15 minutes.
        }

        const res = await api.get("/api/auth/me", { _skipRefresh: true });

        if (res.data?.userId) {
          navigate("/", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        navigate("/login", { replace: true });
      }
    };

    completeAuth();
  }, [navigate, searchParams]);

  return <h2>Logging you in...</h2>;
}