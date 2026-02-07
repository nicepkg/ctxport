"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[Global Error Boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fafafa",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              maxWidth: "400px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "1rem",
                borderRadius: "1rem",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                marginBottom: "1.5rem",
              }}
            >
              <svg
                style={{ height: "2.5rem", width: "2.5rem", color: "#ef4444" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                color: "#1a1a2e",
              }}
            >
              Critical Error
            </h2>
            <p
              style={{
                color: "#666",
                marginBottom: "1.5rem",
                lineHeight: 1.6,
              }}
            >
              A critical error occurred. Please refresh the page or contact
              support if the problem persists.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: "#6366f1",
                color: "white",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
