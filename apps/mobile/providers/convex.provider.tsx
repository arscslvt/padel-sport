import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type React from "react";

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
			tokenCache={tokenCache}
		>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				{children}
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
