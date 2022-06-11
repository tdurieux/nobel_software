import * as fs from "fs";
import { join, dirname } from "path";
import * as progress from "cli-progress";
import * as async from "async";

import * as urlParser from "url-parse";

import { PDFExtract } from "pdf.js-extract";

async function toCSV(links) {
  let output = "";
  for (let domain in links) {
    for (let author in links[domain]) {
      for (let pdf in links[domain][author]) {
        links[domain][author][pdf].forEach((url) => {
          output += [author, pdf, domain, url].join(",") + "\n";
        });
      }
    }
  }
  await fs.promises.writeFile("links.csv", output);
}
(async () => {
  const links = {};
  setInterval(() => {
    toCSV(links)
  }, 30000)
  const PATH_PDFS = "data/pdfs";
  const authors = await fs.promises.readdir(PATH_PDFS);

  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  bar.start(authors.length, 0);
  async.eachLimit(authors.reverse(), 25, async (author, cb) => {
    if (author == ".DS_Store") {
      return cb()
    }
    bar.increment();
    try {
      const pdfs = await fs.promises.readdir(join(PATH_PDFS, author));
      for (let pdf of pdfs) {
        if (pdf.indexOf(".pdf") == -1) continue;

        const pdfExtract = new PDFExtract();
        try {
          const pdf_path = join(PATH_PDFS, author, pdf);
          console.log(pdf_path);
          const out = await pdfExtract.extract(pdf_path, {
            normalizeWhitespace: true,
          });
          for (let page of out.pages) {
            page.links.forEach((l) => {
              const u = urlParser(l);
              if (!links[u.hostname]) {
                links[u.hostname] = {};
              }
              if (!links[u.hostname][author]) {
                links[u.hostname][author] = {};
              }
              if (!links[u.hostname][author][pdf]) {
                links[u.hostname][author][pdf] = new Set<String>();
              }
              links[u.hostname][author][pdf].add(l);
            });
          }
        } catch (error) {
          console.log(error);
        }
      }
    } catch (error) {
      console.log(error);
    }
    cb();
  });
})();
