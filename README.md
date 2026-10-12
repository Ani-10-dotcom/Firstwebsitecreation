# Firstwebsitecreation

Product page for the Leoron by Srushti Gold Outer Lid Pressure Cooker (3 L), in the style of a grocery e-commerce site. Plain HTML, CSS and JavaScript with no build step.

```
index.html       page markup
css/style.css    all styles (light and dark themes, phone to desktop layouts)
js/script.js     gallery, basket, wishlist, reviews and section menu
images/          the five 500 x 500 product photos
```

- Features: image gallery with hover zoom, add to basket with a 1 to 10 quantity stepper, wishlist, specifications and customer reviews.
- To change the gallery, edit the `IMAGES` array in `js/script.js`.
- Basket, wishlist and reviews are saved in the browser's localStorage (`kk:qty`, `kk:wish`, `kk:reviews`).
- Price, reviews and delivery notes are sample content. Replace them with real data.

## Run locally

Serve the folder, for example `python3 -m http.server`, then open http://localhost:8000. Opening `index.html` directly also works.

## Deploy on Vercel

Import this repository at https://vercel.com/new. Leave Framework Preset set to "Other" and leave the build command empty; Vercel serves the files as they are. After that, every push to `main` redeploys the site, and pushes to other branches get preview URLs.
