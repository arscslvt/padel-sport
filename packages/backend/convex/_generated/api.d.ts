/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bookings_availability from "../bookings/availability.js";
import type * as bookings_delete from "../bookings/delete.js";
import type * as bookings_get from "../bookings/get.js";
import type * as bookings_getByCode from "../bookings/getByCode.js";
import type * as bookings_lib from "../bookings/lib.js";
import type * as bookings_list from "../bookings/list.js";
import type * as bookings_merge from "../bookings/merge.js";
import type * as bookings_mine from "../bookings/mine.js";
import type * as bookings_update from "../bookings/update.js";
import type * as crons from "../crons.js";
import type * as events_list from "../events/list.js";
import type * as events_new from "../events/new.js";
import type * as modules_circles_create from "../modules/circles/create.js";
import type * as modules_circles_dissolve from "../modules/circles/dissolve.js";
import type * as modules_circles_get from "../modules/circles/get.js";
import type * as modules_circles_invite from "../modules/circles/invite.js";
import type * as modules_circles_leave from "../modules/circles/leave.js";
import type * as modules_circles_lib from "../modules/circles/lib.js";
import type * as modules_circles_list from "../modules/circles/list.js";
import type * as modules_circles_remove from "../modules/circles/remove.js";
import type * as modules_circles_respond from "../modules/circles/respond.js";
import type * as modules_circles_update from "../modules/circles/update.js";
import type * as modules_clients_invites from "../modules/clients/invites.js";
import type * as modules_clients_lib from "../modules/clients/lib.js";
import type * as modules_clients_list from "../modules/clients/list.js";
import type * as modules_clients_membership from "../modules/clients/membership.js";
import type * as modules_clients_profile from "../modules/clients/profile.js";
import type * as modules_courtCalendar_client from "../modules/courtCalendar/client.js";
import type * as modules_courtCalendar_data from "../modules/courtCalendar/data.js";
import type * as modules_courtCalendar_lib from "../modules/courtCalendar/lib.js";
import type * as modules_courtCalendar_pull from "../modules/courtCalendar/pull.js";
import type * as modules_courtCalendar_push from "../modules/courtCalendar/push.js";
import type * as modules_eventCommunications_begin from "../modules/eventCommunications/begin.js";
import type * as modules_eventCommunications_complete from "../modules/eventCommunications/complete.js";
import type * as modules_eventCommunications_lib from "../modules/eventCommunications/lib.js";
import type * as modules_eventCommunications_list from "../modules/eventCommunications/list.js";
import type * as modules_eventCommunications_pendingCounts from "../modules/eventCommunications/pendingCounts.js";
import type * as modules_eventCommunications_recordDeliveries from "../modules/eventCommunications/recordDeliveries.js";
import type * as modules_eventRsvps_cancel from "../modules/eventRsvps/cancel.js";
import type * as modules_eventRsvps_checkIn from "../modules/eventRsvps/checkIn.js";
import type * as modules_eventRsvps_create from "../modules/eventRsvps/create.js";
import type * as modules_eventRsvps_getByToken from "../modules/eventRsvps/getByToken.js";
import type * as modules_eventRsvps_lib from "../modules/eventRsvps/lib.js";
import type * as modules_eventRsvps_list from "../modules/eventRsvps/list.js";
import type * as modules_eventRsvps_markNotified from "../modules/eventRsvps/markNotified.js";
import type * as modules_eventRsvps_recipientCounts from "../modules/eventRsvps/recipientCounts.js";
import type * as modules_eventRsvps_recipients from "../modules/eventRsvps/recipients.js";
import type * as modules_eventRsvps_stats from "../modules/eventRsvps/stats.js";
import type * as modules_eventRsvps_statsBatch from "../modules/eventRsvps/statsBatch.js";
import type * as modules_eventRsvps_unsubscribe from "../modules/eventRsvps/unsubscribe.js";
import type * as modules_eventRsvps_update from "../modules/eventRsvps/update.js";
import type * as modules_friends_lib from "../modules/friends/lib.js";
import type * as modules_friends_list from "../modules/friends/list.js";
import type * as modules_friends_remove from "../modules/friends/remove.js";
import type * as modules_friends_request from "../modules/friends/request.js";
import type * as modules_friends_respond from "../modules/friends/respond.js";
import type * as modules_friends_search from "../modules/friends/search.js";
import type * as modules_matchRequests_create from "../modules/matchRequests/create.js";
import type * as modules_matchRequests_list from "../modules/matchRequests/list.js";
import type * as modules_matchRequests_markNotified from "../modules/matchRequests/markNotified.js";
import type * as modules_matchRequests_update from "../modules/matchRequests/update.js";
import type * as modules_notifications_alert from "../modules/notifications/alert.js";
import type * as modules_notifications_bookingMail from "../modules/notifications/bookingMail.js";
import type * as modules_notifications_confirmation from "../modules/notifications/confirmation.js";
import type * as modules_openMatches_cancel from "../modules/openMatches/cancel.js";
import type * as modules_openMatches_create from "../modules/openMatches/create.js";
import type * as modules_openMatches_get from "../modules/openMatches/get.js";
import type * as modules_openMatches_guests from "../modules/openMatches/guests.js";
import type * as modules_openMatches_invite from "../modules/openMatches/invite.js";
import type * as modules_openMatches_invites from "../modules/openMatches/invites.js";
import type * as modules_openMatches_join from "../modules/openMatches/join.js";
import type * as modules_openMatches_leave from "../modules/openMatches/leave.js";
import type * as modules_openMatches_lib from "../modules/openMatches/lib.js";
import type * as modules_openMatches_list from "../modules/openMatches/list.js";
import type * as modules_openMatches_my from "../modules/openMatches/my.js";
import type * as modules_openMatches_players from "../modules/openMatches/players.js";
import type * as modules_openMatches_publish from "../modules/openMatches/publish.js";
import type * as modules_openMatches_recipients from "../modules/openMatches/recipients.js";
import type * as modules_openMatches_requests from "../modules/openMatches/requests.js";
import type * as modules_settings_booking from "../modules/settings/booking.js";
import type * as modules_settings_lib from "../modules/settings/lib.js";
import type * as modules_social_anonymity from "../modules/social/anonymity.js";
import type * as modules_social_approve from "../modules/social/approve.js";
import type * as modules_social_assets from "../modules/social/assets.js";
import type * as modules_social_compose from "../modules/social/compose.js";
import type * as modules_social_courts from "../modules/social/courts.js";
import type * as modules_social_data from "../modules/social/data.js";
import type * as modules_social_enqueue from "../modules/social/enqueue.js";
import type * as modules_social_instagram_client from "../modules/social/instagram/client.js";
import type * as modules_social_instagram_publish from "../modules/social/instagram/publish.js";
import type * as modules_social_instagram_refresh from "../modules/social/instagram/refresh.js";
import type * as modules_social_instagram_whoami from "../modules/social/instagram/whoami.js";
import type * as modules_social_lib from "../modules/social/lib.js";
import type * as modules_social_list from "../modules/social/list.js";
import type * as modules_social_model from "../modules/social/model.js";
import type * as modules_social_poster from "../modules/social/poster.js";
import type * as modules_social_prompt from "../modules/social/prompt.js";
import type * as modules_social_queue from "../modules/social/queue.js";
import type * as modules_social_regenerate from "../modules/social/regenerate.js";
import type * as modules_social_reject from "../modules/social/reject.js";
import type * as modules_social_settings from "../modules/social/settings.js";
import type * as modules_social_situations from "../modules/social/situations.js";
import type * as modules_social_template from "../modules/social/template.js";
import type * as modules_social_templates_data from "../modules/social/templates/data.js";
import type * as modules_social_templates_generate from "../modules/social/templates/generate.js";
import type * as modules_social_templates_get from "../modules/social/templates/get.js";
import type * as modules_social_templates_list from "../modules/social/templates/list.js";
import type * as modules_social_templates_request from "../modules/social/templates/request.js";
import type * as modules_social_templates_review from "../modules/social/templates/review.js";
import type * as modules_social_tick from "../modules/social/tick.js";
import type * as modules_social_update from "../modules/social/update.js";
import type * as modules_social_webhook from "../modules/social/webhook.js";
import type * as modules_supportRequests_create from "../modules/supportRequests/create.js";
import type * as modules_supportRequests_list from "../modules/supportRequests/list.js";
import type * as modules_supportRequests_markNotified from "../modules/supportRequests/markNotified.js";
import type * as modules_supportRequests_update from "../modules/supportRequests/update.js";
import type * as modules_tournaments_advancements from "../modules/tournaments/advancements.js";
import type * as modules_tournaments_categories_get from "../modules/tournaments/categories/get.js";
import type * as modules_tournaments_edit from "../modules/tournaments/edit.js";
import type * as modules_tournaments_get from "../modules/tournaments/get.js";
import type * as modules_tournaments_groups_get from "../modules/tournaments/groups/get.js";
import type * as modules_tournaments_matches_edit from "../modules/tournaments/matches/edit.js";
import type * as modules_tournaments_matches_get from "../modules/tournaments/matches/get.js";
import type * as modules_tournaments_players_add from "../modules/tournaments/players/add.js";
import type * as modules_tournaments_teams_get from "../modules/tournaments/teams/get.js";
import type * as slots_listActive from "../slots/listActive.js";
import type * as tables_bookingSettings from "../tables/bookingSettings.js";
import type * as tables_bookings from "../tables/bookings.js";
import type * as tables_circleInvites from "../tables/circleInvites.js";
import type * as tables_circleMembers from "../tables/circleMembers.js";
import type * as tables_circles from "../tables/circles.js";
import type * as tables_clientInvites from "../tables/clientInvites.js";
import type * as tables_eventCommunicationDeliveries from "../tables/eventCommunicationDeliveries.js";
import type * as tables_eventCommunications from "../tables/eventCommunications.js";
import type * as tables_eventRsvps from "../tables/eventRsvps.js";
import type * as tables_events from "../tables/events.js";
import type * as tables_externalBookings from "../tables/externalBookings.js";
import type * as tables_friendships from "../tables/friendships.js";
import type * as tables_joinRequests from "../tables/joinRequests.js";
import type * as tables_links from "../tables/links.js";
import type * as tables_matchGuests from "../tables/matchGuests.js";
import type * as tables_matchInvites from "../tables/matchInvites.js";
import type * as tables_matchRequests from "../tables/matchRequests.js";
import type * as tables_memberships from "../tables/memberships.js";
import type * as tables_openMatches from "../tables/openMatches.js";
import type * as tables_players from "../tables/players.js";
import type * as tables_slots from "../tables/slots.js";
import type * as tables_socialCredentials from "../tables/socialCredentials.js";
import type * as tables_socialPosts from "../tables/socialPosts.js";
import type * as tables_socialSettings from "../tables/socialSettings.js";
import type * as tables_socialTemplates from "../tables/socialTemplates.js";
import type * as tables_supportRequests from "../tables/supportRequests.js";
import type * as utils_clubTime from "../utils/clubTime.js";
import type * as utils_hark from "../utils/hark.js";
import type * as utils_notification_client from "../utils/notification_client.js";
import type * as utils_serverSecret from "../utils/serverSecret.js";
import type * as utils_staffLinks from "../utils/staffLinks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "bookings/availability": typeof bookings_availability;
  "bookings/delete": typeof bookings_delete;
  "bookings/get": typeof bookings_get;
  "bookings/getByCode": typeof bookings_getByCode;
  "bookings/lib": typeof bookings_lib;
  "bookings/list": typeof bookings_list;
  "bookings/merge": typeof bookings_merge;
  "bookings/mine": typeof bookings_mine;
  "bookings/update": typeof bookings_update;
  crons: typeof crons;
  "events/list": typeof events_list;
  "events/new": typeof events_new;
  "modules/circles/create": typeof modules_circles_create;
  "modules/circles/dissolve": typeof modules_circles_dissolve;
  "modules/circles/get": typeof modules_circles_get;
  "modules/circles/invite": typeof modules_circles_invite;
  "modules/circles/leave": typeof modules_circles_leave;
  "modules/circles/lib": typeof modules_circles_lib;
  "modules/circles/list": typeof modules_circles_list;
  "modules/circles/remove": typeof modules_circles_remove;
  "modules/circles/respond": typeof modules_circles_respond;
  "modules/circles/update": typeof modules_circles_update;
  "modules/clients/invites": typeof modules_clients_invites;
  "modules/clients/lib": typeof modules_clients_lib;
  "modules/clients/list": typeof modules_clients_list;
  "modules/clients/membership": typeof modules_clients_membership;
  "modules/clients/profile": typeof modules_clients_profile;
  "modules/courtCalendar/client": typeof modules_courtCalendar_client;
  "modules/courtCalendar/data": typeof modules_courtCalendar_data;
  "modules/courtCalendar/lib": typeof modules_courtCalendar_lib;
  "modules/courtCalendar/pull": typeof modules_courtCalendar_pull;
  "modules/courtCalendar/push": typeof modules_courtCalendar_push;
  "modules/eventCommunications/begin": typeof modules_eventCommunications_begin;
  "modules/eventCommunications/complete": typeof modules_eventCommunications_complete;
  "modules/eventCommunications/lib": typeof modules_eventCommunications_lib;
  "modules/eventCommunications/list": typeof modules_eventCommunications_list;
  "modules/eventCommunications/pendingCounts": typeof modules_eventCommunications_pendingCounts;
  "modules/eventCommunications/recordDeliveries": typeof modules_eventCommunications_recordDeliveries;
  "modules/eventRsvps/cancel": typeof modules_eventRsvps_cancel;
  "modules/eventRsvps/checkIn": typeof modules_eventRsvps_checkIn;
  "modules/eventRsvps/create": typeof modules_eventRsvps_create;
  "modules/eventRsvps/getByToken": typeof modules_eventRsvps_getByToken;
  "modules/eventRsvps/lib": typeof modules_eventRsvps_lib;
  "modules/eventRsvps/list": typeof modules_eventRsvps_list;
  "modules/eventRsvps/markNotified": typeof modules_eventRsvps_markNotified;
  "modules/eventRsvps/recipientCounts": typeof modules_eventRsvps_recipientCounts;
  "modules/eventRsvps/recipients": typeof modules_eventRsvps_recipients;
  "modules/eventRsvps/stats": typeof modules_eventRsvps_stats;
  "modules/eventRsvps/statsBatch": typeof modules_eventRsvps_statsBatch;
  "modules/eventRsvps/unsubscribe": typeof modules_eventRsvps_unsubscribe;
  "modules/eventRsvps/update": typeof modules_eventRsvps_update;
  "modules/friends/lib": typeof modules_friends_lib;
  "modules/friends/list": typeof modules_friends_list;
  "modules/friends/remove": typeof modules_friends_remove;
  "modules/friends/request": typeof modules_friends_request;
  "modules/friends/respond": typeof modules_friends_respond;
  "modules/friends/search": typeof modules_friends_search;
  "modules/matchRequests/create": typeof modules_matchRequests_create;
  "modules/matchRequests/list": typeof modules_matchRequests_list;
  "modules/matchRequests/markNotified": typeof modules_matchRequests_markNotified;
  "modules/matchRequests/update": typeof modules_matchRequests_update;
  "modules/notifications/alert": typeof modules_notifications_alert;
  "modules/notifications/bookingMail": typeof modules_notifications_bookingMail;
  "modules/notifications/confirmation": typeof modules_notifications_confirmation;
  "modules/openMatches/cancel": typeof modules_openMatches_cancel;
  "modules/openMatches/create": typeof modules_openMatches_create;
  "modules/openMatches/get": typeof modules_openMatches_get;
  "modules/openMatches/guests": typeof modules_openMatches_guests;
  "modules/openMatches/invite": typeof modules_openMatches_invite;
  "modules/openMatches/invites": typeof modules_openMatches_invites;
  "modules/openMatches/join": typeof modules_openMatches_join;
  "modules/openMatches/leave": typeof modules_openMatches_leave;
  "modules/openMatches/lib": typeof modules_openMatches_lib;
  "modules/openMatches/list": typeof modules_openMatches_list;
  "modules/openMatches/my": typeof modules_openMatches_my;
  "modules/openMatches/players": typeof modules_openMatches_players;
  "modules/openMatches/publish": typeof modules_openMatches_publish;
  "modules/openMatches/recipients": typeof modules_openMatches_recipients;
  "modules/openMatches/requests": typeof modules_openMatches_requests;
  "modules/settings/booking": typeof modules_settings_booking;
  "modules/settings/lib": typeof modules_settings_lib;
  "modules/social/anonymity": typeof modules_social_anonymity;
  "modules/social/approve": typeof modules_social_approve;
  "modules/social/assets": typeof modules_social_assets;
  "modules/social/compose": typeof modules_social_compose;
  "modules/social/courts": typeof modules_social_courts;
  "modules/social/data": typeof modules_social_data;
  "modules/social/enqueue": typeof modules_social_enqueue;
  "modules/social/instagram/client": typeof modules_social_instagram_client;
  "modules/social/instagram/publish": typeof modules_social_instagram_publish;
  "modules/social/instagram/refresh": typeof modules_social_instagram_refresh;
  "modules/social/instagram/whoami": typeof modules_social_instagram_whoami;
  "modules/social/lib": typeof modules_social_lib;
  "modules/social/list": typeof modules_social_list;
  "modules/social/model": typeof modules_social_model;
  "modules/social/poster": typeof modules_social_poster;
  "modules/social/prompt": typeof modules_social_prompt;
  "modules/social/queue": typeof modules_social_queue;
  "modules/social/regenerate": typeof modules_social_regenerate;
  "modules/social/reject": typeof modules_social_reject;
  "modules/social/settings": typeof modules_social_settings;
  "modules/social/situations": typeof modules_social_situations;
  "modules/social/template": typeof modules_social_template;
  "modules/social/templates/data": typeof modules_social_templates_data;
  "modules/social/templates/generate": typeof modules_social_templates_generate;
  "modules/social/templates/get": typeof modules_social_templates_get;
  "modules/social/templates/list": typeof modules_social_templates_list;
  "modules/social/templates/request": typeof modules_social_templates_request;
  "modules/social/templates/review": typeof modules_social_templates_review;
  "modules/social/tick": typeof modules_social_tick;
  "modules/social/update": typeof modules_social_update;
  "modules/social/webhook": typeof modules_social_webhook;
  "modules/supportRequests/create": typeof modules_supportRequests_create;
  "modules/supportRequests/list": typeof modules_supportRequests_list;
  "modules/supportRequests/markNotified": typeof modules_supportRequests_markNotified;
  "modules/supportRequests/update": typeof modules_supportRequests_update;
  "modules/tournaments/advancements": typeof modules_tournaments_advancements;
  "modules/tournaments/categories/get": typeof modules_tournaments_categories_get;
  "modules/tournaments/edit": typeof modules_tournaments_edit;
  "modules/tournaments/get": typeof modules_tournaments_get;
  "modules/tournaments/groups/get": typeof modules_tournaments_groups_get;
  "modules/tournaments/matches/edit": typeof modules_tournaments_matches_edit;
  "modules/tournaments/matches/get": typeof modules_tournaments_matches_get;
  "modules/tournaments/players/add": typeof modules_tournaments_players_add;
  "modules/tournaments/teams/get": typeof modules_tournaments_teams_get;
  "slots/listActive": typeof slots_listActive;
  "tables/bookingSettings": typeof tables_bookingSettings;
  "tables/bookings": typeof tables_bookings;
  "tables/circleInvites": typeof tables_circleInvites;
  "tables/circleMembers": typeof tables_circleMembers;
  "tables/circles": typeof tables_circles;
  "tables/clientInvites": typeof tables_clientInvites;
  "tables/eventCommunicationDeliveries": typeof tables_eventCommunicationDeliveries;
  "tables/eventCommunications": typeof tables_eventCommunications;
  "tables/eventRsvps": typeof tables_eventRsvps;
  "tables/events": typeof tables_events;
  "tables/externalBookings": typeof tables_externalBookings;
  "tables/friendships": typeof tables_friendships;
  "tables/joinRequests": typeof tables_joinRequests;
  "tables/links": typeof tables_links;
  "tables/matchGuests": typeof tables_matchGuests;
  "tables/matchInvites": typeof tables_matchInvites;
  "tables/matchRequests": typeof tables_matchRequests;
  "tables/memberships": typeof tables_memberships;
  "tables/openMatches": typeof tables_openMatches;
  "tables/players": typeof tables_players;
  "tables/slots": typeof tables_slots;
  "tables/socialCredentials": typeof tables_socialCredentials;
  "tables/socialPosts": typeof tables_socialPosts;
  "tables/socialSettings": typeof tables_socialSettings;
  "tables/socialTemplates": typeof tables_socialTemplates;
  "tables/supportRequests": typeof tables_supportRequests;
  "utils/clubTime": typeof utils_clubTime;
  "utils/hark": typeof utils_hark;
  "utils/notification_client": typeof utils_notification_client;
  "utils/serverSecret": typeof utils_serverSecret;
  "utils/staffLinks": typeof utils_staffLinks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  tournaments: import("../components/tournaments/_generated/component.js").ComponentApi<"tournaments">;
};
