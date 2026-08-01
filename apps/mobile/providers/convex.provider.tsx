import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type React from "react";
// ⚠️ DIAGNOSTICO TEMPORANEO: token cache con log al posto di quella ufficiale
// (`import { tokenCache } from "@clerk/clerk-expo/token-cache"`).
import { debugTokenCache } from "@/lib/token-cache";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
	unsavedChangesWarning: false,
});

/** Convex + Clerk: stesso deployment e stessa istanza Clerk del sito web. */
export default function ConvexClerkProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProvider
			publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
			tokenCache={debugTokenCache}
		>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				{children}
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
