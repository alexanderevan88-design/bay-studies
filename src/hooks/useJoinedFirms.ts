"use client";

import { useCallback, useEffect, useState } from "react";
import { JOINED_EVENT, loadJoined, setJoined, type JoinedMap } from "@/lib/joinedFirms";

/** Joined firm panels on this device (localStorage only). */
export function useJoinedFirms() {
  const [joined, setMap] = useState<JoinedMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setMap(loadJoined());
    sync();
    setReady(true);
    window.addEventListener(JOINED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(JOINED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isJoined = useCallback((id: string | null | undefined) => !!(id && joined[id]), [joined]);
  const toggle = useCallback((id: string, value?: boolean) => {
    setMap(setJoined(id, value ?? !loadJoined()[id]));
  }, []);

  return { joined, ready, isJoined, toggle };
}
