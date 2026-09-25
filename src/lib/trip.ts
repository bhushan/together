/** The shape the trip API returns, shared by every panel on the trip page. */

export type Self = {
  id: string;
  name: string;
  origin: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  destinationType: string | null;
  excludedDestinations: string[];
  preferences: string;
  dealbreakers: string;
  submitted: boolean;
};

export type Position = {
  memberId: string;
  name: string;
  cost: number | null;
  budget: number;
  score: number;
  position: string;
};

export type Quote = {
  currency: string;
  quotedAt: string;
  hotelName: string;
  hotelTotal: number;
  flightPrices: Record<string, number>;
  flightLinks: Record<string, string>;
  hotelLink: string;
};

export type Option = {
  id: string;
  city: string;
  country: string;
  iata: string;
  destination_type: string;
  reason: string;
  score: number;
  total_cost: number;
  quote: Quote;
  positions: Position[];
};

export type Round = {
  id: string;
  status: string;
  issues: string[];
  stale: boolean;
  locked_option_id: string | null;
  created_at: string;
  options: Option[];
  tally: Record<string, number>;
  myVote: string | null;
};

export type Trip = {
  title: string;
  currency: string;
  organizer: boolean;
  self: Self | null;
  members: { name: string; submitted: boolean }[];
  round: Round | null;
  previousRounds: { id: string; status: string; createdAt: string; lockedChoice: string | null }[];
};

export type AnswerForm = {
  origin: string;
  startDate: string;
  endDate: string;
  budget: string;
  destinationType: string;
  excludedDestinations: string;
  preferences: string;
  dealbreakers: string;
};

/** A position line is worth flagging when it is the reason an option fails. */
export const isBlocking = (position: string) =>
  /over budget|excluded|unavailable/i.test(position);

export const money = (currency: string, amount: number) =>
  `${currency} ${Math.round(amount).toLocaleString()}`;
