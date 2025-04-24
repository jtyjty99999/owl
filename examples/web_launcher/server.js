const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
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
        // 不再 kill pyProcess，让 pyProcess 持续运行支持多轮交互
        // if (pyProcess) pyProcess.kill();
        // pyProcess = null;
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
            const str = data.toString();
            // toolkit 工具调用分流（捕获所有包含 toolkit 的行）
            const toolkitPattern = /toolkit.*?(\n|$)/gi;
            let toolkitMatch;
            let toolkitLastIndex = 0;
            while ((toolkitMatch = toolkitPattern.exec(str)) !== null) {
                const info = toolkitMatch[0].trim();
                if (info) wsClient.send('[toolkit]' + info);
                toolkitLastIndex = toolkitPattern.lastIndex;
            }
            // enhanced_role_playing 分流
            const erpPattern = /Round #[0-9]+ (user|assistant)_response:\n([\s\S]*?)(?=Round|$)/g;
            let lastIndex = 0;
            let match;
            let sent = false;
            while ((match = erpPattern.exec(str)) !== null) {
                const role = match[1];
                const content = match[2].trim();
                if (content) {
                    wsClient.send('[enhanced_role_playing]' + `**${role}**\n\n` + content);
                    sent = true;
                }
                lastIndex = erpPattern.lastIndex;
            }
            // 剩余内容按原逻辑分流
            const maxLast = Math.max(lastIndex, toolkitLastIndex);
            if (maxLast < str.length) {
                const rest = str.slice(maxLast);
                if (rest.trim()) wsClient.send(rest);
            }
            if (!sent && str.includes('[enhanced_role_playing]')) {
                wsClient.send('[enhanced_role_playing]' + str.split('[enhanced_role_playing]')[1]);
            }
        }
        // Debug 日志
        console.log('[DEBUG][模型输出]', data.toString().replace(/\n$/, ''));
    });
    pyProcess.stderr.on('data', (data) => {
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
            wsClient.send('[stderr] ' + data.toString());
        }
        // Debug 日志
        console.error('[DEBUG][stderr]', data.toString().replace(/\n$/, ''));
    });
    pyProcess.on('close', (code) => {
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(`\n[run.py 已退出，退出码 ${code}]`);
        }
        pyProcess = null;
    });
    res.json({ success: true });
});

// 新增 API: 设置 default_task
app.post('/api/set_task', express.json(), (req, res) => {
    const { task, force } = req.body;
    if (!task || typeof task !== 'string') {
        return res.json({ success: false, error: '任务内容不能为空' });
    }
    // 检查当前 default_task
    const runPyPath = path.join(__dirname, '../run.py');
    const runPyContent = fs.readFileSync(runPyPath, 'utf-8');
    const match = runPyContent.match(/default_task\s*=\s*(["'`])([\s\S]*?)\1/);
    if (match && match[2] === task && !force) {
        // 任务一致，询问是否替换
        return res.json({
            success: false,
            error: '任务与当前一致，是否强制替换？',
            needConfirm: true
        });
    }
    // 替换 default_task
    const newContent = runPyContent.replace(/default_task\s*=\s*(["'`])[\s\S]*?\1/, `default_task = "${task.replace(/"/g, '\\"')}"`);
    fs.writeFileSync(runPyPath, newContent, 'utf-8');
    res.json({ success: true });
});

server.listen(PORT, () => {
    console.log(`Web Launcher server with WebSocket running at http://localhost:${PORT}`);
});
