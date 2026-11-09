<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Embedded Site Browser</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f4f4f4;
        }
        .browser-container {
            max-width: 900px;
            margin: 0 auto;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .browser-toolbar {
            display: flex;
            padding: 10px;
            background: #ddd;
            gap: 8px;
        }
        .browser-toolbar input[type="text"] {
            flex: 1;
            padding: 6px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        .browser-toolbar button {
            padding: 6px 14px;
            background: #007bff;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .browser-toolbar button:hover {
            background: #0056b3;
        }
        iframe {
            width: 100%0;
            height: 500px;
            border: none;
            width: 100%;
        }
    </style>
</head>
<body>

<div class="browser-container">
    <div class="browser-toolbar">
        <button onclick="goBack()">←</button>
        <button onclick="goForward()">→</button>
        <button onclick="refreshPage()">↻</button>
        <input type="text" id="urlInput" value="https://example.com" placeholder="Enter URL...">
        <button onclick="loadURL()">Go</button>
    </div>
    <iframe id="browserFrame" src="https://example.com"></iframe>
</div>

<script>
    const iframe = document.getElementById('browserFrame');
    const urlInput = document.getElementById('urlInput');

    function loadURL() {
        let url = urlInput.value.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        iframe.src = url;
    }

    // Allow pressing "Enter" in the input field to load the site
    urlInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            loadURL();
        }
    });

    function goBack() {
        try { iframe.contentWindow.history.back(); } catch (e) { alert('Navigation history restricted by target site.'); }
    }

    function goForward() {
        try { iframe.contentWindow.history.forward(); } catch (e) { alert('Navigation history restricted by target site.'); }
    }

    function refreshPage() {
        iframe.src = iframe.src;
    }
</script>

</body>
</html>
