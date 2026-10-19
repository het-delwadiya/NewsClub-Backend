import cors from "cors";
import express from "express";
import helmet from "helmet";
import { z } from "zod";
import { getStory, isSection, isStoryId, listStories } from "./guardian.js";

const prefix = process.env.URL_PREFIX || "";
const origins = (process.env.CORS_ORIGIN || "http://localhost:5176").split(",").map((s) => s.trim());

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: origins }));

const api = express.Router();
api.get("/health", (_req, res) => res.json({ ok: true }));

const listQuery = z.object({
  section: z.string().refine(isSection, "Unknown section").default("latest"),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(50).default(1),
});

api.get("/stories", async (req, res) => {
  const q = listQuery.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.issues[0].message });
  res.set("Cache-Control", "public, max-age=120");
  res.json(await listStories(q.data));
});

api.get("/story", async (req, res) => {
  const id = String(req.query.id ?? "");
  if (!isStoryId(id)) return res.status(400).json({ error: "Invalid story id" });
  res.set("Cache-Control", "public, max-age=600");
  res.json(await getStory(id));
});

api.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use(`${prefix}/api`, api);
app.use((err, _req, res, _next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Something went wrong on our side" });
});

const port = Number(process.env.PORT || 8004);
app.listen(port, () => console.log(`[api] listening on :${port}${prefix}/api`));
