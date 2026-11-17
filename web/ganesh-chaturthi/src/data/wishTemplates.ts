// Wish-card templates for the "Customize Your Wishes" flow (App.tsx +
// WishCustomizer.tsx). Backgrounds are the real designed artwork supplied in
// Extra/Campaign/{1,2,3}.png, resized and shipped as public/wish-templates/
// template-{1,2,3}.jpg. `photoBox` is the exact placement rectangle for the
// user's photo, measured from the matching Annoted_*.png reference (which has
// a rectangle drawn on it showing where/how large the photo should appear) —
// expressed as fractions of the template image's own width/height so it's
// resolution-independent.
export interface PhotoBox {
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
}

export interface WishTemplate {
  id: string;
  name: string;
  imageSrc: string;
  photoBox: PhotoBox;
}

// Matches the aspect ratio of the supplied template art (5463x3875) — actual
// canvas pixel size used for rendering/export/share.
export const CANVAS_W = 1600;
export const CANVAS_H = 1135;

export const WISH_TEMPLATES: WishTemplate[] = [
  {
    id: 'template-1',
    name: 'Ganesh Chaturthi — Classic',
    imageSrc: '/wish-templates/template-1.jpg',
    photoBox: { xFrac: 0.031875, yFrac: 0.599119, wFrac: 0.2125, hFrac: 0.399118 },
  },
  {
    id: 'template-2',
    name: 'Ganesh Chaturthi — Pink Swing',
    imageSrc: '/wish-templates/template-2.jpg',
    photoBox: { xFrac: 0.059375, yFrac: 0.563, wFrac: 0.233125, hFrac: 0.4344 },
  },
  {
    id: 'template-3',
    name: 'Ganpati Bappa Morya',
    imageSrc: '/wish-templates/template-3.jpg',
    photoBox: { xFrac: 0.146875, yFrac: 0.596476, wFrac: 0.21375, hFrac: 0.401762 },
  },
];
