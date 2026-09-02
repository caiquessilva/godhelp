import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const coords = {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
};

const nearbySchema = z.object({
  ...coords,
  category: z.enum(["parques", "academias", "restaurantes"]),
  radius: z.number().min(500).max(15000).default(3000),
});

const detailsSchema = z.object({
  placeId: z.string().min(3).max(400),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const geocodeSchema = z.object({ address: z.string().trim().min(3).max(200) });

export const fetchNearbyPlaces = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => nearbySchema.parse(data))
  .handler(async ({ data }) => {
    const { searchNearby } = await import("./places.server");
    return searchNearby(data);
  });

export const fetchPlaceDetails = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => detailsSchema.parse(data))
  .handler(async ({ data }) => {
    const { placeDetails } = await import("./places.server");
    return placeDetails(data);
  });

export const geocode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => geocodeSchema.parse(data))
  .handler(async ({ data }) => {
    const { geocodeAddress } = await import("./places.server");
    return geocodeAddress(data.address);
  });

/** Localização aproximada por IP/borda — usada antes da permissão de GPS. */
export const fetchApproxLocation = createServerFn({ method: "GET" }).handler(async () => {
  const { approximateLocation } = await import("./ip-location.server");
  return approximateLocation();
});
