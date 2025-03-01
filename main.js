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

const downloadDB = async () => {
  const response = await fetch("http://localhost:8080/file");
  const arr = await response.arrayBuffer();
  return new Uint8Array(arr);
};

async function streamFileToOPFS(fileName) {
  // Step 1: Get the OPFS root directory
  const opfsRoot = await navigator.storage.getDirectory();

  // Step 2: Create a file in OPFS
  const fileHandle = await opfsRoot.getFileHandle(fileName, { create: true });

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
const filename = "test.db";
await streamFileToOPFS(filename);
await db.open({
  path: "opfs://" + filename,
  accessMode: duckdb.DuckDBAccessMode.READ_ONLY,
});

const conn = await db.connect(); // Connect to db
let q = await conn.query(`SELECT * FROM big_table limit 100`); // Returns v = 101
console.log("Query result (Arrow Table):", q);

// // Prepare query
// console.log("Prepared query statement");
// const stmt = await conn.prepare(
//   `SELECT (v + ?) as v FROM generate_series(0, 1000) as t(v);`
// );

// // ... and run the query with materialized results
// const res = await stmt.query(234); // Returns 1001 entries ranging from v = 234 to 1,234
console.log("Statement result (Table):", res);
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
await conn.close();
await db.terminate();
await worker.terminate();

console.log("Finished!");
