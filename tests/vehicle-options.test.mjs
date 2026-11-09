import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a src/lib TypeScript file the same way the other tests do.
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const { splitVehicleOptions } = loadLib('vehicle-options');

// The Features tab from the QA report: the feed sent every feature run together.
const QA_RUN_TOGETHER =
  'A/C FrontAlloy WheelsAnti-Lock BrakesDriver Air BagHeated Front SeatsLeather InteriorLeather SeatsPower MirrorsPower SeatsPower SteeringPower WindowsPremium Sound SystemSide Air BagSunroof/MoonroofTilt WheelTraction ControlMP3 Player3rd Row SeatRear Parking AidChrome WheelsBackup CameraKeyless EntryBluetooth CapablePassenger Air BagRear Air BagsPower Door LocksNavigationCruise ControlAM/FM StereoMemory SeatAll Wheel DriveA/C RearHeat/ACDVD NAV SysAuxiliary Audio InputMulti-Zone A/CSteering Wheel Audio ControlsRain Sensing WipersBrake AssistFog LightsLane Departure WarningBlind Spot MonitorRain Sensing Wipers';

test('run-together features from the QA report become one entry each', () => {
  assert.deepEqual(splitVehicleOptions(QA_RUN_TOGETHER), [
    'A/C Front', 'Alloy Wheels', 'Anti-Lock Brakes', 'Driver Air Bag', 'Heated Front Seats', 'Leather Interior',
    'Leather Seats', 'Power Mirrors', 'Power Seats', 'Power Steering', 'Power Windows', 'Premium Sound System',
    'Side Air Bag', 'Sunroof/Moonroof', 'Tilt Wheel', 'Traction Control', 'MP3 Player', '3rd Row Seat',
    'Rear Parking Aid', 'Chrome Wheels', 'Backup Camera', 'Keyless Entry', 'Bluetooth Capable', 'Passenger Air Bag',
    'Rear Air Bags', 'Power Door Locks', 'Navigation', 'Cruise Control', 'AM/FM Stereo', 'Memory Seat',
    'All Wheel Drive', 'A/C Rear', 'Heat/AC', 'DVD NAV Sys', 'Auxiliary Audio Input', 'Multi-Zone A/C',
    'Steering Wheel Audio Controls', 'Rain Sensing Wipers', 'Brake Assist', 'Fog Lights', 'Lane Departure Warning',
    'Blind Spot Monitor',
  ]);
});

test('features with separators split the way they always did', () => {
  assert.deepEqual(splitVehicleOptions('Alloy Wheels, Backup Camera; Bluetooth\nNavigation'), [
    'Alloy Wheels', 'Backup Camera', 'Bluetooth', 'Navigation',
  ]);
  assert.deepEqual(splitVehicleOptions('Alloy Wheels | Backup Camera • Heated Seats\r\nSunroof'), [
    'Alloy Wheels', 'Backup Camera', 'Heated Seats', 'Sunroof',
  ]);
});

test('invisible separators count as separators', () => {
  assert.deepEqual(splitVehicleOptions('Alloy Wheels​Backup Camera\u001FHeated Seats'), [
    'Alloy Wheels', 'Backup Camera', 'Heated Seats',
  ]);
});

test('names with a capital in the middle stay whole', () => {
  // A normal list is left alone.
  assert.deepEqual(splitVehicleOptions('Apple CarPlay, OnStar, HomeLink, SiriusXM Radio'), [
    'Apple CarPlay', 'OnStar', 'HomeLink', 'SiriusXM Radio',
  ]);
  // Run together, they're still kept whole.
  assert.deepEqual(splitVehicleOptions('Backup CameraApple CarPlayHeated SeatsOnStarRemote Start'), [
    'Backup Camera', 'Apple CarPlay', 'Heated Seats', 'OnStar', 'Remote Start',
  ]);
});

test('a single long feature name is not cut up', () => {
  assert.deepEqual(splitVehicleOptions('Automatic Emergency Braking with Pedestrian Detection'), [
    'Automatic Emergency Braking with Pedestrian Detection',
  ]);
});

test('repeats, blanks and empty input', () => {
  assert.deepEqual(splitVehicleOptions('Fog Lights, fog lights, , Fog  Lights'), ['Fog Lights']);
  assert.deepEqual(splitVehicleOptions(''), []);
  assert.deepEqual(splitVehicleOptions(null), []);
  assert.deepEqual(splitVehicleOptions(undefined), []);
});
