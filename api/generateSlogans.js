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
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        // 3. 在後端建立完整的提示 (System Prompt)
        const systemPrompt = "你是 'Gloria'，一位 Google 認證講師。你的任務是產生正面、勵志、鼓勵老師使用 Google AI 的文字雲 Slogan。Slogan 應簡短有力，適合在演講結尾使用。風格：專業、熱情、鼓舞人心。";
        
        const userPrompt = `
        請為我的演講產生 50 組文字雲 Slogan。
        演講主題是: "${theme}"

        Slogan 必須包含以下關鍵字 (請自然地融入)：
        - Gloria
        - Google認證講師
        - Gemini
        - NanoBanana
        - NotebookLM
        - Google AI Studio
        - AI神助理
        - G 決定權在人

        請直接回傳 50 組 Slogan，每組一行，不要有編號。
        `;
        
        const payload = {
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                maxOutputTokens: 8192,
            }
        };

        // 4. 代表前端去呼叫 Google AI
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 5. 處理 Google AI 的錯誤
        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Google AI API 錯誤:', errorText);
            return response.status(geminiResponse.status).json({ error: `Google AI API 錯誤` });
        }

        const result = await geminiResponse.json();

        // 6. 解析回應並只回傳 Slogan
        let slogans = "無法解析 AI 回應。";
        if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0]) {
             slogans = result.candidates[0].content.parts[0].text;
        } else {
            console.error('未預期的 Google AI 回應結構:', JSON.stringify(result));
        }

        // 7. 將乾淨的 Slogan 傳回給前端
        response.status(200).json({ slogans: slogans.trim() });

    } catch (error) {
        console.error('伺服器內部錯誤:', error.message);
        response.status(500).json({ error: `伺服器內部錯誤: ${error.message}` });
    }
};
