import React from "react";
import { Box, Typography } from "@mui/material";

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  variant?: "fullPage" | "inline";
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Box
        sx={{
          p: 4,
          color: "status.error",
          minHeight: this.props.variant === "fullPage" ? "100dvh" : undefined,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 1,
        }}
      >
        <Typography variant="sectionTitle">Something went wrong</Typography>
        <Typography variant="mono" sx={{ color: "text.tertiary" }}>
          {this.state.error.message}
        </Typography>
      </Box>
    );
  }
}

export default ErrorBoundary;
