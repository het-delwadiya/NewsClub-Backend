# NewsClub · API

A small proxy in front of [The Guardian Open Platform](https://open-platform.theguardian.com/) for **[newsclub.hetdelwadiya.dev](https://newsclub.hetdelwadiya.dev)**.

Frontend: [NewsClub-Frontend](https://github.com/het-delwadiya/NewsClub-Frontend)

## What it does

- `GET /api/stories?section=&q=&page=` returns articles for a section or a search, normalized to `{ id, title, summary, image, imageLarge, byline, url, publishedAt }`.
- `GET /api/story?id=` returns a single article (used for share links). Ids are validated against the Guardian id format.
- Responses are cached in memory for 10 minutes, and a stale copy is served if the Guardian API is rate-limited or down. The free developer key allows roughly 500 calls a day.
- The API key stays on the server; there is no database.

v1 scraped Inshorts through an unofficial package. v2 uses an official, licensed source instead.

## Development

```bash
cp .env.example .env   # add GUARDIAN_KEY (free at open-platform.theguardian.com)
npm install
npm run dev            # http://localhost:8004/newsclub/api
npm test
```

## License

MIT
