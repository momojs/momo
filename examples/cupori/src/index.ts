import { serve } from 'bun';

import index from './index.html';

const sqliteWasm = Bun.file(
  Bun.resolveSync('sql.js/dist/sql-wasm.wasm', import.meta.dir),
);

const server = serve({
  port: 8080,

  routes: {
    '/assets/sqljs-1.11.0/sql-wasm.wasm': new Response(sqliteWasm, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/wasm',
      },
    }),

    '/api/hello': {
      async GET(req) {
        return Response.json({
          message: 'Hello, world!',
          method: 'GET',
        });
      },
      async PUT(req) {
        return Response.json({
          message: 'Hello, world!',
          method: 'PUT',
        });
      },
    },

    '/api/hello/:name': async (req) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    '/*': index, // Serve index.html for all unmatched routes.
  },

  development: process.env.NODE_ENV !== 'production' && {
    hmr: true, // Enable browser hot reloading in development
    console: true, // Echo console logs from the browser to the server
  },
});

console.log(`🚀 Server running at ${server.url}`);
