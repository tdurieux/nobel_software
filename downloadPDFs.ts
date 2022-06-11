import * as async from "async";
import * as fs from "fs";
import * as progress from "cli-progress";

import {
  downloadPDFs,
} from "./libs/utils";

(async () => {
  await downloadPDFs();
})();
