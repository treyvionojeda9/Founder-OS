import { lazy, Suspense } from "react";
import { Outlet, Route, BrowserRouter, Routes, useLocation } from "react-router-dom";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { DoorTransition } from "./hall/DoorTransition";
import { useFormFactor } from "./hooks/useFormFactor";
import { Home } from "./routes/Home";
import { LearnRoomReady, TeamRoomReady } from "./routes/loadRooms";
import { Splash } from "./routes/Splash";
import { ChromeRecede } from "./nav/ChromeRecede";
import { GotoChrome } from "./nav/GotoChrome";
import { AppShell } from "./shell/AppShell";
import { SessionProvider } from "./storage/session";

/** Design and status-frame demos stay full-bleed. The product frame starts after Splash. */
function bareShell(pathname: string): boolean {
  return pathname === "/" || pathname === "/design" || pathname === "/status-frame";
}

const SettingsPage = lazy(() => import("./routes/SettingsPage").then((mod) => ({ default: mod.SettingsPage })));
const DesignSystem = lazy(() => import("./routes/DesignSystem").then((mod) => ({ default: mod.DesignSystem })));
const StatusFrameDemo = lazy(() => import("./routes/StatusFrameDemo").then((mod) => ({ default: mod.StatusFrameDemo })));

function Frame() {
  const layout = useFormFactor();
  const { pathname } = useLocation();
  const bare = bareShell(pathname);
  const room = (
    <div className="route-content">
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  );
  return (
    <DoorTransition>
      <div className="app" data-layout={layout} data-shell={bare ? "bare" : "columns"}>
        <OfflineIndicator />
        {bare ? room : <AppShell layout={layout}>{room}</AppShell>}
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
            <Route path="/team/:id" element={<TeamRoomReady />} />
            <Route path="/learn/:id" element={<LearnRoomReady />} />
            <Route path="/work/overview" element={<TeamRoomReady />} />
            <Route path="/work/library" element={<TeamRoomReady />} />
            <Route path="/school/path" element={<LearnRoomReady />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/design" element={<DesignSystem />} />
            <Route path="/status-frame" element={<StatusFrameDemo />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
