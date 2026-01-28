// Admin configuration API for views, mood boards, and room configs
import { put, list, del } from '@vercel/blob';

const CONFIG_PREFIX = 'panafrican-config-';

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    // GET - List all configs or get specific config
    if (request.method === 'GET') {
      const { type, name } = request.query;

      const { blobs } = await list({ prefix: CONFIG_PREFIX });

      if (name) {
        // Get specific config
        const filename = `${CONFIG_PREFIX}${type}-${name}.json`;
        const blob = blobs.find(b => b.pathname === filename);
        if (blob) {
          const configResponse = await fetch(blob.url);
          const config = await configResponse.json();
          return response.status(200).json({ success: true, config });
        }
        return response.status(404).json({ success: false, error: 'Config not found' });
      }

      // List configs by type
      const configs = [];
      for (const blob of blobs) {
        if (!type || blob.pathname.includes(`${CONFIG_PREFIX}${type}-`)) {
          try {
            const configResponse = await fetch(blob.url);
            const config = await configResponse.json();
            configs.push({
              ...config,
              blobUrl: blob.url,
              pathname: blob.pathname
            });
          } catch (e) {
            console.error('Error fetching config:', blob.pathname);
          }
        }
      }

      return response.status(200).json({ success: true, configs });
    }

    // POST - Save config
    if (request.method === 'POST') {
      const { type, name, data, author } = request.body;

      if (!type || !name || !data) {
        return response.status(400).json({ error: 'type, name, and data required' });
      }

      const filename = `${CONFIG_PREFIX}${type}-${name}.json`;

      // Delete old version if exists
      const { blobs } = await list({ prefix: CONFIG_PREFIX });
      const oldConfig = blobs.find(b => b.pathname === filename);
      if (oldConfig) {
        await del(oldConfig.url);
      }

      // Save new config
      const configData = {
        type,
        name,
        data,
        author: author || 'Unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const blob = await put(filename, JSON.stringify(configData), {
        access: 'public',
        contentType: 'application/json'
      });

      return response.status(200).json({
        success: true,
        message: 'Config saved',
        url: blob.url
      });
    }

    // DELETE - Remove config
    if (request.method === 'DELETE') {
      const { type, name } = request.body;

      if (!type || !name) {
        return response.status(400).json({ error: 'type and name required' });
      }

      const filename = `${CONFIG_PREFIX}${type}-${name}.json`;

      const { blobs } = await list({ prefix: CONFIG_PREFIX });
      const blob = blobs.find(b => b.pathname === filename);

      if (blob) {
        await del(blob.url);
        return response.status(200).json({ success: true, message: 'Config deleted' });
      }

      return response.status(404).json({ success: false, error: 'Config not found' });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Config API error:', error);
    return response.status(500).json({ error: error.message });
  }
}
