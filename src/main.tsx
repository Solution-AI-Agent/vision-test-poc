import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import OrderFixture from "./OrderFixture";
import "./index.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {["/fixture/order", "/fixture/operator"].includes(location.pathname) ? (
      <OrderFixture />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
