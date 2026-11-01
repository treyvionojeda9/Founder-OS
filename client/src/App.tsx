import { Outlet, Route, BrowserRouter, Routes } from "react-router-dom";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { DoorTransition } from "./hall/DoorTransition";
import { useFormFactor } from "./hooks/useFormFactor";
import { DesignSystem } from "./routes/DesignSystem";
import { Home } from "./routes/Home";
import { LearnStub } from "./routes/LearnStub";
import { SettingsPage } from "./routes/SettingsPage";
import { Splash } from "./routes/Splash";
import { StatusFrameDemo } from "./routes/StatusFrameDemo";
import { TeamRoom } from "./routes/TeamRoom";
import { ChromeRecede } from "./nav/ChromeRecede";
import { GotoChrome } from "./nav/GotoChrome";
import { SessionProvider } from "./storage/session";

function Frame() {
  const layout = useFormFactor();
  return (
    <DoorTransition>
      <div className="app" data-layout={layout}>
        <OfflineIndicator />
        <div className="route-content">
          <Outlet />
        </div>
        <GotoChrome />
        <ChromeRecede />
      </div>
    </DoorTransition>
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
            <Route path="/team/:id" element={<TeamRoom />} />
            <Route path="/learn/:id" element={<LearnStub />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/design" element={<DesignSystem />} />
            <Route path="/status-frame" element={<StatusFrameDemo />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
