// mock_server.js - Local mock API server and static file server for testing

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Sample Q&A Database
const qaDatabase = {
  '1+1等于几': '2',
  '中国的首都是哪里': '北京',
  '计算机的核心部件是什么': 'CPU',
  '这是一道多选题': 'A,B,C',
  '地球是圆的吗': '对'
};

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Serve static files from the test folder
  if (pathname.startsWith('/test/')) {
    const fileName = path.basename(pathname);
    const filePath = path.join(__dirname, fileName);

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('文件不存在');
      } else {
        let contentType = 'text/html; charset=utf-8';
        if (filePath.endsWith('.js')) contentType = 'text/javascript; charset=utf-8';
        if (filePath.endsWith('.css')) contentType = 'text/css; charset=utf-8';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
    return;
  }

  if (pathname === '/search') {
    if (req.method === 'GET') {
      const question = parsedUrl.query.q;
      handleSearch(question, res);
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          const question = jsonBody.question;
          handleSearch(question, res);
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON request body' }));
        }
      });
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

function handleSearch(question, res) {
  console.log(`[Mock Server] Received search query: "${question}"`);
  
  if (!question) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Question parameter missing' }));
    return;
  }

  // Find matches using basic substring matching
  let answer = '未找到答案';
  let matched = false;
  
  for (const qKey in qaDatabase) {
    if (question.includes(qKey) || qKey.includes(question)) {
      answer = qaDatabase[qKey];
      matched = true;
      break;
    }
  }

  const responseData = {
    status: 200,
    success: matched,
    data: {
      question: question,
      answer: answer
    }
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(responseData));
}

server.listen(PORT, () => {
  console.log(`[Mock Server] Running on http://localhost:${PORT}`);
  console.log('[Mock Server] Test urls:');
  console.log(`  Simulation Page: http://localhost:${PORT}/test/mock_page.html`);
  console.log(`  API GET Test:    http://localhost:${PORT}/search?q=中国的首都是哪里`);
});
