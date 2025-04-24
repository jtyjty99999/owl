const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const PORT = 3001;

app.use(express.static(path.join(__dirname, 'public')));

let pyProcess = null;
let wsClient = null;

// WebSocket 服务
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    wsClient = ws;
    ws.on('message', (msg) => {
        if (pyProcess && pyProcess.stdin.writable) {
            pyProcess.stdin.write(msg + '\n');
        }
    });
    ws.on('close', () => {
        wsClient = null;
        if (pyProcess) pyProcess.kill();
        pyProcess = null;
    });
});

// 启动 run.py 的 API（交互模式）
app.post('/api/run', (req, res) => {
    if (pyProcess) {
        return res.json({ success: false, error: 'run.py 已在运行' });
    }
    const runPyPath = path.join(__dirname, '../run.py');
    pyProcess = spawn('python3', [runPyPath], { cwd: path.join(__dirname, '..') });
    pyProcess.stdout.on('data', (data) => {
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(data.toString());
        }
    });
    pyProcess.stderr.on('data', (data) => {
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
            wsClient.send('[stderr] ' + data.toString());
        }
    });
    pyProcess.on('close', (code) => {
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(`\n[run.py 已退出，退出码 ${code}]`);
        }
        pyProcess = null;
    });
    res.json({ success: true });
});

server.listen(PORT, () => {
    console.log(`Web Launcher server with WebSocket running at http://localhost:${PORT}`);
});
