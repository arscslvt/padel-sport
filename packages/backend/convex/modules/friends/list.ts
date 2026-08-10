import { query } from "../../_generated/server";
import { getIdentityPlayer, type PlayerView, toPlayerView } from "../openMatches/lib";
import { type FriendRequestView, friendshipsOf, otherSide } from "./lib";

export interface FriendsView {
  friends: PlayerView[];
  /** Richieste ricevute, da accettare o rifiutare. */
  incoming: FriendRequestView[];
  /** Richieste inviate e non ancora accettate. */
  outgoing: FriendRequestView[];
}

/**
 * Amici del giocatore e richieste ancora in sospeso, nei due versi.
 * Restituisce `null` se non c'è ancora un profilo giocatore.
 */
export default query({
  args: {},
  handler: async (ctx): Promise<FriendsView | null> => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return null;

    const friendships = await friendshipsOf(ctx, player._id);

    const view: FriendsView = { friends: [], incoming: [], outgoing: [] };

    for (const friendship of friendships) {
      const other = await ctx.db.get(otherSide(friendship, player._id));
      // Il profilo dell'altro può essere sparito: la riga non ha più senso
      if (!other) continue;

      if (friendship.status === "accepted") {
        view.friends.push(toPlayerView(other));
        continue;
      }

      const request: FriendRequestView = {
        friendshipId: friendship._id,
        player: toPlayerView(other),
        createdAt: friendship.createdAt,
      };

      if (friendship.requesterId === player._id) {
        view.outgoing.push(request);
      } else {
        view.incoming.push(request);
      }
    }

    view.friends.sort((a, b) => a.name.localeCompare(b.name));
    view.incoming.sort((a, b) => b.createdAt - a.createdAt);
    view.outgoing.sort((a, b) => b.createdAt - a.createdAt);

    return view;
  },
});
