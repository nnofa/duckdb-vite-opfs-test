# duckdb-wasm example: vite-browser

Barebones example of querying with duckdb-wasm using Vite and just the browser (no front-end framework). Dataset is loaded through OPFS.
For this to work, you'll need to have a duckdb file to be streamed.

## How to run

1. Install the dependencies using `npm i`
2. Run `node server.js` to start server. Make sure you have a duckdb file named `smaller.duckdb` to be sent by the server.
3. If forking, run with `npm run dev` and go from there!
4. You should be able to see what's happening in console

## Steps taken

Everything runs from the [main.js](main.js) script which roughly does the following:

1. Import: duckdb-wasm and all its bundle alternatives
2. Pick bundle: Choose based on the browser in-use
3. Instantiate: Start duckdb and create a connection
4. Query: Select from the "database" (generate_series) using a basic query or a prepared statement
5. Close: The connection, database, and worker.

Notes:

- For ease of use when showing the results, JSON copies of the query results are printed to the console. Consequently...
  - ...this example is not acquainted with proper usage of the Apache Arrow objects like Table.
  - Making JSON copies of large query results for console.log may not be advisable
