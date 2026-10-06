import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Demo from "./Demo";
import OrderFixture from "./OrderFixture";
import "@vision-qa/ui/theme.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {["/fixture/order", "/fixture/operator", "/demo/order"].includes(location.pathname) ? (
      <OrderFixture />
    ) : (
      location.pathname === "/demo" ? <Demo /> : <App />
    )}
  </React.StrictMode>,
);
