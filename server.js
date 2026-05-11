import express from 'express';
import axios from 'axios';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

const app = express();
app.use(express.json());

// تهيئة خادم MCP
const server = new McpServer({
  name: "Awsal-N8N-Bridge",
  version: "1.0.0"
});

// تعريف الأداة التي سيراها الوكيل
server.tool(
  "trigger_n8n_workflow",
  "استخدم هذه الأداة لإرسال البيانات وتشغيل مسار أتمتة في منصة n8n",
  {
    webhook_url: z.string().url().describe("رابط الـ Webhook الخاص بـ n8n"),
    data_json: z.string().describe("البيانات المطلوبة للإرسال بصيغة JSON")
  },
  async ({ webhook_url, data_json }) => {
    try {
      const parsedData = JSON.parse(data_json);
      const response = await axios.post(webhook_url, parsedData);
      return { content: [{ type: "text", text: `تم الإرسال بنجاح: ${JSON.stringify(response.data)}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `حدث خطأ أثناء الإرسال: ${error.message}` }] };
    }
  }
);

// إعداد الاتصال عبر الويب (SSE) ليتوافق مع الاستضافة
let transport;

app.get('/mcp', async (req, res) => {
  transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('لم يتم الاتصال بعد');
  }
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
