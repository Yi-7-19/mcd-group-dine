import {readFileSync} from 'node:fs';

// These images replace the native pointer. There is no hidden cursor or follower.
export const cursorSpec=Object.freeze({width:32,height:34,hotspotX:2,hotspotY:2});
const sources=Object.freeze({
  default:readFileSync(new URL('../assets/cursors/fries-arrow.svg',import.meta.url),'utf8'),
  action:readFileSync(new URL('../assets/cursors/fries-arrow-action.svg',import.meta.url),'utf8'),
});
const asCursor=kind=>`url("data:image/svg+xml,${encodeURIComponent(sources[kind]).replace(/'/g,'%27')}") ${cursorSpec.hotspotX} ${cursorSpec.hotspotY}`;

export function brandCursorCss() {
  return `/* A single, accurately anchored fries-packet arrow; no decorative follower. */
@media (hover:hover) and (pointer:fine) {
  html,body{cursor:${asCursor('default')},auto}
  a[href],button,summary,[role="button"],label[for],select,input[type="button"],input[type="submit"],input[type="reset"],input[type="checkbox"],input[type="radio"]{cursor:${asCursor('action')},pointer}
  textarea,input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]),[contenteditable="true"],[contenteditable=""]{cursor:text}
  button:disabled,[aria-disabled="true"]{cursor:not-allowed}
  button[aria-busy="true"],[aria-busy="true"]{cursor:progress}
}
@media (forced-colors:active) {
  html,body{cursor:auto}
  a[href],button,summary,[role="button"],label[for],select,input[type="button"],input[type="submit"],input[type="reset"],input[type="checkbox"],input[type="radio"]{cursor:pointer}
  textarea,input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]),[contenteditable="true"],[contenteditable=""]{cursor:text}
  button:disabled,[aria-disabled="true"]{cursor:not-allowed}
  button[aria-busy="true"],[aria-busy="true"]{cursor:progress}
}
@media print{html,body,a[href],button,summary{cursor:auto}}
`;
}
