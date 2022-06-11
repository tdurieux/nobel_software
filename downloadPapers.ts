import * as async from "async";
import * as fs from "fs";
import * as progress from "cli-progress";

import {
  getAuthorIds,
  getLaureates,
  downloadAuthorPapers,
  getPapers,
  search,
} from "./libs/utils";

(async () => {
  const nobels = JSON.parse(
    fs.readFileSync("data/nobels.json").toString("utf-8")
  );
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  bar.start(nobels.length, 0);
  for (const nobel of nobels) {
    bar.increment();
    if (!nobel.id) {
      // author id not found
      continue;
    }

    try {
      const papers = await getPapers({
        mId: nobel.id,
        name: nobel.normalizedName,
      });

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
})();
