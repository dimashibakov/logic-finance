"use client";

import { useEffect, useRef, useState } from "react";

export default function PwaUpdate() {
  const [pending, setPending] = useState(false);
  const skipFirstControllerChange = useRef(true);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    if (navigator.serviceWorker.controller) {
      skipFirstControllerChange.current = false;
    }

    const reloadOnce = () => {
      if (skipFirstControllerChange.current) {
        skipFirstControllerChange.current = false;
        return;
      }
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);

    const checkForUpdate = () => {
      navigator.serviceWorker.ready
        .then((registration) => registration.update())
        .catch(() => {});
    };

    checkForUpdate();

    const onFocus = () => checkForUpdate();
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setPending(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", reloadOnce);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const applyUpdate = () => {
    const wb = (window as Window & { workbox?: { messageSkipWaiting: () => void } }).workbox;
    if (wb) {
      wb.messageSkipWaiting();
      return;
    }
    navigator.serviceWorker.ready.then((registration) => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
    window.location.reload();
  };

  if (!pending) return null;

  return (
    <div className="lf-pwa-update" role="status">
      <span>Доступна новая версия</span>
      <button type="button" className="lf-pwa-update__btn lf-mono" onClick={applyUpdate}>
        Обновить
      </button>
    </div>
  );
}
