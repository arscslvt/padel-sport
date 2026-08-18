import type { CircleView } from "@padel-sport/backend/convex/modules/circles/lib";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { Avatar } from "@/components/open-match-card";
import SmoothView from "@/components/smooth-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import Pill from "@/components/ui/pill";
import { Fonts } from "@/constants/fonts";
import { useTheme } from "@/hooks/use-theme";
import { formatMatchDate } from "@/lib/format";

/** Quanti avatar stanno nello stack prima di riassumere il resto con "+n". */
const AVATAR_LIMIT = 5;

/** Card di una cerchia: nome, membri e prossima partita in programma. */
export default function CircleCard({ circle }: { circle: CircleView }) {
	const theme = useTheme();
	const router = useRouter();

	const shown = circle.members.slice(0, AVATAR_LIMIT);
	const overflow = circle.members.length - shown.length;

	return (
		<SmoothView
			radius={20}
			smoothing={1}
			backgroundColor={theme.elevated}
			borderColor={theme.border}
			borderWidth={1}
			shadow={false}
			onPress={() =>
				router.push({
					pathname: "/circles/[id]",
					params: { id: circle.id },
				})
			}
		>
			<View style={{ padding: 16, gap: 14 }}>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
					<View style={{ flex: 1, gap: 2 }}>
						<ThemedText
							style={{ fontSize: 17, fontFamily: Fonts.semiBold }}
							numberOfLines={1}
						>
							{circle.name}
						</ThemedText>
						<ThemedText style={{ fontSize: 13, color: theme.textMuted }}>
							{circle.members.length}{" "}
							{circle.members.length === 1 ? "giocatore" : "giocatori"}
							{circle.role === "owner" ? " · La gestisci tu" : ""}
						</ThemedText>
					</View>

					{circle.pendingInvites > 0 && (
						<Pill
							label={`${circle.pendingInvites} in attesa`}
							icon="clock.fill"
						/>
					)}

					<IconSymbol
						name="chevron.right"
						size={16}
						color={theme.tabIconDefault}
					/>
				</View>

				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 10,
					}}
				>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						{shown.map((member, index) => (
							<View
								key={member.id}
								style={{ marginLeft: index === 0 ? 0 : -10 }}
							>
								<Avatar url={member.avatarUrl} size={28} borderWidth={2} />
							</View>
						))}
						{overflow > 0 && (
							<ThemedText
								style={{
									fontSize: 13,
									color: theme.textMuted,
									marginLeft: 8,
								}}
							>
								+{overflow}
							</ThemedText>
						)}
					</View>

					{circle.nextMatchDate !== null && (
						<View
							style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
						>
							<IconSymbol name="calendar" size={13} color={theme.tint} />
							<ThemedText style={{ fontSize: 13, color: theme.tint }}>
								{formatMatchDate(circle.nextMatchDate)}
							</ThemedText>
						</View>
					)}
				</View>
			</View>
		</SmoothView>
	);
}
