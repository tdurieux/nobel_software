import * as fs from "fs";

import {
  Laureate,
  getLaureateName,
  normalizeName,
  getLaureates,
  downloadPDFs,
  search,
} from "./libs/utils";

(async () => {
  const output = [];
  const laureates = await getLaureates();
  for (const laureate of laureates) {
    const o = <any>{};
    o.firstname = laureate.firstname;
    o.surname = laureate.surname;
    o.normalizedName = getLaureateName(laureate);
    o.id = laureate.mId;
    o.prizes = laureate.prizes;

    const s = await search({laureate});
    if (s.de) {
      s.de.sort((a, b) => {
        if (a.d && !b.d) {
          return -1;
        }
        if (!a.d && b.d) {
          return 1;
        }
        return b.ccnt - a.ccnt;
      });
      for (const a of s.de) {
        if (!a.an || !a.ewsn) {
          continue;
        }
        o.id = a.id;
        if (!o.id && a.ewsn[0]) {
          o.id = a.ewsn[0].id;
        }
        o.name = a.an;
        o.publications = a.pc;
        o.citations = a.ccnt;
        o.description = a.d;
        o.image = a.fiurl;
        if (a.ci) {
          o.affiliation = a.ci.dn;
        }
        if (!o.affiliation && a.ewsn[0] && a.ewsn[0].ci) {
          a.ewsn[0].ci.dn;
        }

        o.domains = [];
        a.fos.forEach((e) => o.domains.push(e.dn));
        break;
      }
    }
    output.push(o);
  }
  fs.writeFileSync("data/nobels.json", JSON.stringify(output));
})();
