import { useAuth } from "@clerk/clerk-expo";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";

/** Profilo giocatore dell'utente autenticato (null se non loggato o senza profilo). */
export function useCurrentPlayer() {
	const { isLoaded, isSignedIn } = useAuth();
	const player = useQuery(
		api.modules.openMatches.players.me,
		isSignedIn ? {} : "skip",
	);

	return {
		isLoading: !isLoaded || (!!isSignedIn && player === undefined),
		isSignedIn: !!isSignedIn,
		player: player ?? null,
	};
}

/**
 * Esegue un'azione solo se l'utente ha un profilo giocatore completo:
 * altrimenti apre login o setup profilo e l'utente riprova da lì.
 */
export function usePlayerGate() {
	const router = useRouter();
	const { isLoading, isSignedIn, player } = useCurrentPlayer();

	const gate = (action: () => void) => {
		if (isLoading) return;
		if (!isSignedIn) {
			router.push("/auth");
			return;
		}
		if (!player) {
			router.push("/profile-setup");
			return;
		}
		action();
	};

	return { isLoading, isSignedIn, player, gate };
}
