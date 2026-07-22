'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { UserProfile } from '@/types/user';

interface ProfileContextType {
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  cachedProfile: UserProfile | null;
  setCachedProfile: (profile: UserProfile | null) => void;
}

const ProfileContext = createContext<ProfileContextType>({
  avatarUrl: null,
  setAvatarUrl: () => {},
  refreshKey: 0,
  triggerRefresh: () => {},
  cachedProfile: null,
  setCachedProfile: () => {},
});

export function useProfileContext() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cachedProfile, setCachedProfile] = useState<UserProfile | null>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        avatarUrl,
        setAvatarUrl,
        refreshKey,
        triggerRefresh,
        cachedProfile,
        setCachedProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
