// mobile/app/(tabs)/index.tsx
// OLD "Tugas Saya" screen - now fully redirected to Ghost Mode (map)

import { Redirect } from "expo-router";

export default function OldTasksScreen() {
  // Segala akses ke /(tabs) atau /(tabs)/index akan langsung ke peta
  return <Redirect href="/(tabs)/ghost-mode" />;
}
