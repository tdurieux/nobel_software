import got from "got";
import * as fs from "fs";
import { join, dirname } from "path";
import * as progress from "cli-progress";

import {
  Laureate,
  getLaureateName,
  normalizeName,
  getLaureates,
  downloadPDFs,
} from "./libs/utils";

(async () => {
  const laureates = await getLaureates();
  // await downloadAuthorPapers(laureates);
  await downloadPDFs();
})();
