import "./style.css";

// Add some content to the HTML
document.querySelector("#app").innerHTML = `
  <h1>Hello Vite!</h1>
  <h4>Open the DevTools console to see the output</h4>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`;

import * as duckdb from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_next from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

const MANUAL_BUNDLES = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_next,
    // mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).toString(),
    mainWorker: eh_worker,
  },
};

async function streamFileToOPFS(fileName) {
  // Step 1: Get the OPFS root directory
  const opfsRoot = await navigator.storage.getDirectory();

  // Step 2: Check if the file already exists
  let fileHandle;
  try {
    fileHandle = await opfsRoot.getFileHandle(fileName);
    console.log(`${fileName} already exists in OPFS. Skipping download.`);
    return;
  } catch (e) {
    if (e.name === "NotFoundError") {
      // File does not exist, proceed to create and download it
      fileHandle = await opfsRoot.getFileHandle(fileName, { create: true });
    } else {
      throw e;
    }
  }

  // Step 3: Create a writable stream for the file
  const writableStream = await fileHandle.createWritable();

  // Step 4: Fetch the file and stream directly into OPFS
  const response = await fetch("http://localhost:8080/file");
  if (!response.body) throw new Error("ReadableStream not supported");

  // Stream response body to OPFS
  await response.body.pipeTo(writableStream);

  console.log(`${fileName} has been successfully saved in OPFS!`);
}

// Select a bundle based on browser checks
const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

// Instantiate the asynchronus version of DuckDB-wasm
const worker = new Worker(bundle.mainWorker);
const logger = new duckdb.ConsoleLogger();
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
const filename = "newer.duckdb";
await streamFileToOPFS(filename);
await db.open({
  path: "opfs://" + filename,
  accessMode: duckdb.DuckDBAccessMode.READ_ONLY,
});

const conn = await db.connect(); // Connect to db
let q = await conn.query(`SELECT * FROM big_table limit 100`); // Returns v = 101
console.log("Query result (Arrow Table):", q);

console.log(
  "Statement result copy (JSON):",
  // Bug fix explained at: https://github.com/GoogleChromeLabs/jsbi/issues/30
  JSON.parse(
    JSON.stringify(
      q.toArray(),
      (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
    )
  )
);

// Closing everything