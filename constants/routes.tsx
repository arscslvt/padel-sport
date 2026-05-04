interface Route {
	name: string;
	displayName: string;
	iconName: string;
}

export const routes: Route[] = [
	{
		name: "index",
		displayName: "Home",
		iconName: "house.fill",
	},
	{
		name: "bookings",
		displayName: "Prenotazioni",
		iconName: "calendar",
	},
	{
		name: "rankings",
		displayName: "Classifiche",
		iconName: "trophy",
	},
];

export const RouteNames = routes.map((route) => route.name);
export type { Route };
