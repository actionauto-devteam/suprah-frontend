/**
 * What customers see about the driver carrying their car (decided
 * 2026-11-05): drivers are told this on their profile, their Equipment page
 * and the sign-up agreement step, so nobody is surprised.
 */
export const CUSTOMER_SEES_DRIVER_NOTICE =
  "Customers you deliver to see your full name, profile photo and truck once you accept their shipment, and where you are on a map from pickup until delivery. They can message you in a private chat on the load from when you accept until 24 hours after delivery. They never see your phone number or email."

/**
 * What Dispatch learns about a sharing driver's location while choosing a
 * driver for a load (decided 2026-11-05): only a distance to the pickup,
 * rounded to 5 miles, never a position.
 */
export const DISPATCH_SEES_DISTANCE_NOTICE =
  "While you share your location, dispatchers choosing a driver for a load see only about how far you are from its pickup, rounded to 5 miles. They see it only while they're looking for a driver, and never your exact location."

/** Who sees a driver's live location, for the places that explain location sharing. */
export const WHO_SEES_DRIVER_LOCATION =
  "Only the dispatcher responsible for your accepted load can view your live location. For a customer's shipment, the customer receiving the vehicle also sees where you are from pickup until delivery. Dispatchers choosing a driver for another load see only about how far you are from its pickup, rounded to 5 miles, never your exact location."
