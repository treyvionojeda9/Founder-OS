import { useEffect, useState } from "react";
import { Sprite } from "../design/Sprite";
import { offlineCloud } from "../design/sprites";

export function OfflineIndicator() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="offline" role="status">
      <Sprite rows={offlineCloud} scale={4} title="" />
      <span>Offline — saving locally</span>
    </div>
  );
}
