"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_PROFILE, type Profile } from "@/lib/types";
import { loadProfile, saveProfile } from "@/lib/storage";

type ProfileContextValue = {
  profile: Profile;
  ready: boolean;
  update: (partial: Partial<Profile>) => void;
  reset: () => void;
  toggleSaved: (id: string) => void;
  dismissStudy: (id: string) => void;
  markApplied: (id: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setReady(true);
  }, []);

  const update = useCallback((partial: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...partial };
      saveProfile(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    saveProfile(DEFAULT_PROFILE);
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setProfile((prev) => {
      const has = prev.savedStudyIds.includes(id);
      const savedStudyIds = has
        ? prev.savedStudyIds.filter((x) => x !== id)
        : [...prev.savedStudyIds, id];
      const next = { ...prev, savedStudyIds };
      saveProfile(next);
      return next;
    });
  }, []);

  const dismissStudy = useCallback((id: string) => {
    setProfile((prev) => {
      const dismissedStudyIds = prev.dismissedStudyIds.includes(id)
        ? prev.dismissedStudyIds
        : [...prev.dismissedStudyIds, id];
      const savedStudyIds = prev.savedStudyIds.filter((x) => x !== id);
      const next = { ...prev, dismissedStudyIds, savedStudyIds };
      saveProfile(next);
      return next;
    });
  }, []);

  const markApplied = useCallback((id: string) => {
    setProfile((prev) => {
      const appliedStudyIds = prev.appliedStudyIds.includes(id)
        ? prev.appliedStudyIds
        : [...prev.appliedStudyIds, id];
      const next = { ...prev, appliedStudyIds };
      saveProfile(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      profile,
      ready,
      update,
      reset,
      toggleSaved,
      dismissStudy,
      markApplied,
    }),
    [profile, ready, update, reset, toggleSaved, dismissStudy, markApplied]
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
