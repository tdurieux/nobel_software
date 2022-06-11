import * as fs from "fs";
import { join, dirname } from "path";
import * as progress from "cli-progress";
import * as async from "async";

import { PDFExtract } from "pdf.js-extract";

const langs = ["python", "java", "javascript", "typescript", "c++", "c#", ".net", "node.js", "css", "html", "software", "code", "github.com", "zenodo"];

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
  await fs.promises.writeFile("lang.csv", output);
}

(async () => {
  const output = {};
  setInterval(() => {
    toCSV(output);
  }, 30000);
  const PATH_PDFS = "data/pdfs";
  const authors = await fs.promises.readdir(PATH_PDFS);

  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  bar.start(authors.length, 0);
  async.eachLimit(authors.reverse(), 25, async (author, cb) => {
    bar.increment();
    try {
      const pdfs = await fs.promises.readdir(join(PATH_PDFS, author));
      for (let pdf of pdfs) {
        if (pdf.indexOf(".pdf") == -1) continue;

        const pdfExtract = new PDFExtract();
        try {
          const pdf_path = join(PATH_PDFS, author, pdf);
          const out = await pdfExtract.extract(pdf_path, {
            normalizeWhitespace: true,
          });
          for (let page of out.pages) {
            page.content.forEach((text) => {
              for (let lang of langs) {
                if (text.str.toLowerCase().indexOf(lang.toLowerCase()) > -1) {
                  if (!output[lang]) {
                    output[lang] = {};
                  }
                  if (!output[lang][author]) {
                    output[lang][author] = {};
                  }
                  if (!output[lang][author][pdf]) {
                    output[lang][author][pdf] = new Set<String>();
                  }
                  output[lang][author][pdf].add(lang);
                }
              }
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
