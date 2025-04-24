document.getElementById('runBtn').onclick = async function() {
    const outputDiv = document.getElementById('output');
    const inputBox = document.getElementById('input');
    let ws = null;

    function appendOutput(text) {
        outputDiv.textContent += text;
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    outputDiv.textContent = '正在启动 run.py...\n';
    inputBox.value = '';
    inputBox.disabled = true;
    if (ws) ws.close();
    try {
        const res = await fetch('/api/run', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            ws = new WebSocket(`ws://${location.host}`);
            ws.onopen = () => {
                appendOutput('[WebSocket 已连接]\n');
                inputBox.disabled = false;
                inputBox.focus();
            };
            ws.onmessage = evt => {
                appendOutput(evt.data);
            };
            ws.onclose = () => {
                appendOutput('\n[WebSocket 已断开]\n');
                inputBox.disabled = true;
            };
        } else {
            appendOutput('运行失败：' + (data.error || '未知错误') + '\n');
        }
    } catch (err) {
        appendOutput('请求失败：' + err.message + '\n');
    }
};

document.getElementById('input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(inputBox.value);
        inputBox.value = '';
    }
});
