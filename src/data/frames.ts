export type SlotShape = 'rect' | 'ellipse';
export type PhotoSlot = { x: number; y: number; width: number; height: number; shape: SlotShape; position?: number };
export type FrameConfig = { id: string; name: string; image: string; photos: number; slots: PhotoSlot[] };

const rect = (x: number, y: number, width: number, height: number): PhotoSlot => ({ x, y, width, height, shape: 'rect' });
const oval = (x: number, y: number, width: number, height: number): PhotoSlot => ({ x, y, width, height, shape: 'ellipse' });

// Slots are stored in each original artwork's 591 × 1772 coordinate system.
// Toggle the in-app calibration panel to inspect and fine tune them without changing renderer logic.
export const FRAMES: FrameConfig[] = [
  { id: '01', name: 'Merry ribbon', image: '/assets/frames/Frame_01_3photos.png', photos: 3, slots: [rect(134, 221, 316, 337), rect(134, 661, 316, 337), rect(134, 1100, 316, 336)] },
  { id: '02', name: "It’s Gici’s day", image: '/assets/frames/Frame_02_3photos.png', photos: 3, slots: [oval(48, 82, 498, 385), oval(48, 505, 498, 385), oval(48, 925, 498, 385)] },
  { id: '03', name: 'Birthday house', image: '/assets/frames/Frame_03_3photos.png', photos: 3, slots: [rect(75, 348, 433, 384), rect(118, 744, 433, 385), rect(47, 1140, 441, 388)] },
  { id: '04', name: 'I love Gici', image: '/assets/frames/Frame_04_3photos.png', photos: 3, slots: [rect(56, 462, 499, 387), rect(56, 890, 499, 387), rect(56, 1310, 499, 387)] },
  { id: '05', name: 'Polka baby', image: '/assets/frames/Frame_05_4photos.png', photos: 4, slots: [rect(132, 108, 327, 376), rect(132, 502, 327, 374), rect(132, 896, 327, 374), rect(132, 1291, 327, 374)] },
  { id: '06', name: 'Midnight birthday', image: '/assets/frames/Frame_06_4photos.png', photos: 4, slots: [rect(143, 155, 305, 351), rect(143, 526, 305, 351), rect(143, 896, 305, 350), rect(143, 1266, 305, 350)] },
  { id: '07', name: 'Chocolate dots', image: '/assets/frames/Frame_07_4photos.png', photos: 4, slots: [rect(132, 108, 327, 374), rect(132, 502, 327, 374), rect(132, 896, 327, 374), rect(132, 1290, 327, 374)] },
];

export const BACKGROUNDS = ['12', '13', '14', '15', '16'].map((id) => ({ id, image: `/assets/backgrounds/${id}.png` }));
