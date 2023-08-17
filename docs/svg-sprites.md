# 🌠 SVG Sprites

## Motivation
Sprite contains many images in one file. Rather than include each image as a separate image file,
it is much more memory- and bandwidth-friendly to send them as a single image.

Browser caching mechanism allows to store these files for long time without being
requested again.

SVG components are placed in js bundle increasing its size which is bad.  

### Groups

To gain benefits from sprites we store all SVG icons grouped by their application:
- `arrows` (arrows, chevrons, dropdowns) 
- `derivations` (dynamic derivation)
- `explorers` (block explorers)
- `languages` (supported locales)
- `product` (main app navigation)
- `service` (icons of general usage)
- `social` (social networks and platforms)
- `staking` (staking actions)
- `status` (indicator of some operation)
- `walletTypes` (supported wallet integrations, wallets' types)

If image doesn't have a related SVG icon, it's allowed to use raster format.
Prefer `webp` and `avif` over other formats, they are highly supported:
- [WEBP](https://caniuse.com/?search=webp) - 96.11% (15.08.2023) 
- [AVIF](https://caniuse.com/?search=avif) - 84.73% (15.08.2023)

### How it works

To create a sprite we must define an `<svg>` with a bunch of meaningful icons placed inside a group `<g>` with unique `id`. 
`Id` is the key to retrieve specific image from sprite. To be able to change color of icons special variable `currentColor` must be used.
If you decide to use SVG as a source for `<img />`, then all groups must be hidden, otherwise you'll end up seeing all icons at once. 

```svg
<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .sprite-item { display: none; }
      .sprite-item:target { display: inline; }
    </style>
  </defs>
  <g id="arrow-curve-left-16" class="sprite-item" fill="none">
      <path fill-rule="evenodd" fill="currentColor"/>
  </g>
    <!--  other images  -->
  <g id="dropdown-up-20" class="sprite-item" fill="none">
      <path fill-rule="evenodd" fill="currentColor"/>
  </g>
</svg>
```
One SVG file can store icons of different sizes so `viewBox` has the biggest size of overall icons.
In case you want to take a look at the icon, make sure to remove `sprite-item` class from the group (don't forget to place it back). 

The `<use>` element takes nodes from within the SVG document by `id` ([MDN documentation](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/use)).
To get concrete icon with specific name and size you must call it this way:
```javascript
<svg
  role="img"
  xmlns="http://www.w3.org/2000/svg"
  width="100"
  height="100"
  viewBox="0 0 100 100"
>
  <use href="image.svg#group-id" />
</svg>
```

### Adding new SVG icons

To add new icon you should:
1. Find corresponding group file (_arrows_, _explorers_, etc.)
2. Add a group `<g id="my_new_icon-SIZE" class="sprite-item" fill="none">` with the icon itself, don't miss the `id`
3. Navigate to related icon group in `shared/ui/Icon/data`
4. Add new icon with proper sizes and `{ svg: true }`

### Adding new NOT SVG icons

To add new icon you should:
1. Navigate to `assets/images/icons/not-svg`
2. Add image file
3. Navigate to related icon group in `shared/ui/Icon/data`
4. Add new icon with proper sizes and `{ svg: false }`
