import { OnlineStatus } from '@/types/user';
import { TrailerType, OperationalStatus, ComplianceDocumentType } from '@/types/driver-profile';

export const driverStatusOptions: { value: OnlineStatus; label: string; color: string; description: string }[] = [
    { value: 'online', label: 'Available', color: 'bg-green-500', description: 'Ready for assignments' },
    { value: 'away', label: 'Away', color: 'bg-yellow-500', description: 'Temporarily unavailable' },
    { value: 'busy', label: 'On Delivery', color: 'bg-blue-500', description: 'Currently on a delivery' },
    { value: 'do_not_disturb', label: 'Off Duty', color: 'bg-red-500', description: 'Not accepting assignments' },
    { value: 'offline', label: 'Offline', color: 'bg-gray-500', description: 'Not working' },
];

export const hitchTypeOptions: { value: string; label: string; description: string }[] = [
    { value: 'fifth_wheel', label: 'Fifth Wheel', description: 'Heavy-duty kingpin coupling for semi-trailers' },
    { value: 'gooseneck', label: 'Gooseneck', description: 'Ball hitch mounted in truck bed' },
    { value: 'bumper_pull', label: 'Bumper Pull', description: 'Standard ball hitch at rear bumper' },
    { value: 'pintle', label: 'Pintle Hook', description: 'Heavy-duty hook and lunette ring' },
];

export const trailerTypeOptions: { value: TrailerType; label: string; description: string; capacity: string; maxCapacity: number; category: string }[] = [
    { value: 'open_3car_wedge', label: 'Open 3-Car Wedge', description: 'Standard open auto hauler with wedge design', capacity: '3 vehicles', maxCapacity: 3, category: 'open' },
    { value: 'open_2car', label: 'Open 2-Car', description: 'Compact open trailer for 2 vehicles', capacity: '2 vehicles', maxCapacity: 2, category: 'open' },
    { value: '5car_open', label: '5-Car Open', description: 'Mid-size open auto hauler', capacity: '5 vehicles', maxCapacity: 5, category: 'open' },
    { value: 'enclosed_2car', label: 'Enclosed 2-Car', description: 'Fully enclosed protection for premium vehicles', capacity: '2 vehicles', maxCapacity: 2, category: 'enclosed' },
    { value: 'enclosed_3car', label: 'Enclosed 3-Car', description: 'Larger enclosed for high-value transport', capacity: '3 vehicles', maxCapacity: 3, category: 'enclosed' },
    { value: 'flatbed', label: 'Flatbed', description: 'Open flat platform for heavy or oversized loads', capacity: '1-2 vehicles', maxCapacity: 2, category: 'flatbed' },
    { value: 'dually_flatbed', label: 'Dually Flatbed', description: 'Dually truck with flatbed configuration', capacity: '1-2 vehicles', maxCapacity: 2, category: 'flatbed' },
    { value: 'hotshot', label: 'Hotshot', description: 'Pickup truck with gooseneck for quick hauls', capacity: '1-3 vehicles', maxCapacity: 3, category: 'specialty' },
    { value: 'gooseneck', label: 'Gooseneck', description: 'Gooseneck hitch auto trailer', capacity: '2-4 vehicles', maxCapacity: 4, category: 'specialty' },
    { value: 'lowboy', label: 'Lowboy', description: 'Ultra-low profile for tall/heavy machinery', capacity: '1-2 vehicles', maxCapacity: 2, category: 'heavy' },
    { value: 'step_deck', label: 'Step Deck', description: 'Two-level for height clearance flexibility', capacity: '1-3 vehicles', maxCapacity: 3, category: 'heavy' },
    { value: 'rgn', label: 'RGN (Removable Gooseneck)', description: 'Detachable gooseneck for heavy/oversized loads', capacity: '1 vehicle', maxCapacity: 1, category: 'heavy' },
    { value: 'double_drop', label: 'Double Drop', description: 'Extended low-deck for tall, heavy cargo', capacity: '1-2 vehicles', maxCapacity: 2, category: 'heavy' },
    { value: '9car_stinger', label: '9-Car Stinger', description: 'Full-size commercial 9-car auto hauler', capacity: '9 vehicles', maxCapacity: 9, category: 'multi' },
    { value: '7car_stinger', label: '7-Car Stinger', description: 'Commercial 7-car hauler', capacity: '7 vehicles', maxCapacity: 7, category: 'multi' },
    { value: 'power_only', label: 'Power Only', description: 'Cab only — pull customer-provided trailer', capacity: 'Varies', maxCapacity: 12, category: 'specialty' },
    { value: 'other', label: 'Other', description: 'Custom or unlisted trailer configuration', capacity: 'Varies', maxCapacity: 12, category: 'specialty' },
];

export const TRAILER_CATEGORIES = [
    { id: 'open', label: 'Open', color: 'emerald' },
    { id: 'enclosed', label: 'Enclosed', color: 'blue' },
    { id: 'flatbed', label: 'Flatbed', color: 'amber' },
    { id: 'heavy', label: 'Heavy Duty', color: 'red' },
    { id: 'multi', label: 'Multi-Car', color: 'purple' },
    { id: 'specialty', label: 'Specialty', color: 'cyan' },
];

export const operationalStatusOptions: { value: OperationalStatus; label: string; color: string; description: string }[] = [
    { value: 'active', label: 'Active', color: 'bg-emerald-500', description: 'Available for dispatch' },
    { value: 'on_leave', label: 'On Leave', color: 'bg-amber-500', description: 'Temporarily off duty' },
    { value: 'maintenance', label: 'In Shop / Maintenance', color: 'bg-orange-500', description: 'Vehicle under maintenance' },
    { value: 'terminated', label: 'Terminated', color: 'bg-red-500', description: 'No longer active' },
];

export const documentTypeOptions: { value: ComplianceDocumentType; label: string }[] = [
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'medical_card', label: 'Medical Card (DOT Physical)' },
    { value: 'insurance_certificate', label: 'Insurance Certificate' },
    { value: 'vehicle_registration', label: 'Vehicle Registration' },
    { value: 'dot_inspection', label: 'DOT Inspection Report' },
    { value: 'w9_form', label: 'W-9 Form' },
    { value: 'operating_authority', label: 'Operating Authority' },
    { value: 'cargo_insurance', label: 'Cargo Insurance' },
    { value: 'liability_insurance', label: 'Liability Insurance' },
    { value: 'other', label: 'Other' },
];

export const REQUIRED_DOCUMENTS: { type: ComplianceDocumentType; label: string; required: boolean; description: string }[] = [
    { type: 'drivers_license', label: "Commercial Driver's License (CDL)", required: true, description: 'Valid CDL — front and back required' },
    { type: 'medical_card', label: 'DOT Medical Card', required: false, description: 'Current DOT physical examination certificate' },
    { type: 'insurance_certificate', label: 'Auto Liability Insurance', required: false, description: 'Proof of auto liability coverage' },
    { type: 'vehicle_registration', label: 'Vehicle Registration', required: false, description: 'Current registration for truck and trailer' },
    { type: 'operating_authority', label: 'Operating Authority (MC/DOT)', required: false, description: 'FMCSA operating authority documentation' },
    { type: 'w9_form', label: 'W-9 Tax Form', required: false, description: 'IRS Form W-9 for tax reporting' },
    { type: 'cargo_insurance', label: 'Cargo Insurance', required: false, description: 'Coverage for transported cargo' },
    { type: 'liability_insurance', label: 'General Liability Insurance', required: false, description: 'General liability coverage' },
    { type: 'dot_inspection', label: 'DOT Inspection Report', required: false, description: 'Most recent DOT vehicle inspection' },
];

export const specialFeatureOptions = [
    { value: 'lift_gate', label: 'Lift Gate' },
    { value: 'winch', label: 'Winch' },
    { value: 'enclosed', label: 'Enclosed' },
    { value: 'air_ride', label: 'Air Ride Suspension' },
    { value: 'gps_tracking', label: 'GPS Tracking' },
    { value: 'eld_equipped', label: 'ELD Equipped' },
    { value: 'hazmat_certified', label: 'HAZMAT Certified' },
    { value: 'oversized_capable', label: 'Oversized Capable' },
    { value: 'inoperable_vehicle_capable', label: 'Inoperable Vehicle Capable' },
    { value: 'tarping', label: 'Tarping Available' },
    { value: 'chains_straps', label: 'Chains & Straps' },
    { value: 'wheel_nets', label: 'Wheel Nets' },
    { value: 'ramps', label: 'Loading Ramps' },
    { value: 'dolly', label: 'Dolly / Go-Jack' },
];

export const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

export const AVAILABLE_DAYS = [
    { value: 'monday', label: 'Mon' },
    { value: 'tuesday', label: 'Tue' },
    { value: 'wednesday', label: 'Wed' },
    { value: 'thursday', label: 'Thu' },
    { value: 'friday', label: 'Fri' },
    { value: 'saturday', label: 'Sat' },
    { value: 'sunday', label: 'Sun' },
];
