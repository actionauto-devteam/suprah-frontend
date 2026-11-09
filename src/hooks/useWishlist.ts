"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSavedVehicles, removeSavedVehicle, saveVehicle } from "@/lib/api/savedVehicles";
import { toast } from "@/lib/readable-toast";
import { userErrorMessage } from "@/lib/user-error";
import { splitWishlist, withSaved, withoutSaved, type WishlistVehicle } from "@/lib/wishlist";
import type { Vehicle } from "@/types/inventory";

const WISHLIST_KEY = ["savedVehicles"] as const;

/**
 * The Wishlist in Shop, on the Wishlist page and in a car's details
 * (2026-11-09). The heart changes the moment it's tapped; if saving or
 * removing fails, it changes back and the customer is told why.
 */
export function useWishlist() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: WISHLIST_KEY, queryFn: fetchSavedVehicles });
  const list = query.data;

  const optimistic = async (next: (current: WishlistVehicle[] | undefined) => WishlistVehicle[]) => {
    await queryClient.cancelQueries({ queryKey: WISHLIST_KEY });
    const previous = queryClient.getQueryData<WishlistVehicle[]>(WISHLIST_KEY);
    queryClient.setQueryData<WishlistVehicle[]>(WISHLIST_KEY, next);
    return { previous };
  };

  const save = useMutation({
    mutationFn: (vehicle: Vehicle) => saveVehicle(vehicle.id),
    onMutate: (vehicle) => optimistic((current) => withSaved(current, vehicle)),
    onError: (error, _vehicle, context) => {
      queryClient.setQueryData(WISHLIST_KEY, context?.previous);
      toast.error(userErrorMessage(error, "add this car to your Wishlist"));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: WISHLIST_KEY }),
  });

  const remove = useMutation({
    mutationFn: (vehicle: Pick<Vehicle, "id">) => removeSavedVehicle(vehicle.id),
    onMutate: (vehicle) => optimistic((current) => withoutSaved(current, vehicle.id)),
    onError: (error, _vehicle, context) => {
      queryClient.setQueryData(WISHLIST_KEY, context?.previous);
      toast.error(userErrorMessage(error, "remove this car from your Wishlist"));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: WISHLIST_KEY }),
  });

  const { available, unavailable } = React.useMemo(() => splitWishlist(list), [list]);
  const savedIds = React.useMemo(() => new Set((list ?? []).map((vehicle) => vehicle.id)), [list]);

  const { mutate: saveCar } = save;
  const { mutate: removeCar } = remove;
  /** The card's heart: save when it isn't saved yet, remove when it is. */
  const toggleSave = React.useCallback(
    (vehicle: Vehicle, nextSaved: boolean) => (nextSaved ? saveCar(vehicle) : removeCar(vehicle)),
    [saveCar, removeCar],
  );

  return {
    isLoading: query.isLoading,
    /** Saved cars still for sale, in the order they were saved. */
    available,
    /** Saved cars that were sold or taken off sale. */
    unavailable,
    savedIds,
    toggleSave,
    removeCar,
  };
}
