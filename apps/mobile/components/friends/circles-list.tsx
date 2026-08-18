import { api } from "@padel-sport/backend/convex/_generated/api";
import type { CircleInviteView } from "@padel-sport/backend/convex/modules/circles/lib";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import CircleCard from "@/components/circles/circle-card";
import { Avatar } from "@/components/open-match-card";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Hint, SectionLabel } from "@/components/ui/choice";
import { IconSymbol } from "@/components/ui/icon-symbol";
import RowAction from "@/components/ui/row-action";

import { Fonts } from "@/constants/fonts";
import { useCurrentPlayer } from "@/hooks/use-current-player";
import { useTheme } from "@/hooks/use-theme";
import { convexErrorMessage } from "@/lib/format";

/**
 * Sezione "Cerchie": gli inviti ricevuti in cima, poi le proprie cerchie.
 * È il contenuto della seconda scheda della tab (app/(tabs)/friends.tsx).
 */
export default function CirclesList() {
	const theme = useTheme();
	const router = useRouter();
	const { isSignedIn } = useCurrentPlayer();

	const data = useQuery(
		api.modules.circles.list.default,
		isSignedIn ? {} : "skip",
	);
	const respond = useMutation(api.modules.circles.respond.default);

	const [busyId, setBusyId] = useState<string | null>(null);

	if (isSignedIn && data === undefined) {
		return <ActivityIndicator style={{ marginTop: 48 }} />;
	}

	const circles = data?.circles ?? [];
	const invites = data?.invites ?? [];
	const remaining = data?.remaining ?? 0;
	const max = data?.max ?? 3;

	const answer = async (
		inviteId: CircleInviteView["inviteId"],
		accept: boolean,
		name: string,
	) => {
		setBusyId(inviteId);
		try {
			await respond({ inviteId, accept });
			if (accept) {
				Alert.alert("Sei dentro 🎾", `Ora fai parte della cerchia "${name}".`);
			}
		} catch (err) {
			Alert.alert("Ops", convexErrorMessage(err));
		} finally {
			setBusyId(null);
		}
	};

	return (
		<View style={{ gap: 24 }}>
			{invites.length > 0 && (
				<View style={{ gap: 10 }}>
					<SectionLabel>{`Inviti ricevuti (${invites.length})`}</SectionLabel>
					{invites.map((invite) => (
						<InviteCard
							key={invite.inviteId}
							invite={invite}
							busy={busyId === invite.inviteId}
							onAccept={() =>
								answer(invite.inviteId, true, invite.circleName)
							}
							onDecline={() =>
								answer(invite.inviteId, false, invite.circleName)
							}
						/>
					))}
				</View>
			)}

			<View style={{ gap: 10 }}>
				<SectionLabel>
					{circles.length > 0
						? `Le tue cerchie (${circles.length} di ${max})`
						: "Le tue cerchie"}
				</SectionLabel>

				{circles.length === 0 ? (
					<View style={{ alignItems: "center", gap: 14, paddingVertical: 28 }}>
						<ThemedText type="subtitle" style={{ color: theme.textTinted }}>
							Non hai ancora cerchie
						</ThemedText>
						<ThemedText
							style={{
								fontSize: 14,
								color: theme.textMuted,
								textAlign: "center",
							}}
						>
							Una cerchia è un gruppo ristretto con cui organizzare partite
							senza passare dalle partite aperte. Puoi averne fino a {max}.
						</ThemedText>
						<Button
							label="Crea una cerchia"
							icon="person.3.fill"
							iconPosition="leading"
							height={50}
							onPress={() => router.push("/circles/new")}
						/>
					</View>
				) : (
					<>
						{circles.map((circle) => (
							<CircleCard key={circle.id} circle={circle} />
						))}

						{remaining > 0 ? (
							<Button
								label="Nuova cerchia"
								icon="plus"
								iconPosition="leading"
								variant="secondary"
								height={50}
								onPress={() => router.push("/circles/new")}
							/>
						) : (
							<Hint icon="person.3.fill">
								Hai raggiunto il limite di {max} cerchie. Per entrare in una
								nuova devi prima uscire da una di queste.
							</Hint>
						)}
					</>
				)}
			</View>
		</View>
	);
}

/**
 * Invito a una cerchia: chi invita, quanti sono già dentro e — se c'è — la nota
 * che ha scritto, che è spesso l'unica cosa che spiega di che gruppo si tratta.
 */
function InviteCard({
	invite,
	busy,
	onAccept,
	onDecline,
}: {
	invite: CircleInviteView;
	busy: boolean;
	onAccept: () => void;
	onDecline: () => void;
}) {
	const theme = useTheme();

	return (
		<SmoothView
			radius={20}
			smoothing={1}
			backgroundColor={theme.elevated}
			borderColor={theme.tint}
			borderWidth={1.5}
			shadow={false}
		>
			<View style={{ padding: 16, gap: 14 }}>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
					<Avatar url={invite.inviter.avatarUrl} size={44} />

					<View style={{ flex: 1, gap: 2 }}>
						<ThemedText
							style={{ fontSize: 16, fontFamily: Fonts.semiBold }}
							numberOfLines={1}
						>
							{invite.circleName}
						</ThemedText>
						<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
							{invite.inviter.name} ti ha invitato · {invite.memberCount}{" "}
							{invite.memberCount === 1 ? "giocatore" : "giocatori"}
						</ThemedText>
					</View>

					<View style={{ flexDirection: "row", gap: 8 }}>
						<RowAction
							icon="checkmark.circle.fill"
							label={`Entra in ${invite.circleName}`}
							tinted
							busy={busy}
							onPress={onAccept}
						/>
						<RowAction
							icon="xmark"
							label={`Rifiuta l'invito a ${invite.circleName}`}
							busy={busy}
							onPress={onDecline}
						/>
					</View>
				</View>

				{invite.note && (
					<View
						style={{
							flexDirection: "row",
							alignItems: "flex-start",
							gap: 10,
							padding: 12,
							borderRadius: 16,
							backgroundColor: theme.muted,
						}}
					>
						<IconSymbol
							name="bubble.left.fill"
							size={14}
							color={theme.textMuted}
						/>
						<ThemedText
							style={{
								flex: 1,
								fontSize: 13,
								lineHeight: 18,
								color: theme.text,
							}}
						>
							“{invite.note}”
						</ThemedText>
					</View>
				)}
			</View>
		</SmoothView>
	);
}
