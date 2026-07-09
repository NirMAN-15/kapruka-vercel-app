import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../client/dist');

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(clientDistPath));

const PORT = process.env.PORT || 5000;
const KAPRUKA_MCP_URL = process.env.KAPRUKA_MCP_URL || 'https://mcp.kapruka.com/mcp';

let mcpClient = null;
let isConnecting = false;

// Date formatting helper to ensure YYYY-MM-DD
function formatToYYYYMMDD(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const match = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return dateStr;
}

// Clean Colombo city format (e.g. "Colombo 03 (Colpetty)" -> "Colombo 03")
function cleanCityName(cityStr) {
  if (!cityStr || typeof cityStr !== 'string') return '';
  let cleaned = cityStr.replace(/\s*\([^)]*\)/g, '').trim();
  const match = cleaned.match(/^colombo\s+(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 15) {
      cleaned = `Colombo ${String(num).padStart(2, '0')}`;
    }
  }
  return cleaned;
}

// Normalize order creation payload to match exact MCP schema
function normalizeOrderPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const result = JSON.parse(JSON.stringify(payload));
  
  if (result.recipient) {
    const r = result.recipient;
    if (!r.name && (r.first_name || r.last_name)) {
      r.name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
    }
    delete r.first_name;
    delete r.last_name;
    delete r.email;
  }
  
  if (result.delivery) {
    const d = result.delivery;
    if (!d.address && d.street_address) {
      d.address = d.street_address;
    }
    if (d.city) {
      d.city = cleanCityName(d.city);
    }
    if (!d.date && d.delivery_date) {
      d.date = d.delivery_date;
    }
    if (d.date) {
      d.date = formatToYYYYMMDD(d.date);
    }
    delete d.street_address;
    delete d.delivery_date;
    if (!d.location_type) {
      d.location_type = 'house';
    }
  }
  
  if (result.sender) {
    const s = result.sender;
    if (!s.name && (s.first_name || s.last_name)) {
      s.name = [s.first_name, s.last_name].filter(Boolean).join(' ').trim();
    }
    if (s.anonymous === undefined) {
      s.anonymous = false;
    }
    delete s.first_name;
    delete s.last_name;
    delete s.phone;
    delete s.email;
  }

  if (Array.isArray(result.cart)) {
    result.cart = result.cart.map(item => {
      const newItem = {
        product_id: item.product_id || item.id,
        quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 1
      };
      if (item.icing_text) {
        newItem.icing_text = item.icing_text;
      }
      return newItem;
    });
  }
  
  return result;
}

// Format MCP tool output helper
function formatMcpResponse(result) {
  if (result.isError) {
    throw new Error(result.content?.[0]?.text || 'MCP Tool Call Error');
  }
  
  if (result.structuredContent) {
    return result.structuredContent;
  }
  
  const textContent = result.content?.[0]?.text;
  if (textContent) {
    try {
      return JSON.parse(textContent);
    } catch (e) {
      return { text: textContent };
    }
  }
  
  return result;
}

// Extract and parse products from any MCP response structure
function extractProductsFromResponse(responseData) {
  if (!responseData) return [];

  // Log raw response for debugging
  console.log('[extractProductsFromResponse] Raw data type:', typeof responseData, 
    Array.isArray(responseData) ? 'array' : '',
    typeof responseData === 'object' ? 'keys:' + Object.keys(responseData).slice(0, 8).join(',') : '');

  // If it's an array of product objects directly
  if (Array.isArray(responseData)) {
    return normalizeProductPrices(responseData);
  }

  // If it has a products array
  if (Array.isArray(responseData.products)) {
    return normalizeProductPrices(responseData.products);
  }

  // If it has items array
  if (Array.isArray(responseData.items)) {
    return normalizeProductPrices(responseData.items);
  }

  // If it has data array
  if (Array.isArray(responseData.data)) {
    return normalizeProductPrices(responseData.data);
  }

  // Fallback: parse from text/markdown
  const textContent = responseData.result || responseData.text || (typeof responseData === 'string' ? responseData : '');
  if (textContent) {
    console.log('[extractProductsFromResponse] Falling back to markdown parse. Text preview:', textContent.substring(0, 200));
  }
  return parseProductsFromMarkdown(textContent);
}

// Normalize price fields from MCP JSON product objects (different field names)
function normalizeProductPrices(products) {
  if (!Array.isArray(products)) return [];
  return products.map(p => {
    if (!p || typeof p !== 'object') return p;
    // Try to find real price from various possible field names
    const rawPrice = p.price || p.price_lkr || p.selling_price || p.cost || p.amount || 
                     p.Price || p.LKR || p.lkr_price || p.unit_price;
    let normalizedPrice = null;
    if (typeof rawPrice === 'number' && rawPrice > 0) {
      normalizedPrice = `LKR ${rawPrice.toLocaleString()}`;
    } else if (typeof rawPrice === 'string' && rawPrice.trim()) {
      // Already a string like "LKR 3,500" or "3500"
      const numMatch = rawPrice.match(/[\d,]+/);
      if (numMatch) {
        const num = parseInt(numMatch[0].replace(/,/g, ''), 10);
        if (num > 0) normalizedPrice = `LKR ${num.toLocaleString()}`;
      }
    }
    console.log(`[normalizeProductPrices] Product: "${p.title || p.name}" raw price fields:`, 
      { price: p.price, price_lkr: p.price_lkr, selling_price: p.selling_price }, 
      '→ normalized:', normalizedPrice);
    return {
      ...p,
      title: p.title || p.name || p.product_name || '',
      price: normalizedPrice, // null if not found — frontend shows "Check on Kapruka"
      in_stock: p.in_stock !== undefined ? p.in_stock : (p.stock !== undefined ? p.stock > 0 : true),
      image: p.image || p.image_url || p.thumbnail || p.photo || '',
      url: p.url || p.product_url || p.link || '',
      product_id: p.product_id || p.id || ''
    };
  });
}



// Parser for products from markdown text — handles multiple formats
function parseProductsFromMarkdown(mdText) {
  if (!mdText || typeof mdText !== 'string') return [];

  // Log raw text for debugging
  console.log('[parseProductsFromMarkdown] Parsing text (first 500 chars):', mdText.substring(0, 500));

  const products = [];
  const lines = mdText.split('\n');
  let currentProduct = null;

  const extractPrice = (text) => {
    // Match LKR 6,990 or Rs. 4,200 or RS 990 etc.
    const m = text.match(/\b(?:lkr|rs\.?)\b\s*([\d,]+)/i);
    return m ? `LKR ${m[1]}` : null;
  };

  const isNonProductTitle = (t) => {
    if (!t || t.length < 4) return true;
    if (t.endsWith(':')) return true;
    const lower = t.toLowerCase();
    if (/^(id|url|link|image|price|note|info|stock|category|vendor|availability|status|search)$/i.test(t)) return true;
    if (/(shipping|estimated|tracking|shipment|local delivery|insurance|vendor|weight|dimension|colour|color|size|material|brand|sku|barcode|specification|detail|benefit|warning|caution|search results|kapruka search|direct search|කප්රුක සෙවුම|සෙවුම|here are|oyage|ඔබගේ)/i.test(lower)) return true;
    return false;
  };

  const saveCurrentProduct = () => {
    if (!currentProduct) return;
    if (currentProduct.url && !currentProduct.product_id) {
      const idFromUrl = currentProduct.url.match(/\/kid\/([^/]+)/i) || currentProduct.url.match(/\/([^/]+)$/);
      if (idFromUrl) currentProduct.product_id = idFromUrl[1].toUpperCase();
    }
    // Only save if it has at least one identifying/descriptive property (price, product_id, image, or url)
    if (currentProduct.price || currentProduct.product_id || currentProduct.image || currentProduct.url) {
      products.push(currentProduct);
    }
    currentProduct = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // FORMAT 1: "1. Title - LKR 6,990" or "1. **Title** - LKR 6,990"
    const numberedMatch = line.match(/^\d+\.\s+\*?\*?([^*\n]+?)\*?\*?\s*[-–]\s*(?:lkr|rs\.?)\s*([\d,]+)/i);
    if (numberedMatch) {
      saveCurrentProduct();
      const title = numberedMatch[1].trim().replace(/\*\*/g, '');
      const priceVal = numberedMatch[2];
      if (!isNonProductTitle(title)) {
        currentProduct = { title, price: `LKR ${priceVal}`, in_stock: true, image: '', product_id: '', url: '' };
        continue;
      }
    }

    // FORMAT 2: "**Title**" possibly with price inline
    const boldMatch = line.match(/^\s*[-*\d.]*\s*\*\*([^*]+)\*\*/);
    if (boldMatch) {
      const candidateTitle = boldMatch[1].trim();
      if (!isNonProductTitle(candidateTitle)) {
        saveCurrentProduct();
        const inlinePrice = extractPrice(line);
        currentProduct = { title: candidateTitle, price: inlinePrice, in_stock: true, image: '', product_id: '', url: '' };
        continue;
      }
    }

    // FORMAT 3: "- Title - LKR X" or "- Title: LKR X"
    const dashTitlePrice = line.match(/^[-*]\s+(.+?)\s*[-:]\s*(?:lkr|rs\.?)\s*([\d,]+)/i);
    if (dashTitlePrice) {
      const candidateTitle = dashTitlePrice[1].trim().replace(/\*\*/g, '');
      if (!isNonProductTitle(candidateTitle)) {
        saveCurrentProduct();
        currentProduct = { title: candidateTitle, price: `LKR ${dashTitlePrice[2]}`, in_stock: true, image: '', product_id: '', url: '' };
        continue;
      }
    }

    // FORMAT 4: "## Title" or "### Title" (Markdown Headings)
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      const candidateTitle = headingMatch[1].trim().replace(/\*\*/g, '');
      if (!isNonProductTitle(candidateTitle)) {
        saveCurrentProduct();
        currentProduct = { title: candidateTitle, price: null, in_stock: true, image: '', product_id: '', url: '' };
        continue;
      }
    }

    // Fields under current product
    if (currentProduct) {
      const idMatch = line.match(/(?:ID|Product ID):\s*`?([^`\s]+)`?/i);
      if (idMatch) currentProduct.product_id = idMatch[1].trim();

      if (!currentProduct.price) {
        const priceVal = extractPrice(line);
        if (priceVal) currentProduct.price = priceVal;
      }

      if (line.toLowerCase().includes('out of stock') || line.toLowerCase().includes('unavailable')) {
        currentProduct.in_stock = false;
      }

      const imgMatch = line.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/i);
      if (imgMatch) currentProduct.image = imgMatch[1].trim();

      const imgTextMatch = line.match(/(?:\*\*?)*(?:Image|Thumbnail|Photo|Img|Picture)(?:\*\*?)*:\s*(?:\*\*?)*(https?:\/\/[^\s*)]+)/i);
      if (imgTextMatch) currentProduct.image = imgTextMatch[1].trim();

      const urlMatch = line.match(/(?:^|[^!])\[.*?\]\((https?:\/\/[^)]+)\)/i);
      if (urlMatch) {
        currentProduct.url = urlMatch[1].trim();
      } else if (!line.includes('![') && !currentProduct.url) {
        const fallbackUrlMatch = line.match(/\((https?:\/\/[^)]+)\)/i);
        if (fallbackUrlMatch) currentProduct.url = fallbackUrlMatch[1].trim();
      }
    }
  }

  saveCurrentProduct();

  return products.map(p => {
    if (!p.image) {
      p.image = '';
    }
    return p;
  });
}

const productDetailsCache = new Map();

// Enrich products by fetching details (e.g. real image URLs) using kapruka_get_product tool
async function enrichProductsWithDetails(products) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return products || [];
  }
  if (!mcpClient) {
    console.warn('Cannot enrich products: MCP client not connected');
    return products;
  }
  
  try {
    const enriched = [];
    for (const p of products) {
      if (!p.product_id) {
        enriched.push(p);
        continue;
      }

      // Skip enrichment if we already have a real Kapruka image and URL
      // (Do not treat the broken /spicific/ or /specific/ fallback placeholder as a real image)
      const hasRealImage = p.image && 
                           !p.image.includes('images.unsplash.com') && 
                           !p.image.includes('spicific') && 
                           !p.image.includes('specific');
      const hasRealUrl = p.url && p.url.includes('kapruka.com');
      if (hasRealImage && hasRealUrl) {
        enriched.push(p);
        continue;
      }

      // Check cache first
      if (productDetailsCache.has(p.product_id)) {
        const cached = productDetailsCache.get(p.product_id);
        enriched.push({ ...p, ...cached });
        continue;
      }
      
      try {
        let gotValidImage = false;
        let finalImage = '';
        let detailProduct = null;

        try {
          const result = await mcpClient.callTool({
            name: 'kapruka_get_product',
            arguments: { params: { product_id: p.product_id } }
          });
          const details = formatMcpResponse(result);
          const parsedDetails = extractProductsFromResponse(details);
          if (parsedDetails && parsedDetails.length > 0) {
            detailProduct = parsedDetails[0];
            if (detailProduct.image && typeof detailProduct.image === 'string' && detailProduct.image.trim()) {
              finalImage = detailProduct.image;
              gotValidImage = true;
            }
          }
        } catch (e) {
          console.error(`Failed to enrich product details for ${p.product_id}:`, e.message);
        }

        if (!gotValidImage) {
          const pid = p.product_id.toLowerCase();
          finalImage = `https://www.kapruka.com/spicific/${pid}/0_${pid}.jpg`;
        }

        const enrichedInfo = {
          image: finalImage,
          price: detailProduct?.price || p.price,
          in_stock: detailProduct?.in_stock !== undefined ? detailProduct.in_stock : p.in_stock,
          url: detailProduct?.url || p.url
        };

        // Cache the enriched info
        productDetailsCache.set(p.product_id, enrichedInfo);

        enriched.push({
          ...p,
          ...enrichedInfo
        });
      } catch (e) {
        console.error(`Failed to enrich product details for ${p.product_id}:`, e.message);
        enriched.push(p);
      }
    }
    return enriched;
  } catch (err) {
    console.error('Error in enrichProductsWithDetails:', err.message);
    return products;
  }
}

// Connect to the remote Kapruka MCP server

let connectionError = null;

async function connectToMcp() {
  if (isConnecting) return;
  isConnecting = true;
  connectionError = null;
  
  try {
    console.log('Connecting to Kapruka MCP Server...');
    const transport = new StreamableHTTPClientTransport(new URL(KAPRUKA_MCP_URL));

    const client = new Client({
      name: 'kapruka-api-bridge',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    console.log('Successfully connected to Kapruka MCP Server');
    mcpClient = client;
    connectionError = null;

    transport.onclose = () => {
      console.warn('MCP connection closed. Attempting reconnect in 5 seconds...');
      mcpClient = null;
      setTimeout(connectToMcp, 5000);
    };

    transport.onerror = (err) => {
      console.error('MCP transport error:', err.message || err);
      connectionError = err.message || String(err);
      mcpClient = null;
      setTimeout(connectToMcp, 5000);
    };

  } catch (error) {
    console.error('Failed to establish MCP connection:', error.message);
    connectionError = error.message;
    mcpClient = null;
    console.log('Retrying MCP connection in 5 seconds...');
    setTimeout(connectToMcp, 5000);
  } finally {
    isConnecting = false;
  }
}

// Initial connection
connectToMcp();

// Middleware to verify MCP connection (waits on-demand for cold serverless starts)
const ensureMcpConnected = async (req, res, next) => {
  if (mcpClient) {
    return next();
  }

  console.log('MCP client not connected. Attempting connection now...');
  if (!isConnecting) {
    connectToMcp();
  }

  // Poll for connection up to 5 seconds
  let attempts = 0;
  while (!mcpClient && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }

  if (!mcpClient) {
    return res.status(503).json({ 
      error: `Kapruka MCP bridge is currently disconnected. Reason: ${connectionError || 'Connecting to remote server...'}` 
    });
  }
  next();
};

// --- API Endpoints ---

// 1. Search products
app.get('/api/search', ensureMcpConnected, async (req, res) => {
  try {
    const { q, category, min_price, max_price, in_stock_only, sort, limit, cursor, currency } = req.query;
    
    const args = {};
    if (q) args.q = String(q);
    if (category) args.category = String(category);
    if (min_price) args.min_price = Number(min_price);
    if (max_price) args.max_price = Number(max_price);
    if (in_stock_only) args.in_stock_only = in_stock_only === 'true';
    if (sort) args.sort = String(sort);
    if (limit) args.limit = Number(limit);
    if (cursor) args.cursor = String(cursor);
    if (currency) args.currency = String(currency);

    console.log('Calling kapruka_search_products with:', args);
    const result = await mcpClient.callTool({
      name: 'kapruka_search_products',
      arguments: { params: args }
    });

    const responseData = formatMcpResponse(result);
    const parsed = extractProductsFromResponse(responseData);
    const enriched = await enrichProductsWithDetails(parsed);

    res.json({
      ...responseData,
      products: enriched
    });
  } catch (error) {
    console.error('Error in /api/search:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 1b. List Categories (Bonus discovery endpoint)
app.get('/api/categories', ensureMcpConnected, async (req, res) => {
  try {
    const { depth } = req.query;
    const args = {};
    if (depth) args.depth = Number(depth);

    console.log('Calling kapruka_list_categories with:', args);
    const result = await mcpClient.callTool({
      name: 'kapruka_list_categories',
      arguments: { params: args }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error('Error in /api/categories:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. Get product details
app.get('/api/product/:id', ensureMcpConnected, async (req, res) => {
  try {
    const { id } = req.params;
    const { currency } = req.query;
    
    const args = { product_id: String(id) };
    if (currency) args.currency = String(currency);

    console.log('Calling kapruka_get_product with:', args);
    const result = await mcpClient.callTool({
      name: 'kapruka_get_product',
      arguments: { params: args }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error(`Error in /api/product/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. List delivery cities (autocomplete)
app.get('/api/cities', ensureMcpConnected, async (req, res) => {
  try {
    const { query, limit } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const args = { query: String(query) };
    if (limit) args.limit = Number(limit);

    console.log('Calling kapruka_list_delivery_cities with:', args);
    const result = await mcpClient.callTool({
      name: 'kapruka_list_delivery_cities',
      arguments: { params: args }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error('Error in /api/cities:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. Check delivery options and rates
app.get('/api/delivery', ensureMcpConnected, async (req, res) => {
  try {
    const { city, delivery_date, product_id } = req.query;
    if (!city || !delivery_date) {
      return res.status(400).json({ error: 'city and delivery_date parameters are required' });
    }
    
    const args = {
      city: cleanCityName(String(city)),
      delivery_date: formatToYYYYMMDD(String(delivery_date))
    };
    if (product_id) args.product_id = String(product_id);

    console.log('Calling kapruka_check_delivery with:', args);
    const result = await mcpClient.callTool({
      name: 'kapruka_check_delivery',
      arguments: { params: args }
    });

    const formatted = formatMcpResponse(result);
    
    // ===== LOG FULL RAW RESPONSE =====
    console.log('[DeliveryAPI] Full raw MCP result:', JSON.stringify(result).substring(0, 1000));
    console.log('[DeliveryAPI] Formatted response:', JSON.stringify(formatted).substring(0, 600));

    // Try to extract fee from structured fields first
    let fee = null;
    const tryFeeFields = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      const f = obj.fee ?? obj.delivery_fee ?? obj.rate ?? obj.shipping_fee ?? 
                obj.cost ?? obj.charge ?? obj.amount ?? obj.delivery_cost;
      if (typeof f === 'number' && f > 0) return f;
      if (typeof f === 'string') {
        const n = parseFloat(f.replace(/[^0-9.]/g, ''));
        if (n > 0) return n;
      }
      return null;
    };

    fee = tryFeeFields(formatted) ?? tryFeeFields(formatted.delivery) ?? tryFeeFields(formatted.data);

    // If no structured fee, parse from text
    if (!fee) {
      const text = formatted.result || formatted.text || '';
      console.log('[DeliveryAPI] Parsing fee from text:', text.substring(0, 400));
      
      // Try specific delivery fee patterns first (avoid matching product prices)
      const patterns = [
        /delivery\s*(?:fee|charge|cost|rate)\s*[:\-]?\s*(?:lkr|rs\.?)?\s*([\d,]+)/i,
        /(?:fee|charge|rate)\s*[:\-]\s*(?:lkr|rs\.?)?\s*([\d,]+)/i,
        /(?:lkr|rs\.?)\s*([\d,]+)/i,
      ];
      for (const pat of patterns) {
        const m = text.match(pat);
        if (m) {
          const n = parseFloat(m[1].replace(/,/g, ''));
          if (n > 0 && n < 50000) { fee = n; break; }
        }
      }
    }

    console.log('[DeliveryAPI] Final extracted fee:', fee);

    // Send both the raw formatted response AND the extracted fee
    res.json({ ...formatted, extracted_fee: fee });
  } catch (error) {
    console.error('Error in /api/delivery:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// 5. Create checkout order
app.post('/api/order', ensureMcpConnected, async (req, res) => {
  try {
    const normalizedBody = normalizeOrderPayload(req.body);
    const { cart, recipient, delivery, sender, gift_message, currency } = normalizedBody;
    
    if (!cart || !recipient || !delivery || !sender) {
      return res.status(400).json({ 
        error: 'Missing required parameters in request body. Required fields: cart, recipient, delivery, sender' 
      });
    }

    const args = {
      cart,
      recipient,
      delivery,
      sender
    };
    if (gift_message) args.gift_message = String(gift_message);
    if (currency) args.currency = String(currency);

    console.log('Calling kapruka_create_order — items:', args.cart?.length, 'city:', args.delivery?.city);
    const result = await mcpClient.callTool({
      name: 'kapruka_create_order',
      arguments: { params: args }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error('Error in /api/order:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 6. Track existing order
app.get('/api/track', ensureMcpConnected, async (req, res) => {
  try {
    const { order_number } = req.query;
    if (!order_number) {
      return res.status(400).json({ error: 'order_number parameter is required' });
    }

    console.log('Calling kapruka_track_order with:', order_number);
    const result = await mcpClient.callTool({
      name: 'kapruka_track_order',
      arguments: { params: { order_number: String(order_number) } }
    });

    res.json(formatMcpResponse(result));
  } catch (error) {
    console.error('Error in /api/track:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 7. General connection health status
app.get('/api/status', ensureMcpConnected, (req, res) => {
  res.json({
    connected: !!mcpClient,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 8. Debug logs endpoint
app.get('/api/debug-logs', (req, res) => {
  res.json(debugLogs);
});

// --- LLM Orchestration & Agent Loop ---

const SYSTEM_PROMPT = `You are Kapruka AI, a friendly, warm and smart Sri Lankan shopping assistant for Kapruka.com.

CRITICAL RULES FOR RESPONDING (FOLLOW EXACTLY):
1. CHAT STYLE: Write like a friendly, casual person sending a chat message to a friend. 
   - NEVER use markdown in your replies. NO bold asterisks (**), NO hash headings (#), NO bullet/dash lists (- or *), NO tables.
   - Keep sentences short, warm, natural, and helpful.
   - DO NOT repeat product names, prices, or details in your text. The UI automatically displays the matching product cards right below your message!
   - Bad text response: "Found these: 1. Chocolate cake - LKR 3500..."
   - Good text response: "I found some yummy chocolate cakes for you! Check them out below and let me know if you like any of them."

2. LANGUAGE SYNC & CASUAL TONE:
   - If the user writes in English, reply in casual English.
     Example: "I found some nice flower bouquets for your friend. Take a look below!"
   - If the user writes in Sinhala script, reply in natural, casual, correct Sinhala.
     Example: "යාලුවට දෙන්න ලස්සන මල් කළඹවල් කිහිපයක් මම හෙව්වා. පහළ තියෙන ඒව බලන්න!"
   - If the user writes in Singlish / Tanglish (Sinhala using English/Latin alphabet letters like: mata, oni, denna, epa, yaluwekta, kenk, hoyala denna, adu gananata), ALWAYS reply in Sinhala script mixed with English words. DO NOT reply in Latin letters/Singlish.
     Example: "ඔයාට ගැලපෙන Cake options කිහිපයක් මෙන්න. ඔයාට කැමති item එක Cart එකට එකතු කරන්න පුළුවන්!"

3. UNDERSTANDING INTENT & HANDLING EXCLUSIONS (CRITICAL):
   - Pay attention to negation words like "epa" (Sinhala/Tanglish for "do not want"), "nathuwa" (without), "no", "dont want".
   - Example: "mata yaluwekta birthday gift ekkak oni , choclates, cakes epa"
     - This means they want a gift for their friend, but NOT chocolates and NOT cakes.
     - You MUST call kapruka_search_products for alternative categories like "flower" or "toy" or "hamper".
     - Never recommend or search for negated/excluded items!
   - **IMMEDIATE SEARCH FOR CLEAR CATEGORIES (CRITICAL)**: If the user mentions any known category or product keyword (e.g., cake, flower, chocolate, watch, toy, basket, perfume, etc.), you MUST immediately call `kapruka_search_products` with that keyword (e.g. `q: "cake"`). 
     - **NEVER ASK FOR LISTS OF QUESTIONS**: Do NOT respond with a long list-based questionnaire (e.g., asking for flavor, size, price range, city, etc.) before calling the search tool. Always search the Kapruka catalog first and display products immediately, then ask simple, single-question follow-ups if necessary.
     - **KAPRUKA-ONLY CATALOG POLICY**: All options and search results must come strictly from Kapruka's catalog via tools. Never suggest sourcing items from other external shops, bakeries, or other online sites.
   - Chat like a real human! If you cannot get the user's idea or if the request is completely ambiguous/vague (e.g. "මට ඕනි 5000ට අඩුවෙන්" without specifying what item, or "yaluwekta denna gift ekak oni" without specifying a category), ask a polite, friendly clarification question in the user's language (Sinhala script, or Sinhala script mixed with English if they ask in Singlish, or English if they ask in English) to understand exactly what they need:
     * English: "Sure! What kind of product or gift are you looking for? I can search for cakes, flowers, chocolates, watches, and more!"
     * Singlish/Tanglish: "Sure! ඔයා මොන වගේ product එකක්ද හොයන්නේ? මට cakes, flowers, chocolates, watches වගේ දේවල් search කරන්න පුළුවන්!"
     * Sinhala: "ඔබ සොයන්නේ කුමන ආකාරයේ භාණ්ඩයක්ද? මට කේක්, මල්, චොකලට්, ඔරලෝසු වැනි දේවල් සොයා දිය හැකියි!"

4. SEARCH & PRODUCT DETAILS:
   - Always call kapruka_search_products to find items. Do not guess or output placeholders.
   - Translate all Tanglish/Sinhala keywords to English before calling tools:
     * "mal" -> "flowers"
     * "ceyk/keki" -> "cake"
     * "perse" -> "purse" / "wallet"
     * "oralosuwak / oralosuwa / ඔරලෝසුව / ඔරලෝසුවක්" -> "watch" (wrist watch or clock). IMPORTANT: The Sinhala word "oralosuwak" means "watch" (wrist watch). It has absolutely nothing to do with "oral care" or "mouth hygiene"! NEVER search for oral care products (like toothbrushes or flossers) when the user asks for a watch.
     * "kenek / kenekta / kenkt" -> "person/someone" (e.g. "boy kenkt" means "for a boy"). It is NOT a cake!
   - When a user asks for more information about a product, call kapruka_get_product. Write a short 1-2 sentence friendly summary (e.g., flavor, size, who it is good for). Do NOT output technical bullet points.

5. SINHALA SCRIPT SPELLING & GRAMMAR ACCURACY:
   - Ensure you use correct Sinhala spelling and natural grammar. Do NOT output machine-translated words or broken suffixes (e.g. "වෙන්වලා", "කෙස්ව", "සඳහන් කරන්නෙන්නෙන්න", "කේක් සාලා").
   - Use correct Sinhala characters:
     * Use "ප්‍රමාණය" (NOT "ප්රමාණය")
     * Use "අවශ්‍යතා" (NOT "අවශ්යතා")
     * Use "දිස්ත්‍රික්කය" (NOT "දිස්ත්රික්කය")
     * Use "නගරය" / "පළාත" for delivery locations.

6. SINGLISH TO ENGLISH E-COMMERCE MAPPING REFERENCE (TRAINING DATA):
   - "mata oni / hoyala denna" -> "I want / please find for me" (Start search)
   - "penna / thiyenawada / hoyanna" -> "Show me / is it available? / search"
   - "pirimi lamayek / kolla ekata / purusha ekata" -> "For a boy / young male / man" (Filter by male gender)
   - "gani lamayek / kella ekata / amma ekata / thaththata / yaluwata" -> "For a girl / female / mother / father / friend"
   - "adu gananata / budget eka / range eka" -> "Cheaper / budget range filter"
   - "wediya gaana" -> "Too expensive"
   - "discount/offer thiyenawada" -> "Is there a discount/deal?"
   - "order karanna / confirm karanna / gannawa meeka" -> "Place or confirm order"
   - "cart ekata danna / danna / add karanna" -> "Add to cart"
   - "cancel karanna / change karanna / ain karanna" -> "Cancel / modify / remove item"
   - "delivery/shipping charge kiyada" -> "How much is the delivery rate?"
   - "free delivery thiyenawada" -> "Is delivery free?"
   - "damage wela awa / kelinma naha" -> "Arrived damaged / broken (complaint)"
   - "urgent ekak" -> "Urgent delivery request"

7. ERROR HANDLING POLICY:
   - If a tool fails or throws an error, apologize gracefully. DO NOT mention developer logs, JSON keys, thought signatures, or backend errors to the user.
   - Friendly error example: "Oops, I'm having trouble retrieving the products right now. Let me try again in a moment."`;


const CLAUDE_TOOLS = [
  {
    name: "kapruka_list_categories",
    description: "Retrieve the hierarchical list of categories from Kapruka's catalog.",
    input_schema: {
      type: "object",
      properties: {
        depth: { type: "integer", description: "The depth of category hierarchy to retrieve." }
      }
    }
  },
  {
    name: "kapruka_search_products",
    description: "Search the product catalog with keyword search and fine-grained filters.",
    input_schema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query/keyword (e.g., 'chocolate cake')." },
        category: { type: "string", description: "Specific category name to restrict the search." },
        min_price: { type: "number", description: "Minimum price threshold in LKR." },
        max_price: { type: "number", description: "Maximum price threshold in LKR." },
        in_stock_only: { type: "boolean", description: "Filter out out-of-stock items if set to true." },
        sort: { type: "string", description: "Sorting option. Must be one of: 'bestseller', 'newest', 'price_asc', 'price_desc', 'relevance'." },
        limit: { type: "integer", description: "Number of results (pagination limit)." },
        currency: { type: "string", description: "Currency (e.g., 'LKR', 'USD')." }
      }
    }
  },
  {
    name: "kapruka_get_product",
    description: "Retrieve detailed information about a specific product including name, price, stock, description, and images.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "Unique ID of the product." },
        currency: { type: "string", description: "Price currency (e.g., 'LKR', 'USD')." }
      },
      required: ["product_id"]
    }
  },
  {
    name: "kapruka_list_delivery_cities",
    description: "Search for a canonical Sri Lankan delivery city/suburb by query.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for city name (e.g., 'Colombo', 'Kandy')." },
        limit: { type: "integer", description: "Maximum number of results to return." }
      },
      required: ["query"]
    }
  },
  {
    name: "kapruka_check_delivery",
    description: "Verify delivery availability, fee, and constraints for a city and date.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Canonical city name (retrieved from kapruka_list_delivery_cities)." },
        delivery_date: { type: "string", description: "Target delivery date in YYYY-MM-DD format." },
        product_id: { type: "string", description: "Optional product ID to check restrictions." }
      },
      required: ["city", "delivery_date"]
    }
  },
  {
    name: "kapruka_create_order",
    description: "Create a guest-checkout order on Kapruka and return a click-to-pay link.",
    input_schema: {
      type: "object",
      properties: {
        cart: {
          type: "array",
          description: "1-30 items.",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string", description: "Kapruka product ID (e.g. 'cake00ka002034')." },
              quantity: { type: "integer", description: "Quantity (1–99)." },
              icing_text: { type: "string", description: "Cake icing text. Silently ignored for non-cake products." }
            },
            required: ["product_id"]
          }
        },
        recipient: {
          type: "object",
          description: "Recipient's contact details.",
          properties: {
            name: { type: "string", description: "Recipient name shown on the order." },
            phone: { type: "string", description: "Recipient phone — E.164 (+9477…) or local SL (077…) format." }
          },
          required: ["name", "phone"]
        },
        delivery: {
          type: "object",
          description: "Delivery address details.",
          properties: {
            address: { type: "string", description: "Street address." },
            city: { type: "string", description: "Canonical city name." },
            location_type: { type: "string", description: "One of: house, apartment, office, other." },
            date: { type: "string", description: "Delivery date in YYYY-MM-DD (Asia/Colombo). Must be today or future." },
            instructions: { type: "string", description: "Free-form delivery instructions." }
          },
          required: ["address", "city", "date"]
        },
        sender: {
          type: "object",
          description: "Sender's billing contact details.",
          properties: {
            name: { type: "string", description: "Sender name on the gift card." },
            anonymous: { type: "boolean", description: "If true, gift card shows 'Anonymous' instead of the sender name." }
          },
          required: ["name"]
        },
        gift_message: { type: "string", description: "Optional personalized text message for greeting card." },
        currency: { type: "string", description: "Price currency (default: 'LKR')." }
      },
      required: ["cart", "recipient", "delivery", "sender"]
    }
  },
  {
    name: "kapruka_track_order",
    description: "Retrieve live status and tracking events for a placed order.",
    input_schema: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "The Kapruka order number." }
      },
      required: ["order_number"]
    }
  }
];

// Mock Agent logic for fallback
async function handleMockAgent(messages, clientLang) {
  // Get last user message
  const userMsgs = messages.filter(m => m.sender === 'user' || m.role === 'user');
  if (userMsgs.length === 0) {
    return { text: "Ayu Bowan! I am your Kapruka AI Shopping Assistant. How can I help you today?" };
  }
  const lastMsg = userMsgs[userMsgs.length - 1];
  const query = (lastMsg.text || lastMsg.content || '').toLowerCase();

  // Detect language
  let isSinhala = /[\u0d80-\u0dff]/.test(query);
  let isTanglish = query.includes('ona') || query.includes('hoyala') || query.includes('denna') || query.includes('mata') || query.includes('thiyenada') || query.includes('mewa') || query.includes('hoyanna') || query.includes('ekak');

  let language = clientLang || 'en';
  if (!clientLang) {
    if (isSinhala) language = 'si';
    else if (isTanglish) language = 'tanglish';
  }

  // Helper function to extract city names from markdown
  const extractCities = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.cities && Array.isArray(data.cities)) return data.cities;
    const mdText = data.result || data.text || (typeof data === 'string' ? data : '');
    if (!mdText) return [];
    const matches = [...mdText.matchAll(/-\s+\*\*([^*]+)\*\*/g)];
    return matches.map(m => m[1].trim());
  };

  // Determine search keyword with negation/exclusion rules
  const checkNegation = (term) => {
    const idx = query.indexOf(term);
    if (idx === -1) return false;
    
    const substringAfter = query.substring(idx + term.length, idx + term.length + 20);
    const substringBefore = query.substring(Math.max(0, idx - 20), idx);
    
    if (substringAfter.includes('epa') || substringAfter.includes('nathuwa') || substringAfter.includes('need not') || substringAfter.includes('dont') || substringAfter.includes('dont want') || substringAfter.includes('not want')) {
      return true;
    }
    if (substringBefore.includes('no ') || substringBefore.includes('dont want') || substringBefore.includes('without') || substringBefore.includes('nathuwa')) {
      return true;
    }
    return false;
  };

  let keyword = null;
  const categories = [
    { name: 'Cake', terms: ['cake', 'keki', 'keik', 'කේක්'] },
    { name: 'Flowers', terms: ['flower', 'mal', 'මල්', 'pokurak'] },
    { name: 'Chocolate', terms: ['chocolate', 'choc', 'චොකලට්'] },
    { name: 'Toy', terms: ['toy', 'teddy', 'doll', 'බෝනික්කා', 'saththu'] },
    { name: 'Hamper', terms: ['hamper', 'gift', 'තෑගි'] },
    { name: 'Watch', terms: ['watch', 'oralosu', 'ඔරලෝසු', 'orlosu', 'ඔරලෝසුවක්'] },
    { name: 'Purse', terms: ['purse', 'perse', 'wallet', 'පර්ස්', 'ලෙදර්'] }
  ];

  const mentioned = [];
  const negatedKeywords = [];
  for (const cat of categories) {
    for (const term of cat.terms) {
      if (query.includes(term)) {
        if (checkNegation(term)) {
          negatedKeywords.push(cat.name);
        } else {
          mentioned.push(cat.name);
        }
        break;
      }
    }
  }

  const finalCandidates = mentioned.filter(c => !negatedKeywords.includes(c));
  if (finalCandidates.length > 0) {
    keyword = finalCandidates[0];
  } else if (query.includes('gift') || query.includes('yaluwekta') || query.includes('friend') || query.includes('තෑගි')) {
    if (!negatedKeywords.includes('Hamper')) {
      keyword = 'Hamper';
    } else if (!negatedKeywords.includes('Flowers')) {
      keyword = 'Flowers';
    }
  }

  // Detect delivery rate check intent (deliver to, kandy, galle, delivery rate)
  const isDeliveryCheck = query.includes('deliver to') || 
                          query.includes('delivery to') || 
                          query.includes('delivery rate') || 
                          query.includes('delivery fee') || 
                          query.includes('shipping cost') || 
                          query.includes('shipping fee') || 
                          query.includes('galle') || 
                          query.includes('kandy') || 
                          query.includes('jaffna') || 
                          query.includes('negombo') || 
                          query.includes('matara') || 
                          query.includes('kurunegala') || 
                          query.includes('gampaha');

  if (isDeliveryCheck) {
    if (!mcpClient) {
      return { text: "The Kapruka MCP connection is offline. Please try again shortly." };
    }
    
    // Attempt to parse city
    let cityInput = null;
    const citiesToMatch = ['colombo', 'kandy', 'galle', 'jaffna', 'negombo', 'matara', 'kurunegala', 'gampaha', 'batticaloa', 'kalutara'];
    for (const c of citiesToMatch) {
      if (query.includes(c)) {
        cityInput = c;
        break;
      }
    }
    if (!cityInput) {
      const deliverMatch = query.match(/(?:deliver|delivery)\s+to\s+([a-zA-Z0-9\s]+)/i);
      if (deliverMatch) {
        cityInput = deliverMatch[1].trim();
      }
    }
    
    if (!cityInput) {
      return { text: "Sure, I can check delivery rates for you! Please tell me which city you want to deliver to." };
    }
    
    try {
      // Step 1: list delivery cities
      const listResult = await mcpClient.callTool({
        name: 'kapruka_list_delivery_cities',
        arguments: { params: { query: cityInput, limit: 1 } }
      });
      const listData = formatMcpResponse(listResult);
      const citiesList = extractCities(listData);
      const canonicalCity = citiesList[0] || cityInput;
      
      // Step 2: Check delivery
      const targetDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]; // 2 days from now
      const checkResult = await mcpClient.callTool({
        name: 'kapruka_check_delivery',
        arguments: { params: { city: canonicalCity, delivery_date: targetDate } }
      });
      const checkData = formatMcpResponse(checkResult);
      const rateText = checkData.result || checkData.text || JSON.stringify(checkData);
      
      let responseText = '';
      if (language === 'si') {
        responseText = `${canonicalCity} සඳහා බෙදා හැරීමේ විස්තර මෙන්න:\n\n${rateText}`;
      } else if (language === 'tanglish') {
        responseText = `${canonicalCity} වලට delivery details methana thiyenawa:\n\n${rateText}`;
      } else {
        responseText = `Here are the delivery details and rates for ${canonicalCity}:\n\n${rateText}`;
      }
      return { text: responseText };
    } catch (e) {
      return { text: `Error checking delivery: ${e.message}` };
    }
  }

  // Track order intent (track, order status, order number, ORD-, VIMP-)
  const orderMatch = query.match(/(vimp-?[a-z0-9-]*\d[a-z0-9-]*|ord-?[a-z0-9-]*\d[a-z0-9-]*)/i) || query.match(/(?:track|status|order|order_number|ඇණවුම|#)\s*#?([a-z0-9-]*\d[a-z0-9-]*)/i) || query.match(/#?(\d+)/);
  const isTracking = query.includes('track') || 
                     query.includes('status') || 
                     query.includes('order number') || 
                     query.includes('order status') || 
                     query.includes('mago') || 
                     query.includes('koheda') || 
                     query.includes('kohe') || 
                     query.includes('ඇණවුම') ||
                     /(vimp-?[a-z0-9-]*\d[a-z0-9-]*|ord-?[a-z0-9-]*\d[a-z0-9-]*)/i.test(query);

  if (isTracking) {
    const orderNumber = orderMatch ? orderMatch[1] : null;
    if (!orderNumber) {
      return { text: "Sure, I can track your order status! Please provide your order number (e.g., 55102, ORD-1234, or VIMP-9876)." };
    }
    if (!mcpClient) {
      return { text: "The Kapruka MCP connection is offline. Please try again shortly." };
    }
    try {
      const result = await mcpClient.callTool({
        name: 'kapruka_track_order',
        arguments: { params: { order_number: String(orderNumber) } }
      });
      const data = formatMcpResponse(result);
      const resultText = data.result || data.text || (typeof data === 'string' ? data : '');
      
      let status = 'Received';
      if (resultText.toLowerCase().includes('delivered')) status = 'Delivered';
      else if (resultText.toLowerCase().includes('transit')) status = 'Transit';
      else if (resultText.toLowerCase().includes('dispatch')) status = 'Dispatch';
      else if (resultText.toLowerCase().includes('confirmed')) status = 'Confirmed';
      else if (resultText.toLowerCase().includes('received')) status = 'Received';
      else if (data.status) status = data.status;
      
      const steps = ['Received', 'Confirmed', 'Dispatch', 'Transit', 'Delivered'];
      const currentIndex = steps.findIndex(s => s.toLowerCase() === status.toLowerCase());
      
      let timelineMd = '\n\n**Order Tracking Timeline:**\n';
      steps.forEach((step, index) => {
        const isCompleted = index <= currentIndex;
        const bullet = isCompleted ? '✅' : '⚪';
        timelineMd += `${bullet} **${step}**\n`;
      });

      let responseText = '';
      if (language === 'si') {
        responseText = `ඔබගේ ඇණවුම #${orderNumber} පිළිබඳ විස්තර මෙන්න:\n` +
          `**තත්ත්වය:** ${status}\n` +
          timelineMd + `\n` +
          (resultText ? `**සටහන:** ${resultText}` : '');
      } else if (language === 'tanglish') {
        responseText = `ඔයාගේ order #${orderNumber} එකේ details මෙන්න:\n` +
          `**Status:** ${status}\n` +
          timelineMd + `\n` +
          (resultText ? `**Note:** ${resultText}` : '');
      } else {
        responseText = `Here is the tracking information for Order #${orderNumber}:\n` +
          `**Current Status:** ${status}\n` +
          timelineMd + `\n` +
          (resultText ? `**Details:** ${resultText}` : '');
      }
      return { text: responseText };
    } catch (e) {
      return { text: `Error tracking order: ${e.message}` };
    }
  }

  // If search intent detected
  if (keyword) {
    if (!mcpClient) {
      return { text: "The Kapruka MCP connection is offline. Please try again shortly." };
    }
    try {
      const result = await mcpClient.callTool({
        name: 'kapruka_search_products',
        arguments: { params: { q: keyword, limit: 4 } }
      });
      const data = formatMcpResponse(result);
      const products = extractProductsFromResponse(data);
      const enriched = await enrichProductsWithDetails(products);

      let responseText = '';
      if (language === 'si') {
        responseText = `Ayu Bowan! ඔයාගේ සෙවුමට ගැලපෙන හොඳම ${keyword} නිෂ්පාදන කිහිපයක් මෙන්න. ඔයාට කැමති නිෂ්පාදනයක් තෝරාගෙන Cart එකට එකතු කරන්න පුළුවන්!`;
      } else if (language === 'tanglish') {
        responseText = `ආයුබෝවන්! 🇱🇰 ඔයාගේ search එකට match වන හොඳම ${keyword} products කිහිපයක් මෙන්න. ඔයාට කැමති item එක තෝරලා Cart එකට එකතු කරන්න පුළුවන්!`;
      } else {
        responseText = `Ayu Bowan! 🇱🇰 Based on your search, I found some excellent options matching "${keyword}" for you. You can see them below. Add them to your cart to get started!`;
      }
      return {
        text: responseText,
        products: enriched
      };
    } catch (e) {
      return { text: `Error searching products: ${e.message}` };
    }
  }

  // Fallback
  let fallbackText = '';
  if (language === 'si') {
    fallbackText = "මම කප්රුක AI සාප්පු සවාරි සහායකයා වෙමි. මට කේක්, මල්, චොකලට්, සෙල්ලම් බඩු සෙවීමට මෙන්ම ඔබගේ ඇණවුම් ලුහුබැඳීමට සහ බෙදා හැරීමේ ගාස්තු පරීක්ෂා කිරීමට උදව් කළ හැකිය. අද ඔබට අවශ්‍ය කුමක්ද?";
  } else if (language === 'tanglish') {
    fallbackText = "ආයුබෝවන්! 🇱🇰 මම කප්රුක AI Shopping Assistant. මට ඔයාට cakes, flowers, chocolates, toys සහ gift hampers සොයාගන්න udaw කරන්න පුළුවන්. ඒ වගේම ඔයාගේ orders track කරන්න සහ delivery rates check කරන්නත් පුළුවන්. අද ඔයාට මොනවාද ඕනේ?";
  } else {
    fallbackText = "Ayu Bowan! 🇱🇰 I am your Kapruka AI Shopping Assistant. I can help you search for cakes, flowers, chocolates, toys, and gift hampers. I can also track your orders and check delivery rates. What can I do for you today?";
  }
  return { text: fallbackText };
}

// Convert Claude tools to Gemini format
function convertToolsToGemini(claudeTools) {
  return claudeTools.map(t => {
    const params = JSON.parse(JSON.stringify(t.input_schema || {}));
    const formatSchemaType = (s) => {
      if (s.type) s.type = s.type.toUpperCase();
      if (s.properties) {
        for (const k in s.properties) {
          formatSchemaType(s.properties[k]);
        }
      }
      if (s.items) {
        formatSchemaType(s.items);
      }
    };
    formatSchemaType(params);
    return {
      name: t.name,
      description: t.description,
      parameters: params
    };
  });
}

// Helper to retrieve all configured Gemini API keys from environment
function getGeminiApiKeys() {
  const envKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  return envKeys.split(',').map(k => k.trim()).filter(Boolean);
}

// Run a Gemini agent loop using a single API key and fallback models list
async function runGeminiAgentWithSingleKey(messages, clientLang, apiKey, models) {
  // Format messages for Gemini
  const contents = messages
    .filter(m => (m.sender === 'user' || m.sender === 'agent' || m.role === 'user' || m.role === 'assistant') && (m.text || m.content))
    .map(m => {
      const role = (m.sender === 'agent' || m.role === 'assistant') ? 'model' : 'user';
      const text = m.text || m.content;
      return {
        role,
        parts: [{ text }]
      };
    });

  let dynamicSystemPrompt = SYSTEM_PROMPT;
  if (clientLang) {
    const langNames = { en: 'English', si: 'Sinhala script', tanglish: 'Tanglish/Singlish (Sinhala written in English/Latin alphabet letters)' };
    dynamicSystemPrompt += `\n\n[System Override: The user's active UI interface language is set to ${langNames[clientLang] || clientLang}. Follow these language rules exactly:\n` +
      `- If the user writes in English, reply in casual English.\n` +
      `- If the user writes in Sinhala script, reply in natural Sinhala script.\n` +
      `- If the user writes in Singlish/Tanglish (Sinhala using English letters, e.g. 'mata cake ekak oni', 'gift ekak hoyala denna'), ALWAYS reply in Sinhala script mixed with English words (e.g. 'ඔයාට ගැලපෙන Cake options කිහිපයක් මෙන්න. ඔයාට කැමති item එක Cart එකට එකතු කරන්න පුළුවන්!'). Do NOT reply in Latin letters/Singlish.]`;
  }

  const systemInstruction = {
    parts: [{ text: dynamicSystemPrompt }]
  };

  const geminiTools = [{
    functionDeclarations: convertToolsToGemini(CLAUDE_TOOLS)
  }];

  let maxIterations = 5;
  let iteration = 0;
  let accumulatedProducts = [];

  let modelIndex = 0;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`Gemini Agent Loop Iteration ${iteration}`);

    let success = false;
    let responseData;
    let activeModel = '';
    let lastError = null;

    while (!success && modelIndex < models.length) {
      activeModel = models[modelIndex];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
      
      try {
        console.log(`Trying Gemini model ${activeModel}...`);
        const requestBody = {
          contents,
          systemInstruction,
          tools: geminiTools
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Status ${res.status}: ${errText}`);
        }

        responseData = await res.json();
        success = true;
      } catch (err) {
        console.warn(`Gemini model ${activeModel} failed: ${err.message}`);
        lastError = err;
        modelIndex++;
      }
    }

    if (!success) {
      throw new Error(`All Gemini models failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
    }

    if (!responseData.candidates || responseData.candidates.length === 0) {
      throw new Error(responseData.error?.message || "No candidates returned from Gemini");
    }

    const candidate = responseData.candidates[0];
    const modelContent = candidate.content;
    contents.push(modelContent);

    const parts = modelContent.parts || [];
    const functionCalls = parts.filter(p => p.functionCall);

    if (functionCalls.length === 0) {
      const textPart = parts.find(p => p.text);
      const text = textPart ? textPart.text : '';
      return {
        text,
        products: accumulatedProducts
      };
    }

    const functionResponseParts = [];
    for (const part of parts) {
      if (!part.functionCall) continue;
      
      const func = part.functionCall;
      console.log(`Gemini calling tool: ${func.name} with arguments:`, func.args);

      let toolResponse;
      if (!mcpClient) {
        toolResponse = { error: "Kapruka MCP client is offline." };
      } else {
        try {
          let toolArgs = JSON.parse(JSON.stringify(func.args || {}));
          let targetArgs = toolArgs.params ? toolArgs.params : toolArgs;
          
          if (func.name === 'kapruka_check_delivery') {
            if (targetArgs.delivery_date) {
              targetArgs.delivery_date = formatToYYYYMMDD(targetArgs.delivery_date);
            }
          } else if (func.name === 'kapruka_create_order') {
            const normalized = normalizeOrderPayload(targetArgs);
            if (toolArgs.params) {
              toolArgs.params = normalized;
            } else {
              toolArgs = normalized;
            }
          }
          
          if (!toolArgs.params) {
            toolArgs = { params: toolArgs };
          }
          
          const rawResult = await mcpClient.callTool({
            name: func.name,
            arguments: toolArgs
          });
          toolResponse = formatMcpResponse(rawResult);

          if (func.name === 'kapruka_search_products') {
            const parsed = extractProductsFromResponse(toolResponse);
            const enriched = await enrichProductsWithDetails(parsed);
            accumulatedProducts.push(...enriched);
          } else if (func.name === 'kapruka_get_product') {
            if (toolResponse && !toolResponse.isError) {
              const parsed = extractProductsFromResponse(toolResponse);
              accumulatedProducts.push(...parsed);
            }
          }
        } catch (e) {
          console.error(`Error in Gemini tool execution for ${func.name}:`, e.message);
          toolResponse = { error: e.message };
        }
      }

      const responsePart = {
        functionResponse: {
          name: func.name,
          response: { result: JSON.stringify(toolResponse) }
        }
      };
      
      if (func.id) {
        responsePart.functionResponse.id = func.id;
      }
      
      const thoughtSig = part.thought_signature || part.thoughtSignature;
      if (thoughtSig) {
        responsePart.thought_signature = thoughtSig;
      }
      
      functionResponseParts.push(responsePart);
    }

    contents.push({
      role: 'user',
      parts: functionResponseParts
    });
  }

  throw new Error("Gemini agent loop exceeded maximum iterations.");
}

// Convert Claude tools to OpenAI tools format
function convertToolsToOpenAI(claudeTools) {
  return claudeTools.map(t => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema
    }
  }));
}

// Run an OpenAI-compatible agent loop (Groq, Kimi, GLM) with tool calling & failover
async function runOpenAiCompatibleAgentLoop(messages, clientLang, providerType, apiKey, models) {
  const urlMap = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    kimi: 'https://api.moonshot.cn/v1/chat/completions',
    glm: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions'
  };

  const url = urlMap[providerType];
  if (!url) throw new Error(`Unknown provider type: ${providerType}`);

  let apiMessages = [];
  
  // Add system message first
  let dynamicSystemPrompt = SYSTEM_PROMPT;
  if (clientLang) {
    const langNames = { en: 'English', si: 'Sinhala script', tanglish: 'Tanglish/Singlish (Sinhala written in English/Latin alphabet letters)' };
    dynamicSystemPrompt += `\n\n[System Override: The user's active UI interface language is set to ${langNames[clientLang] || clientLang}. Follow these language rules exactly:\n` +
      `- If the user writes in English, reply in casual English.\n` +
      `- If the user writes in Sinhala script, reply in natural Sinhala script.\n` +
      `- If the user writes in Singlish/Tanglish (Sinhala using English letters, e.g. 'mata cake ekak oni', 'gift ekak hoyala denna'), ALWAYS reply in Sinhala script mixed with English words (e.g. 'ඔයාට ගැලපෙන Cake options කිහිපයක් මෙන්න. ඔයාට කැමති item එක Cart එකට එකතු කරන්න පුළුවන්!'). Do NOT reply in Latin letters/Singlish.]`;
  }
  apiMessages.push({ role: 'system', content: dynamicSystemPrompt });

  // Map messages history
  messages
    .filter(m => (m.sender === 'user' || m.sender === 'agent' || m.role === 'user' || m.role === 'assistant') && (m.text || m.content))
    .forEach(m => {
      const role = (m.sender === 'agent' || m.role === 'assistant') ? 'assistant' : 'user';
      const content = m.text || m.content;
      apiMessages.push({ role, content });
    });

  const openAiTools = convertToolsToOpenAI(CLAUDE_TOOLS);

  let maxIterations = 5;
  let iteration = 0;
  let accumulatedProducts = [];

  let modelIndex = 0;
  let activeModel = models[0];

  while (iteration < maxIterations) {
    iteration++;
    console.log(`[${providerType.toUpperCase()}] Agent Loop Iteration ${iteration}`);

    let success = false;
    let responseData;
    let lastError = null;

    while (!success && modelIndex < models.length) {
      activeModel = models[modelIndex];
      try {
        console.log(`[${providerType.toUpperCase()}] Trying model ${activeModel}...`);
        const requestBody = {
          model: activeModel,
          messages: apiMessages,
          tools: openAiTools,
          tool_choice: 'auto'
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Status ${res.status}: ${errText}`);
        }

        responseData = await res.json();
        success = true;
      } catch (err) {
        console.warn(`[${providerType.toUpperCase()}] Model ${activeModel} failed: ${err.message}`);
        lastError = err;
        modelIndex++;
      }
    }

    if (!success) {
      throw new Error(`All ${providerType.toUpperCase()} models failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
    }

    const choice = responseData.choices[0];
    const message = choice.message;
    
    // Push the assistant message to apiMessages history
    apiMessages.push(message);

    const toolCalls = message.tool_calls || [];

    if (toolCalls.length === 0) {
      return {
        text: message.content || '',
        products: accumulatedProducts
      };
    }

    // Process tool calls
    for (const toolCall of toolCalls) {
      const func = toolCall.function;
      console.log(`[${providerType.toUpperCase()}] calling tool: ${func.name} with arguments:`, func.arguments);

      let toolResponse;
      if (!mcpClient) {
        toolResponse = { error: "Kapruka MCP client is offline." };
      } else {
        try {
          let toolArgs = JSON.parse(func.arguments || '{}');
          let targetArgs = toolArgs.params ? toolArgs.params : toolArgs;
          
          if (func.name === 'kapruka_check_delivery') {
            if (targetArgs.delivery_date) {
              targetArgs.delivery_date = formatToYYYYMMDD(targetArgs.delivery_date);
            }
          } else if (func.name === 'kapruka_create_order') {
            const normalized = normalizeOrderPayload(targetArgs);
            if (toolArgs.params) {
              toolArgs.params = normalized;
            } else {
              toolArgs = normalized;
            }
          }
          
          if (!toolArgs.params) {
            toolArgs = { params: toolArgs };
          }
          
          const rawResult = await mcpClient.callTool({
            name: func.name,
            arguments: toolArgs
          });
          toolResponse = formatMcpResponse(rawResult);

          if (func.name === 'kapruka_search_products') {
            const parsed = extractProductsFromResponse(toolResponse);
            const enriched = await enrichProductsWithDetails(parsed);
            accumulatedProducts.push(...enriched);
          } else if (func.name === 'kapruka_get_product') {
            if (toolResponse && !toolResponse.isError) {
              const parsed = extractProductsFromResponse(toolResponse);
              accumulatedProducts.push(...parsed);
            }
          }
        } catch (e) {
          console.error(`Error in ${providerType.toUpperCase()} tool execution for ${func.name}:`, e.message);
          toolResponse = { error: e.message };
        }
      }

      // Push tool response message
      apiMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: func.name,
        content: JSON.stringify(toolResponse)
      });
    }
  }

  throw new Error(`[${providerType.toUpperCase()}] Agent loop exceeded maximum iterations.`);
}

// Run Claude agent loop using Anthropic SDK
async function runClaudeAgent(messages, clientLang, apiKey, model) {
  const anthropic = new Anthropic({ apiKey });

  // Format messages for Claude
  const formattedMessages = messages
    .filter(m => (m.sender === 'user' || m.sender === 'agent' || m.role === 'user' || m.role === 'assistant') && (m.text || m.content))
    .map(m => {
      const role = (m.sender === 'agent' || m.role === 'assistant') ? 'assistant' : 'user';
      const content = m.text || m.content;
      return { role, content };
    });

  let currentMessages = [...formattedMessages];
  let maxIterations = 5;
  let iteration = 0;
  let accumulatedProducts = [];

  let dynamicSystemPrompt = SYSTEM_PROMPT;
  if (clientLang) {
    const langNames = { en: 'English', si: 'Sinhala script', tanglish: 'Tanglish/Singlish (Sinhala written in English/Latin alphabet letters)' };
    dynamicSystemPrompt += `\n\n[System Override: The user's active UI interface language is set to ${langNames[clientLang] || clientLang}. Follow these language rules exactly:\n` +
      `- If the user writes in English, reply in casual English.\n` +
      `- If the user writes in Sinhala script, reply in natural Sinhala script.\n` +
      `- If the user writes in Singlish/Tanglish (Sinhala using English letters, e.g. 'mata cake ekak oni', 'gift ekak hoyala denna'), ALWAYS reply in Sinhala script mixed with English words (e.g. 'ඔයාට ගැලපෙන Cake options කිහිපයක් මෙන්න. ඔයාට කැමති item එක Cart එකට එකතු කරන්න පුළුවන්!'). Do NOT reply in Latin letters/Singlish.]`;
  }

  while (iteration < maxIterations) {
    iteration++;
    console.log(`Claude Agent Loop Iteration ${iteration}`);

    const response = await anthropic.messages.create({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: dynamicSystemPrompt,
      messages: currentMessages,
      tools: CLAUDE_TOOLS
    });

    const assistantMessage = {
      role: 'assistant',
      content: response.content
    };
    currentMessages.push(assistantMessage);

    const toolCalls = response.content.filter(block => block.type === 'tool_use');

    if (toolCalls.length === 0) {
      const textContentBlock = response.content.find(block => block.type === 'text');
      const text = textContentBlock ? textContentBlock.text : '';
      return {
        text,
        products: accumulatedProducts
      };
    }

    const toolResults = [];
    for (const toolCall of toolCalls) {
      console.log(`Executing tool: ${toolCall.name} with input:`, toolCall.input);
      
      let toolResponse;
      if (!mcpClient) {
        toolResponse = { isError: true, content: [{ text: "Kapruka MCP client is currently offline." }] };
      } else {
        try {
          let toolArgs = JSON.parse(JSON.stringify(toolCall.input || {}));
          let targetArgs = toolArgs.params ? toolArgs.params : toolArgs;
          
          if (toolCall.name === 'kapruka_check_delivery') {
            if (targetArgs.delivery_date) {
              targetArgs.delivery_date = formatToYYYYMMDD(targetArgs.delivery_date);
            }
          } else if (toolCall.name === 'kapruka_create_order') {
            const normalized = normalizeOrderPayload(targetArgs);
            if (toolArgs.params) {
              toolArgs.params = normalized;
            } else {
              toolArgs = normalized;
            }
          }
          
          if (!toolArgs.params) {
            toolArgs = { params: toolArgs };
          }
          
          const rawResult = await mcpClient.callTool({
            name: toolCall.name,
            arguments: toolArgs
          });
          
          toolResponse = formatMcpResponse(rawResult);

          if (toolCall.name === 'kapruka_search_products') {
            const parsed = extractProductsFromResponse(toolResponse);
            const enriched = await enrichProductsWithDetails(parsed);
            accumulatedProducts.push(...enriched);
          } else if (toolCall.name === 'kapruka_get_product') {
            if (toolResponse && !toolResponse.isError) {
              const parsed = extractProductsFromResponse(toolResponse);
              accumulatedProducts.push(...parsed);
            }
          }
        } catch (e) {
          console.error(`Error executing tool ${toolCall.name}:`, e.message);
          toolResponse = { error: e.message };
        }
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: JSON.stringify(toolResponse)
      });
    }

    currentMessages.push({
      role: 'user',
      content: toolResults
    });
  }

  throw new Error("Claude agent loop exceeded maximum iterations.");
}

// Default fallback models for each provider
const PROVIDER_MODELS = {
  gemini: [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama3-70b-8192',
    'llama3-8b-8192'
  ],
  kimi: [
    'moonshot-v1-8k',
    'moonshot-v1-32k'
  ],
  glm: [
    'glm-4-air',
    'glm-4-flash',
    'glm-4'
  ],
  nvidia: [
    'nvidia/nemotron-3-ultra-550b-a55b'
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022'
  ]
};

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, language: clientLang } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request body: 'messages' array is required." });
    }

    // Build the prioritized list of configured providers dynamically from environment
    const configuredProviders = [];

    // 1. Gemini keys
    const geminiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    geminiKeys.forEach((key, index) => {
      configuredProviders.push({
        type: 'gemini',
        key,
        name: `Gemini Key #${index + 1}`,
        models: PROVIDER_MODELS.gemini
      });
    });

    // 2. Nvidia keys (Second Priority)
    const nvidiaKeys = (process.env.NVIDIA_API_KEYS || process.env.NVIDIA_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    nvidiaKeys.forEach((key, index) => {
      configuredProviders.push({
        type: 'nvidia',
        key,
        name: `Nvidia Key #${index + 1}`,
        models: PROVIDER_MODELS.nvidia
      });
    });

    // 3. Groq keys
    const groqKeys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    groqKeys.forEach((key, index) => {
      configuredProviders.push({
        type: 'groq',
        key,
        name: `Groq Key #${index + 1}`,
        models: PROVIDER_MODELS.groq
      });
    });


    // 3. Kimi keys (Moonshot)
    const kimiKeys = (process.env.KIMI_API_KEYS || process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEYS || process.env.MOONSHOT_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    kimiKeys.forEach((key, index) => {
      configuredProviders.push({
        type: 'kimi',
        key,
        name: `Kimi Key #${index + 1}`,
        models: PROVIDER_MODELS.kimi
      });
    });

    // 4. GLM keys (Zhipu)
    const glmKeys = (process.env.GLM_API_KEYS || process.env.GLM_API_KEY || process.env.ZHIPU_API_KEYS || process.env.ZHIPU_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    glmKeys.forEach((key, index) => {
      configuredProviders.push({
        type: 'glm',
        key,
        name: `GLM Key #${index + 1}`,
        models: PROVIDER_MODELS.glm
      });
    });



    // 5. Anthropic key (skip if placeholder value)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && !anthropicKey.startsWith('your_') && !anthropicKey.startsWith('sk-ant-placeholder')) {
      configuredProviders.push({
        type: 'anthropic',
        key: anthropicKey,
        name: 'Anthropic Key',
        models: PROVIDER_MODELS.anthropic
      });
    }

    let response = null;
    let success = false;
    let lastError = null;

    if (configuredProviders.length > 0) {
      for (const prov of configuredProviders) {
        try {
          console.log(`Attempting chat completion with provider: ${prov.name} (${prov.type})...`);
          if (prov.type === 'gemini') {
            response = await runGeminiAgentWithSingleKey(messages, clientLang, prov.key, prov.models);
          } else if (prov.type === 'anthropic') {
            response = await runClaudeAgent(messages, clientLang, prov.key, prov.models[0]);
          } else {
            response = await runOpenAiCompatibleAgentLoop(messages, clientLang, prov.type, prov.key, prov.models);
          }
          success = true;
          break; // Exit loop on success!
        } catch (err) {
          console.warn(`Provider ${prov.name} (${prov.type}) failed:`, err.message);
          lastError = err;
        }
      }
    }

    if (!success) {
      console.log('No working API providers found or all failed. Falling back to local Mock Agent...');
      response = await handleMockAgent(messages, clientLang);
    }

    return res.json(response);

  } catch (error) {
    console.error('Critical error in /api/chat endpoint:', error.message || error);
    if (error.status === 429 || (error.message && error.message.toLowerCase().includes('rate limit')) || (error.message && error.message.toLowerCase().includes('429'))) {
      return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
    }
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route for SPA client-side routing, fallback to serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Kapruka API Bridge Server running on http://localhost:${PORT}`);
  });
}

export default app;
