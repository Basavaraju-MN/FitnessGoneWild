# Trek brochures

One folder per trek, named with the trek's `slug` from the `trips` table.
Put that trek's brochure PDF inside it:

    brochures/
    ├── kudremukh/
    │   └── Kudremukh Peak Trek (2D 1N).pdf
    ├── netravati/
    │   └── Netravati Peak Trek.pdf
    └── ...

- The PDF can have any name. **Its file name is the name the visitor
  downloads**, so name it the way you want customers to see it.
- Keep **one PDF per folder**. If there are more, the first one
  alphabetically is used.
- Folder names must match `trips.slug` exactly, in lowercase
  (the live server treats `Kudremukh` and `kudremukh` as different).

The website sends the file after the visitor fills in the brochure form
(name + phone), so this folder is not public.

If a trek's folder has no PDF, the brochure stored in the database (old way) is used.
