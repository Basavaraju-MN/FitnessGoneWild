const http = require('http');

const PORT = 4000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      success: true,
      message: 'Node.js server is running',
    })
  );
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});