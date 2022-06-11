import got from "got";
import { CookieJar } from "tough-cookie";

import * as fs from "fs";
import { join, dirname } from "path";
import * as progress from "cli-progress";
import * as async from "async";

export function normalizeName(name: string) {
  return decodeURI(name.toString())
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f-\u332f]/g, "")
    .replace("--", " ")
    .replace(".", "")
    .replace("'", " ")
    .replace("-", " ")
    .replace("(", "")
    .replace(")", "")
    .replace(", ", " ")
    .replace(",", " ")
    .replace("phd ", "")
    .replace("dr ", "")
    .replace("sir ", "")
    .replace(/\./g, "")
    .replace(/-/g, " ");
}

export function getLaureateName(laureate: Laureate): string {
  return normalizeName(`${laureate.firstname} ${laureate.surname}`);
}

export interface Price {
  year: Number;
  category: string;
  share: Number;
  motivation: string;
  affiliations: Array<{
    name: string;
    city: string;
    country: string;
  }>;
}
export interface Laureate {
  id: Number;
  mId: Number;
  firstname: string;
  surname: string;
  normalizedName: string;
  born: string;
  died: string;
  bornCountry: string;
  bornCountryCode: string;
  bornCity: string;
  diedCountry: string;
  diedCountryCode: string;
  diedCity: string;
  gender: string;
  prizes: Price[];
}

export async function getLaureates(): Promise<Laureate[]> {
  const filePath = "data/laureate.json";
  if (fs.existsSync(filePath)) {
    return JSON.parse(
      await (await fs.promises.readFile(filePath)).toString("utf8")
    );
  }
  const url = "http://api.nobelprize.org/v1/laureate.json";
  const res = await got(url).json<{ laureates: any[] }>();

  await fs.promises.writeFile(filePath, JSON.stringify(res.laureates, null, 1));
  return res.laureates;
}

interface Opt {
  laureate: Laureate;
  query?: String;
}
export async function search(opt: Opt): Promise<any> {
  const name = getLaureateName(opt.laureate);
  const filePath = `data/search/${name}.json`;
  if (fs.existsSync(filePath) && !opt.query) {
    return JSON.parse((await fs.promises.readFile(filePath)).toString("utf8"));
  }

  let query = opt.query;
  if (!query)
    query =
      opt.laureate.firstname +
      " " +
      opt.laureate.surname +
      " from " +
      opt.laureate.prizes[0].affiliations[0].name;
  const url = "https://academic.microsoft.com/api/search";
  const res = await got
    .post(url, {
      json: {
        query,
        queryExpression: "",
        filters: [],
        orderBy: 0,
        skip: 0,
        sortAscending: true,
        take: 10,
        includeCitationContexts: true,
        profileId: "",
      },
    })
    .json();
  await fs.promises.writeFile(filePath, JSON.stringify(res, null, 1));
  return res;
}

export function getInstitutions(laureate: Laureate): string[] {
  const institutions = new Set<string>();
  for (let p of laureate.prizes) {
    for (let a of p.affiliations) {
      if (a.name) {
        institutions.add(normalizeName(a.name));
      }
    }
  }
  return Array.from(institutions);
}

export async function interpret(laureate: Laureate): Promise<any[]> {
  const name = getLaureateName(laureate);

  const filePath = `data/interprets/${name}.json`;
  if (fs.existsSync(filePath)) {
    return JSON.parse((await fs.promises.readFile(filePath)).toString("utf8"));
  }

  const url = `https://api.labs.cognitive.microsoft.com/academic/v1.0/interpret?query=${laureate.firstname} ${laureate.surname}&subscription-key=5969fd828a87456592eddff3649801f7`;
  let authors = [];
  try {
    const res = await got(url).json<{ interpretations: any[] }>();
    authors = res.interpretations;
    await fs.promises.writeFile(filePath, JSON.stringify(authors, null, 1));
  } catch (error) {
    console.error(error);
    console.log(name + "\n");
  }
  return authors;
}

export async function getAuthorId(laureate: Laureate): Promise<any[]> {
  const name = getLaureateName(laureate);

  const filePath = `data/authors1/${name}.json`;
  if (fs.existsSync(filePath)) {
    // return JSON.parse((await fs.promises.readFile(filePath)).toString("utf8"));
  }

  // const query = `AuN=='${encodeURI(name)}'`;
  const interprets = (await interpret(laureate)).map(
    (i) => i.rules[0].output.value
  );
  //.filter((i) => i.indexOf("Composite(AA.AuN") == 0 && i.indexOf("AND(") == -1);
  if (interprets.length == 0) {
    return [];
  }
  let q = interprets[0].replace("Composite(AA.", "");
  q = q.substring(0, q.length - 1);
  const url = `https://api.labs.cognitive.microsoft.com/academic/v1.0/evaluate?expr=${interprets[0]}&model=latest&count=10&offset=0&attributes=Id,LKA.AfId,LKA.AfN,AuN,CC,DAuN,ECC,PC&subscription-key=5969fd828a87456592eddff3649801f7`;
  console.log("\n", url, "\n");
  let authors = [];
  try {
    const res = await got(url).json<{ entities: any[] }>();
    authors = res.entities.filter((p) => p.prob > 0);
    await fs.promises.writeFile(filePath, JSON.stringify(authors, null, 1));
  } catch (error) {
    console.error(error);
    console.log(name + "\n");
  }

  return authors;
}

export async function getPapers(opt: {
  laureate?: Laureate;
  mId?: Number;
  name?: string;
}): Promise<any[]> {
  let query = null;
  let name = "";
  if (opt.name) {
    name = opt.name;
  }
  if (opt.laureate) {
    name = opt.laureate.normalizedName;
  }
  if (opt.mId) {
    query = `Composite(AA.AuId=${opt.mId})`;
  } else if (opt.name) {
    query = `Composite(AA.AuN=='${opt.name}')`;
  } else if (opt.laureate) {
    const name = getLaureateName(opt.laureate);
    const institutions = getInstitutions(opt.laureate);

    query = `Composite(AA.AuN=='${opt.laureate.normalizedName}')`;
    if (opt.laureate.mId) {
      query = `Composite(AA.AuId=${opt.laureate.mId})`;
    } else if (institutions.length > 0) {
      query = `And(Composite(AA.AuN=='${name}'),Composite(AA.AfN=='${institutions[0]}'))`;
    }
  }

  const filePath = `data/papers3/${name}.json`;
  if (fs.existsSync(filePath)) {
    return JSON.parse(
      await (await fs.promises.readFile(filePath)).toString("utf8")
    );
  }
  const url = `https://api.labs.cognitive.microsoft.com/academic/v1.0/evaluate?expr=${query}&model=latest&count=10000&offset=0&attributes=Id,DOI,DN,Y,J.JN,CC,AA.AuN,AA.AuId,S&subscription-key=5969fd828a87456592eddff3649801f7`;
  const res = await got(url).json<{ entities: any[] }>();
  const papers = res.entities.filter((p) => p.prob > 0);
  if (papers.length > 0) {
    await fs.promises.writeFile(filePath, JSON.stringify(papers, null, 1));
  }
  return papers;
}

export async function getAuthorIds(laureates: Laureate[]) {
  // const bar1 = new progress.SingleBar({}, progress.Presets.shades_classic);
  // bar1.start(laureates.length, 0);
  const authorIds = JSON.parse(
    await (await fs.promises.readFile("data/authorIds.json")).toString("utf8")
  );
  for (let laureate of laureates.reverse()) {
    // bar1.increment();
    const name = getLaureateName(laureate);
    const institutions = getInstitutions(laureate);
    try {
      const authors = await getAuthorId(laureate);
      if (authors.length == 0) {
        continue;
      }

      if (authorIds[name]) {
        laureate.mId = authorIds[name];
        continue;
      }

      let author = null;
      authors: for (let a of authors) {
        if (a.LKA) {
          for (let i of institutions) {
            const ai = normalizeName(a.LKA.AfN) || "";
            console.log(ai, i);
            if (ai == i || i.indexOf(ai) > -1 || ai.indexOf(i) > -1) {
              author = a;
              break authors;
            }
          }
        }
      }
      console.log(author);
      if (author) {
        authorIds[name] = author.Id;
        laureate.mId = authorIds[name];
      }
    } catch (error) {
      console.log(error);
      console.log(name, institutions);
    }
  }
  await fs.promises.writeFile(
    "data/authorIds.json",
    JSON.stringify(authorIds, null, 1)
  );
  return authorIds;
}

export async function downloadAuthorPapers(laureates: Laureate[]) {
  const authorIds = await getAuthorIds(laureates);

  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  bar.start(Object.keys(authorIds).length, 0);

  for (let laureate of laureates.reverse()) {
    if (!laureate.mId) {
      // author id not found
      continue;
    }
    // bar.increment();
    try {
      const papers = await getPapers(laureate);
      const name = getLaureateName(laureate);
      const institutions = getInstitutions(laureate);

      // console.log(
      //   name,
      //   institutions,
      //   laureate.prizes[0].category,
      //   papers.length
      // );
    } catch (error) {
      console.log(error);
    }
  }
}

export async function downloadPDFs() {
  return new Promise(async (resolve) => {
    const paperFiles = await fs.promises.readdir("data/papers3");

    const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
    // bar.start(paperFiles.length, 0);
    let countNotFound = 0;
    async.eachLimit(
      paperFiles,
      10,
      async (file, cb) => {
        // bar.increment();
        const author = file.replace(".json", "");
        console.log("\n#", author);
        const papers = JSON.parse(
          await (
            await fs.promises.readFile(join("data", "papers3", file))
          ).toString("utf8")
        );
        const paperBar = new progress.SingleBar(
          {},
          progress.Presets.shades_classic
        );
        // paperBar.start(papers.length, 0);
        for (let paper of papers) {
          // paperBar.increment();
          if (paper.Y < 2000) {
            continue;
          }
          const paperPath = join("data", "pdf1", author, paper.Id + ".pdf");
          if (!fs.existsSync(dirname(paperPath))) {
            await fs.promises.mkdir(dirname(paperPath), { recursive: true });
          } else if (fs.existsSync(paperPath)) {
            continue;
          }
          if (!paper.S) {
            continue;
          }
          let found = false;
          for (let source of paper.S) {
            if (
              source.U.indexOf(".pdf") > -1 ||
              (source.Ty && source.Ty == 3)
            ) {
              try {
                const cookieJar = new CookieJar();
                const res = await got(source.U, {
                  cookieJar,
                  headers: {
                    "user-agent":
                      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
                  },
                  https: { rejectUnauthorized: false },
                  timeout: 60000,
                });
                if (res.headers["content-type"].indexOf("pdf") > -1) {
                  fs.promises.writeFile(paperPath, res.rawBody);
                  found = true;
                  break;
                } else {
                  console.log(res.url, res.headers["content-type"]);
                }
              } catch (error) {
                console.error("\n", source.U, error.message);
              }
            }
          }
          if (!found) {
            countNotFound++;
          }
        }
        cb();
      },
      () => {
        console.log("countNotFound", countNotFound);
        resolve({ countNotFound });
      }
    );
  });
}
