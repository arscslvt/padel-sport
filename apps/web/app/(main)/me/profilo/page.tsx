import type { Metadata } from "next";

import { ProfileSection } from "../_components/profile-section";

export const metadata: Metadata = { title: "Profilo" };

export default function ProfilePage() {
  return <ProfileSection />;
}
