// Vercel Blob API for persistent layout storage
import { put, list, del } from '@vercel/blob';

const LAYOUT_FILENAME = 'panafrican-library-layout.json';

export default async function handler(request, response) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    if (request.method === 'GET') {
      // List blobs and find the layout file
      const { blobs } = await list();
      const layoutBlob = blobs.find(blob => blob.pathname === LAYOUT_FILENAME);

      if (layoutBlob) {
        // Fetch the actual content
        const layoutResponse = await fetch(layoutBlob.url);
        const layout = await layoutResponse.json();
        return response.status(200).json({ success: true, layout });
      } else {
        return response.status(200).json({ success: true, layout: null });
      }
    }

    if (request.method === 'POST') {
      const layout = request.body;

      // Delete old layout if exists
      const { blobs } = await list();
      const oldLayout = blobs.find(blob => blob.pathname === LAYOUT_FILENAME);
      if (oldLayout) {
        await del(oldLayout.url);
      }

      // Save new layout
      const blob = await put(LAYOUT_FILENAME, JSON.stringify(layout), {
        access: 'public',
        contentType: 'application/json'
      });

      return response.status(200).json({
        success: true,
        message: 'Layout saved successfully',
        url: blob.url
      });
    }

    if (request.method === 'DELETE') {
      const { blobs } = await list();
      const layoutBlob = blobs.find(blob => blob.pathname === LAYOUT_FILENAME);

      if (layoutBlob) {
        await del(layoutBlob.url);
        return response.status(200).json({ success: true, message: 'Layout deleted' });
      }
      return response.status(200).json({ success: true, message: 'No layout to delete' });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Blob API error:', error);
    return response.status(500).json({ error: error.message });
  }
}
