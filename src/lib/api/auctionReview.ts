import { apiClient } from "../api-client";
import { AuctionListing, ListingStatus, ListingCounts } from "./auctionListings";

const BASE = "/api/crm/auction-review";
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export interface ReviewCustomer {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface ReviewListing extends Omit<AuctionListing, "userId"> {
  userId: ReviewCustomer;
}

export const fetchReviewListings = async (
  token: string,
  status?: ListingStatus,
): Promise<{ listings: ReviewListing[]; counts: ListingCounts }> => {
  const response = await apiClient.get(BASE, {
    ...auth(token),
    params: status ? { status } : undefined,
  });
  return { listings: response.data.data, counts: response.data.counts };
};

export const fetchReviewListing = async (
  token: string,
  id: string,
): Promise<ReviewListing> => {
  const response = await apiClient.get(`${BASE}/${id}`, auth(token));
  return response.data.data;
};

export const approveListing = async (
  token: string,
  id: string,
  reviewerNotes?: string,
): Promise<ReviewListing> => {
  const response = await apiClient.post(
    `${BASE}/${id}/approve`,
    { reviewerNotes },
    auth(token),
  );
  return response.data.data;
};

export const rejectListing = async (
  token: string,
  id: string,
  rejectionReason: string,
  reviewerNotes?: string,
): Promise<ReviewListing> => {
  const response = await apiClient.post(
    `${BASE}/${id}/reject`,
    { rejectionReason, reviewerNotes },
    auth(token),
  );
  return response.data.data;
};
