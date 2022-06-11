import * as express from "express";
import * as fs from "fs";
import * as core from "cors";
import { join, resolve } from "path";
import * as compression from "compression";

import { Laureate, getLaureateName, search } from "./libs/utils";
import * as bodyParser from "body-parser";

const app = express();
app.use(core());
app.use(compression());
app.use("/", express.static(__dirname + "/public"));
app.use(express.json());

const api = express.Router();
app.use("/api", api);

const laureates: Laureate[] = JSON.parse(
  fs.readFileSync(__dirname + "/data/laureate.json").toString("utf-8")
);

const authorIds: { [k: string]: Number } = JSON.parse(
  fs.readFileSync(__dirname + "/data/authorIds.json").toString("utf-8")
);
for (const laureate of laureates) {
  if (!laureate.normalizedName) {
    laureate.normalizedName = getLaureateName(laureate);
  }
  for (const k in authorIds) {
    if (laureate.normalizedName != k) {
      continue;
    }
    laureate.mId = authorIds[k];
    break;
  }
}

api.get("/laureates", (req, res) => {
  res.json(laureates);
});

api.get("/nobels", (req, res) => {
  res.sendFile(join(__dirname, "data", "nobels.json"));
});

api.get("/laureate/:name/authors", (req, res) => {
  res.sendFile(join(__dirname, "data", "authors1", req.params.name + ".json"));
});

api.get("/laureate/:name/papers", (req, res) => {
  res.sendFile(join(__dirname, "data", "papers3", req.params.name + ".json"));
});

api.get("/laureate/:name/paper/:id", (req, res) => {
  res.sendFile(
    join(__dirname, "data", "pdf1", req.params.name, req.params.id + ".pdf")
  );
});

api.post("/laureate/:name/author", (req, res) => {
  const laureate = laureates.filter(
    (l) => l.normalizedName == req.params.name
  )[0];
  laureate.mId = req.body.mId;
  authorIds[req.params.name] = req.body.mId;
  fs.writeFileSync(
    __dirname + "/data/authorIds.json",
    JSON.stringify(authorIds)
  );
  res.send("ok");
});

api.get("/laureate/:name/search", async (req, res) => {
  let query = null;
  if (req.query.query) {
    query = req.query.query;
  }
  res.json(
    await search({
      query,
      laureate: laureates.filter((l) => l.normalizedName == req.params.name)[0],
    })
  );
});

api.get("/authorIds.json", (req, res) => {
  res.sendFile(__dirname + "/data/laureate.json");
});

const server = app.listen(8080, () => {
  console.log("Server listening on port: 8080");
});
