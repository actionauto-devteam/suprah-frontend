import { MAX_TRAILER_VEHICLES } from '@/components/driver-profile/driver-profile-constants';

export const TRAILER_CAPACITY: Record<string, number> = {
  open_3car_wedge: 3,
  open_2car: 2,
  enclosed_2car: 2,
  enclosed_3car: 3,
  flatbed: 2,
  hotshot: 1,
  dually_flatbed: 1,
  gooseneck: 2,
  lowboy: 1,
  step_deck: 2,
  '9car_stinger': 9,
  '7car_stinger': 7,
  '5car_open': 5,
  rgn: 2,
  double_drop: 2,
  power_only: 0,
  other: MAX_TRAILER_VEHICLES,
};

export interface TrailerOption {
  value: string;
  label: string;
  capacity: number;
}

export const TRAILER_OPTIONS: TrailerOption[] = [
  { value: 'open_3car_wedge', label: 'Open 3-Car Wedge', capacity: 3 },
  { value: 'open_2car', label: 'Open 2-Car', capacity: 2 },
  { value: 'enclosed_2car', label: 'Enclosed 2-Car', capacity: 2 },
  { value: 'enclosed_3car', label: 'Enclosed 3-Car', capacity: 3 },
  { value: 'flatbed', label: 'Flatbed', capacity: 2 },
  { value: 'hotshot', label: 'Hotshot', capacity: 1 },
  { value: 'dually_flatbed', label: 'Dually Flatbed', capacity: 1 },
  { value: 'gooseneck', label: 'Gooseneck', capacity: 2 },
  { value: 'lowboy', label: 'Lowboy', capacity: 1 },
  { value: 'step_deck', label: 'Step Deck', capacity: 2 },
  { value: '9car_stinger', label: '9-Car Stinger', capacity: 9 },
  { value: '7car_stinger', label: '7-Car Stinger', capacity: 7 },
  { value: '5car_open', label: '5-Car Open', capacity: 5 },
  { value: 'rgn', label: 'RGN', capacity: 2 },
  { value: 'double_drop', label: 'Double Drop', capacity: 2 },
  { value: 'power_only', label: 'Power Only', capacity: 0 },
  { value: 'other', label: 'Other', capacity: MAX_TRAILER_VEHICLES },
];

export function getTrailerCapacity(trailerType: string): number {
  return TRAILER_CAPACITY[trailerType] || 1;
}

export function getTrailerLabel(trailerType: string): string {
  const option = TRAILER_OPTIONS.find(t => t.value === trailerType);
  return option?.label || trailerType;
}
