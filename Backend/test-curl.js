const https = require('https');

const apiKey = 'AIzaSyCMKUJD-UjmrznVcAJy0_KiG-09MwnILrg';

async function testModel(modelName, apiVersion = 'v1beta') {
    const data = JSON.stringify({
        contents: [{
            parts: [{
                text: 'Say hello in one word'
            }]
        }]
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/${apiVersion}/models/${modelName}:generateContent`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: responseData,
                    model: modelName,
                    version: apiVersion
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('🧪 Testing Gemini API with different models and versions...\n');

    const tests = [
        { model: 'gemini-2.0-flash-exp', version: 'v1beta' },
        { model: 'gemini-2.0-flash-exp', version: 'v1' },
        { model: 'gemini-1.5-flash', version: 'v1beta' },
        { model: 'gemini-1.5-flash', version: 'v1' },
        { model: 'gemini-1.5-pro', version: 'v1beta' },
        { model: 'gemini-1.5-pro', version: 'v1' },
        { model: 'gemini-pro', version: 'v1beta' },
        { model: 'gemini-pro', version: 'v1' },
    ];

    for (const test of tests) {
        try {
            console.log(`\n🔄 Testing: ${test.model} (${test.version})`);
            const result = await testModel(test.model, test.version);

            if (result.statusCode === 200) {
                const response = JSON.parse(result.body);
                const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No text';
                console.log(`  ✅ SUCCESS! Status: ${result.statusCode}`);
                console.log(`  📝 Response: ${text.trim()}`);
                console.log(`  🎉 WORKING COMBINATION FOUND!`);
                console.log(`  👉 Model: ${test.model}`);
                console.log(`  👉 API Version: ${test.version}`);
                console.log(`  👉 Use in your code: getGenerativeModel({ model: '${test.model}' })`);
                break; // Stop after first success
            } else {
                const error = JSON.parse(result.body);
                console.log(`  ❌ Failed with status ${result.statusCode}`);
                console.log(`  Error: ${error.error?.message || JSON.stringify(error).substring(0, 100)}`);
            }
        } catch (error) {
            console.log(`  ❌ Request failed: ${error.message}`);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

main().catch(console.error);
