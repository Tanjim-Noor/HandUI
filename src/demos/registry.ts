import type { HandUIDemoDefinition } from '../handui/contracts/types';

export const demos: readonly HandUIDemoDefinition[] = [
  {
    id: 'landmarks',
    route: '/gallery/landmarks',
    title: 'Tracking anatomy',
    description:
      'Presence, 21 landmarks, physical handedness, derived bounds, position and approximate depth.',
    capabilities: [
      { id: 'A1', label: 'Camera access', stage: 'Foundations' },
      { id: 'A2', label: 'Hand presence', stage: 'Foundations' },
      { id: 'A3', label: 'Landmarks', stage: 'Foundations' },
      { id: 'A4', label: 'Handedness', stage: 'Foundations' },
      { id: 'A5', label: 'Position', stage: 'Foundations' },
    ],
  },
  {
    id: 'gestures',
    route: '/gallery/gestures',
    title: 'Gesture lifecycle',
    description:
      'Built-in classifications meet deterministic pinch and temporal start, hold, change, and end events.',
    capabilities: [
      { id: 'B1', label: 'Built-in gestures', stage: 'Gestures' },
      { id: 'B2', label: 'Custom gestures', stage: 'Gestures' },
      { id: 'B3', label: 'Stability', stage: 'Gestures' },
      { id: 'B4', label: 'Event lifecycle', stage: 'Gestures' },
    ],
  },
  {
    id: 'motion',
    route: '/gallery/motion',
    title: 'Motion laboratory',
    description:
      'Raw and smoothed movement, velocity, direction, stillness, and two-hand relationships.',
    capabilities: [
      { id: 'C1', label: 'Movement', stage: 'Motion' },
      { id: 'C2', label: 'Smoothing', stage: 'Motion' },
      { id: 'C6', label: 'Two-hand relationships', stage: 'Motion' },
    ],
  },
  {
    id: 'pointer',
    route: '/gallery/pointer',
    title: 'Virtual pointer',
    description:
      'Smoothed pointing, hover preactivation, and a no-repeat pinch click with conventional input parity.',
    capabilities: [
      { id: 'E1', label: 'Virtual pointer', stage: 'Interaction' },
      { id: 'E2', label: 'Hover', stage: 'Interaction' },
      { id: 'E3', label: 'Gesture click', stage: 'Interaction' },
    ],
  },
  {
    id: 'magnetic',
    route: '/gallery/magnetic',
    title: 'Magnetic attraction',
    description:
      'A custom damped spring pulls the object toward a closed fist and releases on an open palm.',
    capabilities: [{ id: 'F1', label: 'Magnetic attraction', stage: 'Interaction' }],
  },
  {
    id: 'drag',
    route: '/gallery/drag',
    title: 'Drag and drop',
    description:
      'Hover, grab, drag, release, and cancellation form one explicit interaction state machine.',
    capabilities: [{ id: 'E4', label: 'Drag and drop', stage: 'Interaction' }],
  },
  {
    id: 'two-hand',
    route: '/gallery/two-hand',
    title: 'Spatial cards',
    description:
      'Bilateral pinch captures, translates, scales, and rotates one target through a renderer-neutral contract.',
    capabilities: [{ id: 'F4', label: 'Spatial cards', stage: 'Spatial' }],
  },
  {
    id: 'orientation',
    route: '/gallery/orientation',
    title: '3D orientation',
    description:
      'Palm basis and quaternion continuity rotate a procedural 3D object; two pinches transform its stage.',
    capabilities: [
      { id: 'D1', label: 'Palm orientation', stage: 'Spatial' },
      { id: 'D2', label: 'Quaternion mapping', stage: 'Spatial' },
      { id: 'D3', label: '3D model rotation', stage: 'Spatial' },
      { id: 'D4', label: '3D transform', stage: 'Spatial' },
    ],
  },
  {
    id: 'showcase',
    route: '/gallery/showcase',
    title: 'Combined showcase',
    description:
      'Tracking, stable gestures, pointer feedback, and two-hand transformation converge in one visitor journey.',
    capabilities: [{ id: 'F5', label: 'Combined gallery', stage: 'Spatial' }],
  },
];

export function demoById(id?: string): HandUIDemoDefinition {
  return demos.find((demo) => demo.id === id) ?? demos[0]!;
}
