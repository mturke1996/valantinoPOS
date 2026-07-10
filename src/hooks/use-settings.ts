"use client";

import { useEffect, useState } from "react";

import { getSettings, subscribe } from "@/lib/data/store";
import type { Settings } from "@/types";

export function useSettings(): Settings {
  const [settings, setSettings] = useState(getSettings);

  useEffect(() => {
    return subscribe(() => {
      setSettings(getSettings());
    });
  }, []);

  return settings;
}
