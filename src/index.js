import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

// Garante que o elemento root existe antes de montar
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Erro Crítico: Não foi possível encontrar o elemento com id 'root' no index.html"
  );
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
