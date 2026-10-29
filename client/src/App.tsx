import { Outlet, Route, BrowserRouter, Routes } from "react-router-dom";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { useFormFactor } from "./hooks/useFormFactor";
import { DesignSystem } from "./routes/DesignSystem";
import { Home } from "./routes/Home";
import { LearnStub } from "./routes/LearnStub";
import { SettingsPage } from "./routes/SettingsPage";
import { Splash } from "./routes/Splash";
import { TeamStub } from "./routes/TeamStub";
import { SessionProvider } from "./storage/session";

function Frame() {
  const layout = useFormFactor();
  return (
    <div className="app" data-layout={layout}>
      <OfflineIndicator />
      <Outlet />
    </div>
  );
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<Frame />}>
            <Route path="/" element={<Splash />} />
            <Route path="/home" element={<Home />} />
            <Route path="/team/:id" element={<TeamStub />} />
            <Route path="/learn/:id" element={<LearnStub />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/design" element={<DesignSystem />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
