let ws = null;
const outputDiv = document.getElementById('output');
const debugDiv = document.getElementById('debug');
const erpDiv = document.getElementById('erp');
const toolkitDiv = document.getElementById('toolkit');
const inputBox = document.getElementById('input');
const taskInput = document.getElementById('taskInput');
const saveTaskBtn = document.getElementById('saveTaskBtn');

function appendOutput(text) {
    outputDiv.textContent += text;
    outputDiv.scrollTop = outputDiv.scrollHeight;
}
function appendDebug(text) {
    debugDiv.textContent += text;
    debugDiv.scrollTop = debugDiv.scrollHeight;
}
function showERP(markdown) {
    erpDiv.style.display = 'block';
    erpDiv.innerHTML += (window.marked ? marked.parse(markdown) : markdown) + '<hr style="border:0;border-top:1px dashed #ccc;margin:8px 0;">';
    erpDiv.scrollTop = erpDiv.scrollHeight;
}
function showToolkit(info) {
    toolkitDiv.style.display = 'block';
    toolkitDiv.textContent += info + '\n';
    toolkitDiv.scrollTop = toolkitDiv.scrollHeight;
}
function resetOutput() {
    outputDiv.textContent = '';
    debugDiv.textContent = '';
    // erpDiv.innerHTML = '';
    // erpDiv.style.display = 'none';
    toolkitDiv.textContent = '';
    toolkitDiv.style.display = 'none';
}

document.getElementById('runBtn').onclick = async function() {
    resetOutput();
    inputBox.value = '';
    inputBox.disabled = true;
    if (ws) ws.close();
    try {
        const res = await fetch('/api/run', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            ws = new WebSocket(`ws://${location.host}`);
            ws.onopen = () => {
                appendDebug('[WebSocket 已连接]\n');
                inputBox.disabled = false;
                inputBox.focus();
            };
            ws.onmessage = evt => {
                if (evt.data.startsWith('[enhanced_role_playing]')) {
                    let md = evt.data.replace('[enhanced_role_playing]', '').trim();
                    showERP(md);
                } else if (evt.data.startsWith('[toolkit]')) {
                    let info = evt.data.replace('[toolkit]', '').trim();
                    showToolkit(info);
                } else if (evt.data.startsWith('[stderr]')) {
                    appendDebug(evt.data.replace('[stderr]', ''));
                } else if (evt.data.startsWith('[DEBUG]')) {
                    appendDebug(evt.data.replace('[DEBUG]', ''));
                } else {
                    appendOutput(evt.data);
                }
            };
            ws.onclose = () => {
                appendDebug('\n[WebSocket 已断开]\n');
                inputBox.disabled = true;
            };
        } else {
            appendDebug('运行失败：' + (data.error || '未知错误') + '\n');
        }
    } catch (err) {
        appendDebug('请求失败：' + err.message + '\n');
    }
};

document.getElementById('stopBtn').onclick = function() {
    if (ws) {
        ws.close();
        debugDiv.textContent += '[用户主动断开 WebSocket]\n';
        debugDiv.scrollTop = debugDiv.scrollHeight;
    }
};

document.getElementById('input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(inputBox.value);
        inputBox.value = '';
    }
});

saveTaskBtn.onclick = async function() {
    const task = taskInput.value.trim();
    if (!task) {
        alert('请输入任务描述！');
        return;
    }
    async function saveTask(force = false) {
        saveTaskBtn.disabled = true;
        saveTaskBtn.textContent = '保存中...';
        try {
            const res = await fetch('/api/set_task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(force ? { task, force: true } : { task })
            });
            const data = await res.json();
            if (data.success) {
                saveTaskBtn.textContent = '已保存，正在启动...';
                document.getElementById('runBtn').click();
            } else if (data.needConfirm) {
                if (confirm('任务与当前一致，是否强制替换？')) {
                    await saveTask(true);
                } else {
                    saveTaskBtn.textContent = '保存并启动';
                }
            } else {
                alert('保存失败：' + (data.error || '未知错误'));
                saveTaskBtn.textContent = '保存并启动';
            }
        } catch (err) {
            alert('请求失败：' + err.message);
            saveTaskBtn.textContent = '保存并启动';
        }
        saveTaskBtn.disabled = false;
    }
    saveTask(false);
};

// 动态加载 marked.js 用于 markdown 渲染
(function() {
    if (!window.marked) {
        let script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        document.body.appendChild(script);
    }
})();
