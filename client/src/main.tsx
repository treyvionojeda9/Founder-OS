import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { applyMaterials } from "./design/materials";
import { applyPalette } from "./design/palette";
import { applyType } from "./design/type";
import "./index.css";

applyPalette(document.documentElement);
applyType(document.documentElement);
applyMaterials(document.documentElement);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
