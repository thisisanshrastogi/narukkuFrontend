import { Ticket } from "../types";
import { MOCK_TICKETS } from "./mockData";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const getMyTickets = async (
  walletAddress: string,
): Promise<Ticket[]> => {
  if (!walletAddress) return [];
  if (USE_MOCK) return MOCK_TICKETS;
  // TODO: Replace with on-chain ticket lookup once indexing is in place.
  return [];
};

export const getTicketDetails = async (
  _ticketId: string,
): Promise<Ticket | undefined> => {
  if (USE_MOCK) return MOCK_TICKETS.find((t) => t.id === _ticketId);
  return undefined;
};
