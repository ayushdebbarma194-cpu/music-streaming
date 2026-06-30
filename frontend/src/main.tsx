import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { ThemeProvider } from "./lib/ThemeProvider";
import { PlaybackProvider } from "./lib/PlaybackProvider";
import { queryClient } from "./lib/queryClient";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PlaybackProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PlaybackProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
