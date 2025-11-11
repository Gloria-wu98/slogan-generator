// 檔名： /api/generateSlogans.js
// 最終修正版：使用 CommonJS (require) 搭配 node-fetch v2，並加入 CORS 標頭

// 導入 CommonJS 版本的 node-fetch
const fetch = require('node-fetch');

module.exports = async (request, response) => {
    
    // 解決 Vercel 上的 CORS 跨域問題 (重要！)
    // 允許所有來源 (或指定您的 Vercel 前端網域)
    response.setHeader('Access-Control-Allow-Origin', '*'); 
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Vercel 會傳送 OPTIONS 請求來預檢，我們必須允許它
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // 只允許 POST 請求
    if (request.method !== 'POST') {
        return response.status(405).json({ error: '僅允許 POST 請求' });
    }

    try {
        // 1. 從前端傳來的請求中取得主題
        const { theme } = request.body;
        if (!theme) {
            return response.status(400).json({ error: '缺少主題 (theme) 參數' });
        }

        // 2. 從「環境變數」安全地取得 API 金鑰
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('在 Vercel 伺服器上找不到 GEMINI_API_KEY');
            return response.status(500).json({ error: '伺服器金鑰設定錯誤' });
        }
        
        // *** 關鍵修正 2！***
        // 修正錯字： generativelace -> generativelanguage
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        // 3. 在後端建立完整的提示 (System Prompt)
        const systemPrompt = "你是 'Gloria'，一位 Google 認證講師。你的任務是產生正面、勵志、鼓勵老師使用 Google AI 的文字雲 Slogan。Slogan 應簡短有力，適合在演講結尾使用。風格：專業、熱情、鼓舞人心。";
        
        const userPrompt = `
        請為我的演講產生 50 組文字雲 Slogan。
        演講主題是: "${
