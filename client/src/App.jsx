import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  ShoppingCart, 
  Search, 
  MapPin, 
  Calendar, 
  Truck, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Globe, 
  HelpCircle,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  X,
  Menu
} from 'lucide-react';

// ====== Theme Context ======
const ThemeContext = React.createContext({ isDark: true });
const useTheme = () => React.useContext(ThemeContext);

// Theme colour helper — returns Tailwind class strings based on mode
const th = (dark, light) => dark; // used as: th('dark-class','light-class')
// We'll override via CSS variables instead


const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%231e1b4b'/%3E%3Ctext x='50%25' y='50%25' font-size='40' text-anchor='middle' dy='.3em' fill='%23a78bfa'%3E🎁%3C/text%3E%3C/svg%3E";

const formatDateToYYYYMMDD = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  const match = dateStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

const POPULAR_CITIES = [
  "Colombo 01 (Fort)",
  "Colombo 02 (Slave Island)",
  "Colombo 03 (Colpetty)",
  "Colombo 04 (Bambalapitiya)",
  "Colombo 05 (Havelock Town)",
  "Colombo 06 (Wellawatte)",
  "Colombo 07 (Cinnamon Gardens)",
  "Colombo 08 (Borella)",
  "Colombo 09 (Dematagoda)",
  "Colombo 10 (Maradana)",
  "Colombo 11 (Pettah)",
  "Colombo 12 (Hultsdorf)",
  "Colombo 13 (Kotahena)",
  "Colombo 14 (Grandpass)",
  "Colombo 15 (Mutwal)",
  "Nugegoda",
  "Kotte",
  "Battaramulla",
  "Dehiwala",
  "Mount Lavinia",
  "Kandy",
  "Galle",
  "Negombo",
  "Jaffna",
  "Matara",
  "Bandarawela",
  "Gampaha",
  "Kurunegala",
  "Trincomalee",
  "Anuradhapura",
  "Ratnapura",
  "Kalutara",
  "Batticaloa"
].sort();


const translations = {
  en: {
    welcomeMessage: 'Ayu Bowan! 🇱🇰 Welcome to Kapruka AI Shopping Assistant. How can I help you choose the perfect gift or product today?\n\n*Suggestions: "Find chocolate cakes under 5000 LKR", "Mata mal pokurak ona", "Track my order #1234"*',
    suggestionsChips: [
      { label: '🎂 Cakes', query: 'Cake' },
      { label: '💐 Flowers', query: 'Flowers' },
      { label: '🍫 Chocolates', query: 'Chocolate' },
      { label: '🧸 Soft Toys', query: 'Toy' },
      { label: '🎁 Gift Hampers', query: 'Hamper' }
    ],
    inputPlaceholder: "Search for cakes, flowers, track orders...",
    sidebarHeader: "Shopping Cart",
    orderTracker: "Order Tracker",
    guestCheckout: "Guest Checkout",
    clearCart: "Clear Cart",
    addToCart: "Add to Cart",
    proceedToCheckout: "Proceed to Checkout",
    recipientName: "Recipient Full Name",
    recipientPhone: "Recipient Phone",
    streetAddress: "Street Address",
    city: "City",
    locationType: "Location Type",
    deliveryDate: "Delivery Date",
    greetingCard: "Greeting Card Message (Optional)",
    deliveryInstructions: "Delivery Instructions (Optional)",
    sendAnonymously: "Send Anonymously",
    senderName: "Sender Full Name",
    senderPhone: "Sender Phone",
    senderEmail: "Sender Email",
    phoneRequired: "Phone number is required",
    phoneInvalid: "Invalid Sri Lankan phone format (e.g. 0771234567 or +94771234567)",
    back: "Back",
    backToCart: "Back to Cart",
    next: "Next",
    placeOrder: "Place Order & Pay",
    placingOrder: "Placing Order...",
    orderConfirmed: "Order Confirmed!",
    orderCreatedSuccess: "Order Created Successfully!",
    grandTotalSummary: "Grand Total Summary",
    subtotal: "Cart Subtotal",
    deliveryFee: "Delivery Fee",
    totalPay: "Total Pay",
    added: "Added!",
    unavailable: "Unavailable",
    inStock: "In Stock",
    outOfStock: "Out of Stock",
    // Sidebar items
    directCatalogQuery: "Direct Catalog Query",
    searchPlaceholder: "Search products...",
    searchToolsButton: "Search Tools",
    searchingButton: "Querying...",
    popularGifts: "Popular Gifts",
    liveOrderTracker: "Live Order Tracker",
    orderNumPlaceholder: "Order Number (e.g., 55102)",
    queryTrackerButton: "Query Tracker",
    trackingButton: "Tracking...",
    welcomeTitle: "Active AI Shopping Agent",
    welcomeText: "The Express backend bridge is fully initialized, proxying requests directly to the remote Kapruka MCP Server tools. Use the search parameters, track orders, or simulate queries below!",
    backendBridge: "Backend Bridge",
    connected: "Connected",
    disconnected: "Disconnected",
    checking: "Checking...",
    assistantTitle: "Kapruka Intelligent Assistant",
    recommendedGifts: "Recommended Gift Items",
    clearResults: "Clear Results",
    sendButton: "Send",
    itemsBadge: "Items"
  },
  si: {
    welcomeMessage: 'ආයුබෝවන්! 🇱🇰 කප්රුක AI සාප්පු සවාරි සහායකයා වෙත සාදරයෙන් පිළිගනිමු. අද දින ඔබට පරිපූර්ණ තෑග්ගක් හෝ භාණ්ඩයක් තෝරා ගැනීමට මා උපකාර කරන්නේ කෙසේද?\n\n*යෝජනා: "රුපියල් 5000ට අඩු චොකලට් කේක් සොයන්න", "මට මල් පොකුරක් ඕන", "මගේ ඇණවුම ලුහුබඳින්න #1234"*',
    suggestionsChips: [
      { label: '🎂 කේක්', query: 'Cake' },
      { label: '💐 මල් පොකුරු', query: 'Flowers' },
      { label: '🍫 චොකලට්', query: 'Chocolate' },
      { label: '🧸 සෙල්ලම් බඩු', query: 'Toy' },
      { label: '🎁 තෑගි කූඩ', query: 'Hamper' }
    ],
    inputPlaceholder: "කේක් එකක් සොයන්න, මල් හෝ ඇණවුම් ලුහුබැඳන්න...",
    sidebarHeader: "සාප්පු කරත්තය",
    orderTracker: "ඇණවුම් ලුහුබැඳීම",
    guestCheckout: "අමුත්තන්ගේ පරීක්ෂාව",
    clearCart: "කරත්තය හිස් කරන්න",
    addToCart: "කරත්තයට එක් කරන්න",
    proceedToCheckout: "පරීක්ෂා කිරීමට ඉදිරියට යන්න",
    recipientName: "ලබන්නාගේ සම්පූර්ණ නම",
    recipientPhone: "ලබන්නාගේ දුරකථන අංකය",
    streetAddress: "ලිපිනය",
    city: "නගරය",
    locationType: "ස්ථාන වර්ගය",
    deliveryDate: "බෙදා හැරීමේ දිනය",
    greetingCard: "සුභ පැතුම් පතේ පණිවිඩය (විකල්ප)",
    deliveryInstructions: "බෙදා හැරීමේ උපදෙස් (විකල්ප)",
    sendAnonymously: "නමක් නොමැතිව යවන්න",
    senderName: "යවන්නාගේ සම්පූර්ණ නම",
    senderPhone: "යවන්නාගේ දුරකථන අංකය",
    senderEmail: "යවන්නාගේ විද්‍යුත් තැපෑල",
    phoneRequired: "දුරකථන අංකය අවශ්‍යයි",
    phoneInvalid: "වලංගු නොවන ශ්‍රී ලංකා දුරකථන අංක ආකෘතියකි (උදා. 0771234567 හෝ +94771234567)",
    back: "ආපසු",
    backToCart: "කරත්තයට ආපසු",
    next: "මීළඟ",
    placeOrder: "ඇණවුම තහවුරු කර ගෙවන්න",
    placingOrder: "ඇණවුම සකසමින්...",
    orderConfirmed: "ඇණවුම තහවුරු කරන ලදී!",
    orderCreatedSuccess: "ඇණවුම සාර්ථකව නිර්මාණය කරන ලදී!",
    grandTotalSummary: "මුළු එකතුව පිළිබඳ විස්තරය",
    subtotal: "භාණ්ඩ එකතුව",
    deliveryFee: "බෙදා හැරීමේ ගාස්තුව",
    totalPay: "ගෙවිය යුතු මුළු මුදල",
    added: "එක් කරන ලදී!",
    unavailable: "නොමැත",
    inStock: "තොග ඇත",
    outOfStock: "තොග අවසන්",
    // Sidebar items
    directCatalogQuery: "සෘජු නිෂ්පාදන සෙවුම",
    searchPlaceholder: "භාණ්ඩ සොයන්න...",
    searchToolsButton: "සොයන්න",
    searchingButton: "සොයමින්...",
    popularGifts: "ජනප්‍රිය තෑගි",
    liveOrderTracker: "සජීවී ඇණවුම් ලුහුබැඳීම",
    orderNumPlaceholder: "ඇණවුම් අංකය (උදා. 55102)",
    queryTrackerButton: "ලුහුබඳින්න",
    trackingButton: "ලුහුබඳිමින්...",
    welcomeTitle: "ක්‍රියාකාරී AI සාප්පු සහායකයා",
    welcomeText: "Express පසුපෙළ පාලම සාර්ථකව සම්බන්ධ කර ඇත, එය Kapruka remote MCP සේවාදායක මෙවලම් සමඟ කෙලින්ම ක්‍රියාත්මක වේ. සෙවුම් පරාමිතීන්, ඇණවුම් ලුහුබැඳීම හෝ වෙනත් විමසීම් භාවිතා කරන්න!",
    backendBridge: "පසුපෙළ පාලම",
    connected: "සම්බන්ධයි",
    disconnected: "විසන්ධි වී ඇත",
    checking: "පරීක්ෂා කරමින්...",
    assistantTitle: "කප්රුක බුද්ධිමත් සහායකයා",
    recommendedGifts: "නිර්දේශිත තෑගි භාණ්ඩ",
    clearResults: "ප්‍රතිඵල ඉවත් කරන්න",
    sendButton: "යවන්න",
    itemsBadge: "භාණ්ඩ"
  },
  tanglish: {
    welcomeMessage: 'Ayu Bowan! 🇱🇰 Kapruka AI Shopping Assistant ekata welcome. Ada oyata lassanama gift ekak select karanna mama kohomada udaw karanna ona?\n\n*Suggestions: "Find chocolate cakes under 5000 LKR", "Mata mal pokurak ona", "Track my order #1234"*',
    suggestionsChips: [
      { label: '🎂 Cakes', query: 'Cake' },
      { label: '💐 Flowers', query: 'Flowers' },
      { label: '🍫 Chocolates', query: 'Chocolate' },
      { label: '🧸 Soft Toys', query: 'Toy' },
      { label: '🎁 Gift Hampers', query: 'Hamper' }
    ],
    inputPlaceholder: "Mata chocolate cake ekak ona, track my order...",
    sidebarHeader: "Shopping Cart",
    orderTracker: "Order Tracker",
    guestCheckout: "Guest Checkout",
    clearCart: "Clear Cart",
    addToCart: "Add to Cart",
    proceedToCheckout: "Proceed to Checkout",
    recipientName: "Recipient Full Name",
    recipientPhone: "Recipient Phone",
    streetAddress: "Street Address",
    city: "City",
    locationType: "Location Type",
    deliveryDate: "Delivery Date",
    greetingCard: "Greeting Card Message (Optional)",
    deliveryInstructions: "Delivery Instructions (Optional)",
    sendAnonymously: "Send Anonymously",
    senderName: "Sender Full Name",
    senderPhone: "Sender Phone",
    senderEmail: "Sender Email",
    phoneRequired: "Phone number eka ona",
    phoneInvalid: "Invalid Sri Lankan phone format (e.g. 0771234567 or +94771234567)",
    back: "Back",
    backToCart: "Back to Cart",
    next: "Next",
    placeOrder: "Place Order & Pay",
    placingOrder: "Placing Order...",
    orderConfirmed: "Order Confirmed!",
    orderCreatedSuccess: "Order Created Successfully!",
    grandTotalSummary: "Grand Total Summary",
    subtotal: "Cart Subtotal",
    deliveryFee: "Delivery Fee",
    totalPay: "Total Pay",
    added: "Added!",
    unavailable: "Unavailable",
    inStock: "In Stock",
    outOfStock: "Out of Stock",
    // Sidebar items
    directCatalogQuery: "Direct Catalog Query",
    searchPlaceholder: "Search products...",
    searchToolsButton: "Search Tools",
    searchingButton: "Querying...",
    popularGifts: "Popular Gifts",
    liveOrderTracker: "Live Order Tracker",
    orderNumPlaceholder: "Order Number (e.g., 55102)",
    queryTrackerButton: "Query Tracker",
    trackingButton: "Tracking...",
    welcomeTitle: "Active AI Shopping Agent",
    welcomeText: "Express backend bridge eka connect wela thiyenne. Kapruka remote MCP server tools use karanna puluwan. Catalog search karanna hari order track karanna hari prompt eka type karanna!",
    backendBridge: "Backend Bridge",
    connected: "Connected",
    disconnected: "Disconnected",
    checking: "Checking...",
    assistantTitle: "Kapruka AI Assistant",
    recommendedGifts: "Recommended Gift Items",
    clearResults: "Clear Results",
    sendButton: "Send",
    itemsBadge: "Items"
  }
};

// Extractor for city names from the markdown result
const extractCities = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.cities && Array.isArray(data.cities)) return data.cities;
  
  const mdText = data.result || data.text || (typeof data === 'string' ? data : '');
  if (!mdText) return [];
  
  const matches = [...mdText.matchAll(/-\s+\*\*([^*]+)\*\*/g)];
  return matches.map(m => m[1].trim());
};

// Parser for products from markdown text
function parseProductsFromMarkdown(mdText) {
  if (!mdText || typeof mdText !== 'string') return [];

  const products = [];
  const lines = mdText.split('\n');
  let currentProduct = null;

  // Helper: extract price from any text
  const extractPrice = (text) => {
    const m = text.match(/(?:lkr|rs\.?)\s*([\d,]+)/i);
    return m ? `LKR ${m[1]}` : null;
  };

  // Helper: is this a non-product keyword
  const isNonProductTitle = (t) => {
    if (!t || t.length < 4) return true;
    if (t.endsWith(':')) return true;
    if (/^(id|url|link|image|price|note|info)$/i.test(t)) return true;
    if (/^(shipping|estimated|tracking|shipment|local delivery|insurance|vendor|weight|dimension|colour|color|size|material|brand|sku|barcode|specification|detail|benefit|warning|caution)/i.test(t)) return true;
    return false;
  };

  const saveCurrentProduct = () => {
    if (!currentProduct) return;
    if (currentProduct.url && !currentProduct.product_id) {
      const idFromUrl = currentProduct.url.match(/\/kid\/([^/]+)/i) || currentProduct.url.match(/\/([^/]+)$/);
      if (idFromUrl) currentProduct.product_id = idFromUrl[1].toUpperCase();
    }
    products.push(currentProduct);
    currentProduct = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // FORMAT 1: Numbered list "1. Title - LKR 6,990" or "1. **Title** - LKR 6,990"
    const numberedMatch = line.match(/^\d+\.\s+\*?\*?([^*\n]+?)\*?\*?\s*[-–]\s*(?:lkr|rs\.?)\s*([\d,]+)/i);
    if (numberedMatch) {
      saveCurrentProduct();
      const title = numberedMatch[1].trim().replace(/\*\*/g, '');
      const priceVal = numberedMatch[2];
      if (!isNonProductTitle(title)) {
        currentProduct = {
          title,
          price: `LKR ${priceVal}`,
          in_stock: true,
          image: FALLBACK_IMAGE,
          product_id: '',
          url: ''
        };
      }
      continue;
    }

    // FORMAT 2: Bold title "**Title**" possibly with price on same line
    const boldMatch = line.match(/^\s*[-*\d.]*\s*\*\*([^*]+)\*\*/);
    if (boldMatch) {
      const candidateTitle = boldMatch[1].trim();
      if (!isNonProductTitle(candidateTitle)) {
        saveCurrentProduct();
        // Check if price is also on this same line
        const inlinePrice = extractPrice(line);
        currentProduct = {
          title: candidateTitle,
          price: inlinePrice, // null if not found
          in_stock: true,
          image: FALLBACK_IMAGE,
          product_id: '',
          url: ''
        };
      }
      continue;
    }

    // FORMAT 3: Plain "- Title - LKR X" or "- Title: LKR X"
    const dashTitlePrice = line.match(/^[-*]\s+(.+?)\s*[-:]\s*(?:lkr|rs\.?)\s*([\d,]+)/i);
    if (dashTitlePrice) {
      const candidateTitle = dashTitlePrice[1].trim().replace(/\*\*/g, '');
      if (!isNonProductTitle(candidateTitle)) {
        saveCurrentProduct();
        currentProduct = {
          title: candidateTitle,
          price: `LKR ${dashTitlePrice[2]}`,
          in_stock: true,
          image: FALLBACK_IMAGE,
          product_id: '',
          url: ''
        };
      }
      continue;
    }

    // For current product: extract sub-fields from following lines
    if (currentProduct) {
      const idMatch = line.match(/(?:ID|Product ID):\s*`?([^`\s]+)`?/i);
      if (idMatch) currentProduct.product_id = idMatch[1].trim();

      // Price on its own line (only set if not already found)
      if (!currentProduct.price) {
        const priceVal = extractPrice(line);
        if (priceVal) currentProduct.price = priceVal;
      }

      if (line.toLowerCase().includes('out of stock') || line.toLowerCase().includes('unavailable')) {
        currentProduct.in_stock = false;
      }

      // Image from markdown embed
      const imgMatch = line.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/i);
      if (imgMatch) currentProduct.image = imgMatch[1].trim();

      // Image from text label
      const imgTextMatch = line.match(/(?:Image|Thumbnail|Photo|Img|Picture)(?:\*\*?)*:\s*(?:\*\*?)*(https?:\/\/[^\s*)]+)/i);
      if (imgTextMatch) currentProduct.image = imgTextMatch[1].trim();

      // URL
      const urlMatch = line.match(/(?:^|[^!])\[[^\]]+\]\((https?:\/\/[^)]+)\)/i);
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
    if (!p.image || p.image === FALLBACK_IMAGE) {
      if (p.url) {
        const kaprukaIdMatch = p.url.match(/kapruka\.com\/[^/]+\/([A-Za-z0-9_-]+)\/?$/) ||
                               p.url.match(/kapruka\.com\/kid\/([A-Za-z0-9_-]+)/i);
        if (kaprukaIdMatch) {
          const pid = kaprukaIdMatch[1];
          p.image = `https://www.kapruka.com/spicific/${pid}/0_${pid}.jpg`;
        }
      }
      if (!p.image || p.image === FALLBACK_IMAGE) {
        const lt = p.title.toLowerCase();
        if (lt.includes('cake')) p.image = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60';
        else if (lt.includes('flower') || lt.includes('rose')) p.image = 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500&auto=format&fit=crop&q=60';
        else if (lt.includes('chocolate') || lt.includes('ferrero') || lt.includes('choco')) p.image = 'https://images.unsplash.com/photo-1548907040-4d42b52145ea?w=500&auto=format&fit=crop&q=60';
        else if (lt.includes('toy') || lt.includes('teddy')) p.image = 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=500&auto=format&fit=crop&q=60';
        else p.image = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=60';
      }
    }
    return p;
  });
}

// Normalize price from a product object with potentially different field names
const normalizeProductPrice = (p) => {
  if (!p || typeof p !== 'object') return p;
  const rawPrice = p.price || p.price_lkr || p.selling_price || p.cost || 
                   p.amount || p.LKR || p.lkr_price || p.unit_price;
  let normalizedPrice = null;
  if (typeof rawPrice === 'number' && rawPrice > 0) {
    normalizedPrice = `LKR ${rawPrice.toLocaleString()}`;
  } else if (typeof rawPrice === 'string' && rawPrice.trim()) {
    // Already a string like "LKR 3,500" — but only if it's a REAL price (not the hardcoded 3500)
    // We can't know if it's real or hardcoded here, so just pass through
    normalizedPrice = rawPrice;
  }
  return {
    ...p,
    title: p.title || p.name || p.product_name || '',
    price: normalizedPrice,
    in_stock: p.in_stock !== undefined ? p.in_stock : true,
    image: p.image || p.image_url || p.thumbnail || p.photo || FALLBACK_IMAGE,
    url: p.url || p.product_url || p.link || '',
    product_id: p.product_id || p.id || ''
  };
};

const normalizeProducts = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data.map(normalizeProductPrice);
  if (data.products && Array.isArray(data.products) && data.products.length > 0) return data.products.map(normalizeProductPrice);
  if (data.items && Array.isArray(data.items)) return data.items.map(normalizeProductPrice);
  if (data.result && typeof data.result === 'string') {
    return parseProductsFromMarkdown(data.result);
  }
  if (data.text && typeof data.text === 'string') {
    return parseProductsFromMarkdown(data.text);
  }
  if (typeof data === 'object') {
    if (data.product_id || data.id) {
      return [normalizeProductPrice(data)];
    }
    for (const key in data) {
      if (Array.isArray(data[key])) {
        return data[key].map(normalizeProductPrice);
      }
    }
  }
  return [];

};

// Clean raw markdown product lists from conversational text if cards are rendered
const cleanChatText = (text) => {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split('\n');
  const cleanedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      cleanedLines.push('');
      continue;
    }
    
    // Skip pure product detail lines
    const isId = line.includes('ID:') || line.match(/ID:\s*`([^`]+)`/i);
    const isPrice = line.match(/^[-*•]?\s*(?:LKR|Price:|Cost:)/i) || line.match(/^LKR\s*[\d,]+/i);
    const isUrl = line.includes('View product') || line.includes('buyonline') || line.match(/\[View product\]\(([^)]+)\)/i);
    const isStockStatus = line.toLowerCase().includes('in stock') || line.toLowerCase().includes('out of stock') || line.toLowerCase().includes('ships internationally');
    const isTableRow = line.startsWith('|') && line.endsWith('|');
    const isTableSeparator = line.match(/^\|[-| :]+\|$/);
    
    if (isId || isPrice || isUrl || isStockStatus || isTableRow || isTableSeparator) {
      continue;
    }
    
    // Clean markdown formatting from the line itself
    let cleaned = line;
    // Remove ## headings
    cleaned = cleaned.replace(/^#{1,6}\s+/, '');
    // Remove **bold** and *italic*
    cleaned = cleaned.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1');
    // Remove leading bullet/dash
    cleaned = cleaned.replace(/^[-*•]\s+/, '');
    // Remove backtick code
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    
    if (cleaned.trim()) {
      cleanedLines.push(cleaned);
    }
  }
  
  // Join and collapse multiple empty lines into one
  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};



// Countdown component starting from 60 minutes
function ExpirationCountdown({ minutes = 60, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onComplete) onComplete();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, onComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-center py-2 px-3 rounded-lg text-xs font-semibold animate-pulse flex items-center justify-center gap-1.5">
      <Clock className="w-3.5 h-3.5" /> Link Expiry: {formatTime(timeLeft)}
    </div>
  );
}

// Reusable product skeleton component
function ProductSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-pulse flex flex-col h-64">
      <div className="h-36 bg-slate-800/60" />
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="h-4 bg-slate-800/60 rounded w-3/4" />
          <div className="h-3 bg-slate-800/60 rounded w-1/2" />
        </div>
        <div className="h-8 bg-slate-800/60 rounded w-full" />
      </div>
    </div>
  );
}

// Reusable premium visual product card component
function ProductCard({ product, onAddToCart, language = 'en' }) {
  const [added, setAdded] = React.useState(false);
  const id = product.product_id || product.id;
  const title = product.title || product.name || 'Kapruka Gift';
  const rawPrice = product.price || product.price_lkr;
  const price = rawPrice && rawPrice !== 'null' ? rawPrice : null;
  const img = product.image || product.image_url || FALLBACK_IMAGE;
  const isStock = product.stock !== false && product.in_stock !== false;


  const handleAdd = () => {
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div 
      className="bg-slate-900 border border-slate-800 hover:border-kapruka-purple-light rounded-xl overflow-hidden shadow-lg flex flex-col product-card-hover animate-fade-in w-full"
    >
      <div className="h-36 overflow-hidden bg-slate-950 relative">
        <img 
          src={img} 
          alt={title}
          onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }}
          className="w-full h-full object-cover transition duration-500"
        />
        <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded font-bold ${
          isStock ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        }`}>
          {isStock ? translations[language].inStock : translations[language].outOfStock}
        </span>
      </div>
      
      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <h4 className="font-semibold text-slate-100 text-xs line-clamp-2 hover:text-kapruka-yellow transition min-h-[2rem]">
            {title}
          </h4>
          {price ? (
            <p className="text-kapruka-yellow font-bold text-xs mt-1 font-outfit">
              {typeof price === 'number' ? `LKR ${price.toLocaleString()}` : price}
            </p>
          ) : (
            <a href={product.url || `https://www.kapruka.com/search?q=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" className="text-kapruka-purple-light text-[10px] mt-1 underline">
              See price on Kapruka →
            </a>
          )}
        </div>
        
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={handleAdd}
            disabled={!isStock}
            className={`w-full font-semibold py-1.5 px-3 rounded-lg text-[11px] transition-all duration-200 flex items-center justify-center gap-1.5 ${
              !isStock 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : added 
                  ? 'bg-emerald-600 text-white shadow-emerald-900/30' 
                  : 'bg-kapruka-purple hover:bg-kapruka-purple-light text-white'
            }`}
          >
            {added ? (
              <>
                <span>{translations[language].added}</span>
                <span className="text-xs">✓</span>
              </>
            ) : (
              isStock ? translations[language].addToCart : translations[language].unavailable
            )}
          </button>

          <a
            href={product.url || `https://www.kapruka.com/search?q=${encodeURIComponent(product.title || product.name || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full font-semibold py-1.5 px-3 rounded-lg text-[11px] border border-kapruka-purple/40 hover:bg-kapruka-purple/20 text-kapruka-yellow transition duration-150 flex items-center justify-center gap-1 font-outfit"
          >
            <span>🔗 {language === 'si' ? 'කප්රුකවල බලන්න' : language === 'tanglish' ? 'Kapruka eke balanna' : 'View on Kapruka'}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Connection and API health state
  const [apiStatus, setApiStatus] = useState({ connected: false, checking: true });
  const [rateLimitError, setRateLimitError] = useState(false);

  // Feature 1: Dark/Light mode toggle
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Feature 3: Past chats state
  const [pastChats, setPastChats] = useState([]);

  // Load past chats from localStorage on mount
  useEffect(() => {
    const loadPastChats = () => {
      const chats = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kapruka_chat_')) {
          try {
            const msgs = JSON.parse(localStorage.getItem(key));
            const timestamp = parseInt(key.replace('kapruka_chat_', ''), 10);
            const firstUserMsg = Array.isArray(msgs) ? msgs.find(m => m.sender === 'user') : null;
            chats.push({
              key,
              timestamp,
              preview: firstUserMsg ? firstUserMsg.text : 'Chat session',
              messages: msgs
            });
          } catch (e) {
            // skip malformed entries
          }
        }
      }
      chats.sort((a, b) => b.timestamp - a.timestamp);
      setPastChats(chats.slice(0, 5));
    };
    loadPastChats();
  }, []);

  const [currentChatId, setCurrentChatId] = useState(() => Date.now().toString());

  // Feature 2: New Chat handler — save current messages, reset state
  const handleNewChat = () => {
    if (messages.length > 1) {
      localStorage.setItem('kapruka_chat_' + currentChatId, JSON.stringify(messages));
    }
    const newId = Date.now().toString();
    setCurrentChatId(newId);
    setMessages([{ id: 1, role: 'assistant', sender: 'agent', text: translations[language].welcomeMessage, products: [], timestamp: new Date() }]);
    setCart([]);
    setCheckoutStep(null);
    // Reload past chats list
    const chats = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('kapruka_chat_')) {
        try {
          const msgs = JSON.parse(localStorage.getItem(key));
          const timestamp = parseInt(key.replace('kapruka_chat_', ''), 10);
          const firstUserMsg = Array.isArray(msgs) ? msgs.find(m => m.sender === 'user') : null;
          chats.push({ key, timestamp, preview: firstUserMsg ? firstUserMsg.text : 'Chat session', messages: msgs });
        } catch (e) {}
      }
    }
    chats.sort((a, b) => b.timestamp - a.timestamp);
    setPastChats(chats.slice(0, 5));
  };

  // Feature 3: Load a past chat
  const handleLoadPastChat = (chat) => {
    if (messages.length > 1) {
      localStorage.setItem('kapruka_chat_' + currentChatId, JSON.stringify(messages));
    }
    setCurrentChatId(chat.key.replace('kapruka_chat_', ''));
    setMessages(chat.messages);
    setCart([]);
    setCheckoutStep(null);
  };

  // Feature 3: Delete a past chat
  const handleDeletePastChat = (key) => {
    localStorage.removeItem(key);
    setPastChats(prev => prev.filter(c => c.key !== key));
  };

  // Chat state
  const [language, setLanguage] = useState('en'); // en, si, tanglish
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'agent',
      text: translations['en'].welcomeMessage,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages load/update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sync welcome message on language change if conversation hasn't started
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 1 && prev[0].sender === 'agent') {
        return [{
          ...prev[0],
          text: translations[language].welcomeMessage
        }];
      }
      return prev;
    });
  }, [language]);

  // Catalog / Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(true);
  const [cityConfirmed, setCityConfirmed] = useState(false);
  const [isOtherCity, setIsOtherCity] = useState(false);
  const [dateError, setDateError] = useState(null);

  const validateDeliveryDate = (val) => {
    if (!val) {
      setDateError(null);
      return;
    }
    const selected = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const minDate = new Date();
    minDate.setDate(today.getDate() + 1);
    minDate.setHours(0, 0, 0, 0);

    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 90);
    maxDate.setHours(0, 0, 0, 0);

    if (selected < minDate) {
      setDateError(language === 'si' 
        ? '⚠️ බෙදා හැරීමේ දිනය හෙට හෝ ඉන් පසුව විය යුතුය.' 
        : '⚠️ Delivery date must be tomorrow or later.');
    } else if (selected > maxDate) {
      setDateError(language === 'si' 
        ? '⚠️ බෙදා හැරීමේ දිනය දින 90කට වඩා වැඩි විය නොහැක.' 
        : '⚠️ Delivery date cannot be more than 90 days from today.');
    } else {
      setDateError(null);
    }
  };

  // Delivery / Checkout state
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(null);
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState(null);

  // Expanded Wizard Checkout state
  const [checkoutStep, setCheckoutStep] = useState(null); // null, 1, 2, 3, 4
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientPhoneError, setRecipientPhoneError] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [locationType, setLocationType] = useState('house'); // house, apartment, office, other
  const [giftMessage, setGiftMessage] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderPhoneError, setSenderPhoneError] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderEmailError, setSenderEmailError] = useState('');
  const [sendAnonymously, setSendAnonymously] = useState(false);

  // Confirmed order details
  const [confirmedOrder, setConfirmedOrder] = useState(null); // { order_number, checkout_url, total }

  // Order status check state
  const [trackOrderNum, setTrackOrderNum] = useState('');
  const [orderTrackingDetails, setOrderTrackingDetails] = useState(null);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Popular search tags/chips
  const searchChips = translations[language].suggestionsChips;

  // Fetch API Health Status on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setApiStatus({ connected: data.connected, checking: false, error: null });
        } else {
          const errData = await res.json().catch(() => ({}));
          setApiStatus({ connected: false, checking: false, error: errData.error || 'Server returned unhealthy status' });
        }
      } catch (err) {
        setApiStatus({ connected: false, checking: false, error: err.message });
      }
    }
    checkHealth();
    // Poll every 10 seconds to show dynamic status
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle Text Query Submission
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    const prompt = inputText;
    setInputText('');

    // Renders custom loading bubble
    const loadingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: loadingId, sender: 'agent', text: '', isPlaceholder: true }]);

    // Detect if this query is a search intent to toggle skeleton loader cards
    const lowercasePrompt = prompt.toLowerCase();
    const isSearchIntent = lowercasePrompt.includes('cake') || 
                           lowercasePrompt.includes('flower') || 
                           lowercasePrompt.includes('mal') || 
                           lowercasePrompt.includes('chocolate') || 
                           lowercasePrompt.includes('toy') || 
                           lowercasePrompt.includes('doll') || 
                           lowercasePrompt.includes('hamper') || 
                           lowercasePrompt.includes('gift') ||
                           lowercasePrompt.includes('hoyala') ||
                           lowercasePrompt.includes('ona') ||
                           lowercasePrompt.includes('find') ||
                           lowercasePrompt.includes('search');
    
    if (isSearchIntent) {
      setIsSearching(true);
    }

    const startTime = Date.now();
    try {
      const chatHistory = [...messages, userMsg];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: chatHistory, language })
      });

      if (!res.ok) {
        if (res.status === 429) {
          setRateLimitError(true);
          throw new Error('Rate limit exceeded (60 requests/min). Please try again in a moment.');
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 500 - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      // Update agent message with response and products
      setMessages(prev => prev.map(m => m.id === loadingId ? {
        id: loadingId,
        sender: 'agent',
        text: data.text,
        products: normalizeProducts(data),
        timestamp: new Date()
      } : m));

      // NOTE: Do NOT sync searchResults here — chat inline cards are sufficient.
      // Only handleSearchCatalog (sidebar direct search) should update searchResults.
    } catch (err) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 500 - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      const getFriendlyError = (err) => {
        const msg = err.message || '';
        if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
          return '⚠️ Too many requests! Please wait a few seconds before trying again.';
        } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('connection')) {
          return '⚠️ Connection issue. Please check that the backend server is running.';
        } else {
          return '⚠️ Something went wrong. Please try again or rephrase your question.';
        }
      };
      setMessages(prev => prev.map(m => m.id === loadingId ? {
        id: loadingId,
        sender: 'agent',
        text: getFriendlyError(err),
        timestamp: new Date()
      } : m));
    } finally {
      setIsSearching(false);
    }
  };

  // Click on tags/chips - submits search immediately
  const handleChipClick = async (queryText) => {
    const chipQuery = `Find some beautiful ${queryText} items`;
    
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: chipQuery,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsSearching(true);

    const loadingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: loadingId, sender: 'agent', text: '', isPlaceholder: true }]);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: [...messages, userMsg], language })
      });

      if (!res.ok) {
        if (res.status === 429) {
          setRateLimitError(true);
          throw new Error('Rate limit exceeded (60 requests/min). Please try again in a moment.');
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 500 - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      setMessages(prev => prev.map(m => m.id === loadingId ? {
        id: loadingId,
        sender: 'agent',
        text: data.text,
        products: normalizeProducts(data),
        timestamp: new Date()
      } : m));
    } catch (err) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 500 - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      const getFriendlyErrorChip = (err) => {
        const msg = err.message || '';
        if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
          return '⚠️ Too many requests! Please wait a few seconds before trying again.';
        } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('connection')) {
          return '⚠️ Connection issue. Please check that the backend server is running.';
        } else {
          return '⚠️ Something went wrong. Please try again or rephrase your question.';
        }
      };
      setMessages(prev => prev.map(m => m.id === loadingId ? {
        id: loadingId,
        sender: 'agent',
        text: getFriendlyErrorChip(err),
        timestamp: new Date()
      } : m));
    } finally {
      setIsSearching(false);
    }
  };

  // Search Products from side form
  const handleSearchCatalog = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery) return;
    
    setIsSearching(true);
    const startTime = Date.now();
    try {
      const url = `/api/search?q=${encodeURIComponent(searchQuery)}${category ? `&category=${encodeURIComponent(category)}` : ''}&limit=8`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 500 - elapsed);
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining));
        }

        setSearchResults(normalizeProducts(data));
      }
    } catch (error) {
      console.error('Catalog search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Add to Shopping Cart
  const addToCart = (product) => {
    setCart(prev => {
      const pId = product.product_id || product.id;
      const pTitle = product.title || product.name;
      
      const hasValidId = (id) => id && String(id).trim() !== '';

      const existing = prev.find(item => {
        const itemId = item.product_id || item.id;
        const itemTitle = item.title || item.name;
        
        if (hasValidId(pId) && hasValidId(itemId)) {
          return String(itemId) === String(pId);
        }
        return itemTitle === pTitle;
      });

      const finalId = hasValidId(pId) ? pId : `gen_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      if (existing) {
        return prev.map(item => {
          const itemId = item.product_id || item.id;
          const itemTitle = item.title || item.name;
          const match = (hasValidId(pId) && hasValidId(itemId))
            ? String(itemId) === String(pId)
            : itemTitle === pTitle;
          return match ? { ...item, quantity: item.quantity + 1 } : item;
        });
      }
      return [...prev, { ...product, product_id: finalId, id: finalId, quantity: 1 }];
    });
  };

  // Update Cart Quantities
  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === id || item.id === id) {
        const newQty = item.quantity + delta;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // Remove Item
  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.product_id !== id && item.id !== id));
  };

  // Search Cities
  useEffect(() => {
    if (!cityQuery || cityQuery.length < 2 || cityQuery === selectedCity) {
      setCities([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities?query=${encodeURIComponent(cityQuery)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setCities(extractCities(data));
        }
      } catch (err) {
        console.error('City lookup error:', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [cityQuery, selectedCity]);

  // Recipient phone number validation
  const handleRecipientPhoneChange = (val) => {
    setRecipientPhone(val);
    const permissivePhoneRegex = /^[0-9+\-\s()]{7,15}$/;
    if (!val) {
      setRecipientPhoneError(translations[language].phoneRequired);
    } else if (!permissivePhoneRegex.test(val)) {
      setRecipientPhoneError(translations[language].phoneInvalid);
    } else {
      setRecipientPhoneError('');
    }
  };

  // Sender phone number validation
  const handleSenderPhoneChange = (val) => {
    setSenderPhone(val);
    const permissivePhoneRegex = /^[0-9+\-\s()]{7,15}$/;
    if (!val) {
      setSenderPhoneError('');
    } else if (!permissivePhoneRegex.test(val)) {
      setSenderPhoneError(language === 'si' ? 'වලංගු නොවන ආකෘතියකි' : 'Invalid phone format');
    } else {
      setSenderPhoneError('');
    }
  };

  // Sender email validation
  const handleSenderEmailChange = (val) => {
    setSenderEmail(val);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      setSenderEmailError('');
    } else if (val.length > 0 && !emailRegex.test(val)) {
      setSenderEmailError(language === 'si' ? 'වලංගු නොවන විද්‍යුත් තැපෑලකි' : 'Invalid email format');
    } else {
      setSenderEmailError('');
    }
  };

  // Check if cart contains perishable items
  const hasPerishableItems = () => {
    return cart.some(item => {
      const id = (item.product_id || item.id || '').toUpperCase();
      return id.startsWith('CAKE') || id.startsWith('FLOWER') || id.startsWith('COMBO');
    });
  };

  // Dynamic delivery rate fetch & check when city and date are selected
  useEffect(() => {
    if (!selectedCity || !deliveryDate) {
      setDeliveryFee(null);
      setDeliveryError(null);
      return;
    }

    async function fetchDeliveryRate() {
      setIsCheckingDelivery(true);
      setDeliveryError(null);
      try {
        const res = await fetch(`/api/delivery?city=${encodeURIComponent(selectedCity)}&delivery_date=${deliveryDate}`);
        if (res.ok) {
          const data = await res.json();
          const resultText = data.result || data.text || '';
          
          // Check availability constraints
          if (resultText.toLowerCase().includes('error') || resultText.toLowerCase().includes('not available') || resultText.toLowerCase().includes('false')) {
            setDeliveryError(resultText || 'Delivery not available for selected date/city.');
            setDeliveryFee(null);
            return;
          }
          
          // Log raw response for debugging
          console.log('[DeliveryFee] Full response from server:', data);

          // PRIORITY 1: Use server-extracted fee (most reliable)
          if (typeof data.extracted_fee === 'number' && data.extracted_fee > 0) {
            console.log('[DeliveryFee] Using server extracted_fee:', data.extracted_fee);
            setDeliveryFee(data.extracted_fee);
            return;
          }

          // PRIORITY 2: Direct numeric fields
          const directFee = data.fee ?? data.delivery_fee ?? data.rate ?? 
                            data.delivery?.fee ?? data.delivery?.rate;
          if (typeof directFee === 'number' && directFee > 0) {
            console.log('[DeliveryFee] Using direct field fee:', directFee);
            setDeliveryFee(directFee);
            return;
          }

          // PRIORITY 3: Parse from text — only look for delivery-specific patterns
          const feePatterns = [
            /delivery\s*(?:fee|charge|cost|rate)\s*[:\-]?\s*(?:lkr|rs\.?)?\s*([\d,]+)/i,
            /(?:fee|charge)\s*[:\-]\s*(?:lkr|rs\.?)?\s*([\d,]+)/i,
            /(?:lkr|rs\.?)\s*([\d,]+)/i,
          ];
          let found = false;
          for (const pattern of feePatterns) {
            const m = resultText.match(pattern);
            if (m) {
              const parsed = parseFloat(m[1].replace(/,/g, ''));
              if (parsed > 0 && parsed < 50000) {
                console.log('[DeliveryFee] Parsed from text:', parsed);
                setDeliveryFee(parsed);
                found = true;
                break;
              }
            }
          }
          if (!found) {
            console.warn('[DeliveryFee] Could not determine fee — showing null.');
            setDeliveryFee(null);
          }
        } else {
          const err = await res.json().catch(() => ({}));
          setDeliveryError(err.error || 'Failed to check delivery rates');
        }
      } catch (err) {
        setDeliveryError(err.message || 'Error checking delivery rates');
      } finally {
        setIsCheckingDelivery(false);
      }
    }

    fetchDeliveryRate();
  }, [selectedCity, deliveryDate]);

  // Order Submission to POST /api/order
  const handlePlaceOrder = async () => {
    const cartPayload = cart.map(item => ({
      product_id: item.product_id || item.id,
      quantity: item.quantity
    }));
    
    const recipient = {
      name: recipientName.trim(),
      phone: recipientPhone.trim()
    };
    
    const delivery = {
      address: streetAddress.trim(),
      city: selectedCity,
      location_type: locationType || 'house',
      date: formatDateToYYYYMMDD(deliveryDate),
      instructions: deliveryInstructions ? deliveryInstructions.trim() : null
    };
    
    const sender = {
      name: sendAnonymously ? 'Anonymous' : senderName.trim(),
      anonymous: sendAnonymously
    };
    
    const orderBody = {
      cart: cartPayload,
      recipient,
      delivery,
      sender,
      gift_message: giftMessage || undefined
    };
    
    setIsCheckingDelivery(true);
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderBody)
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to place order');
      }
      
      const data = await res.json();
      
      const md = data.result || data.text || '';
      let parsedOrderNumber = data.order_number || data.order_ref || data.orderId;
      if (!parsedOrderNumber && md) {
        const orderMatch = md.match(/ORD-[A-Z0-9-]+/i);
        if (orderMatch) {
          parsedOrderNumber = orderMatch[0];
        }
      }
      if (!parsedOrderNumber) {
        parsedOrderNumber = 'ORD-' + Math.floor(Math.random()*90000 + 10000);
      }

      let parsedCheckoutUrl = data.checkout_url || data.pay_link || data.payment_url;
      if (!parsedCheckoutUrl && md) {
        // Broad regex: catch any markdown link pointing to kapruka.com
        const urlMatch = md.match(/\[([^\]]+)\]\((https?:\/\/(?:www\.)?kapruka\.com[^)]+)\)/i);
        if (urlMatch) {
          parsedCheckoutUrl = urlMatch[2].trim();
        } else {
          // Fallback: bare kapruka.com URL in text
          const bareMatch = md.match(/(https?:\/\/(?:www\.)?kapruka\.com\/[^\s<)]+)/i);
          if (bareMatch) parsedCheckoutUrl = bareMatch[1].trim();
        }
      }
      if (!parsedCheckoutUrl) {
        parsedCheckoutUrl = 'https://www.kapruka.com/checkout'; // fallback
      }

      // Clear cart on successful order placement and set order confirmation details
      setConfirmedOrder({
        order_number: parsedOrderNumber,
        checkout_url: parsedCheckoutUrl, // may be null — UI handles gracefully
        total: total
      });
      setCart([]);
      setCheckoutStep(4);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', sender: 'agent', text: '⚠️ Order placement failed.', products: [], timestamp: new Date() }]);
    } finally {
      setIsCheckingDelivery(false);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => {
    const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
    return acc + (price * item.quantity);
  }, 0);
  const total = subtotal + (deliveryFee || 0);

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-slate-950 font-sans${isDarkMode ? '' : ' light-mode'}`}>
      
      {/* 1. SIDEBAR: Quick Discovery & Health checks */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`kapruka-sidebar flex flex-col w-80 bg-slate-900 border-r border-slate-800 text-slate-200 transition-all duration-300 z-50
        ${isSidebarOpen ? 'translate-x-0 fixed inset-y-0 left-0' : '-translate-x-full fixed inset-y-0 left-0 md:translate-x-0 md:relative md:flex'}
      `}>
        
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-kapruka-purple flex items-center justify-center border border-kapruka-purple-light shadow-lg">
              <ShoppingBag className="w-5 h-5 text-kapruka-yellow" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-outfit tracking-wide text-white flex items-center gap-1.5">
                KAPRUKA <span className="text-kapruka-yellow text-xs font-semibold px-1.5 py-0.5 rounded bg-kapruka-purple-deep border border-kapruka-purple-light">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400">{language === 'si' ? 'සාප්පු සවාරි සහ තෑගි සහායකයා' : 'Shopping & Gift Assistant'}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
            title="Close Menu"
            aria-label="Close Sidebar Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Settings Toggle (Language + Theme) */}
        <div className="md:hidden px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800/80 gap-0.5">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-outfit transition-all duration-150 ${
                language === 'en'
                  ? 'bg-kapruka-purple text-kapruka-yellow shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('si')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-150 ${
                language === 'si'
                  ? 'bg-kapruka-purple text-kapruka-yellow shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              සිංහල
            </button>
          </div>
          <button
            onClick={() => setIsDarkMode(prev => !prev)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 transition-all text-base"
            title="Toggle theme"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Feature 2: New Chat Button */}
        <div className="px-4 py-3 border-b border-slate-800">
          <button
            id="new-chat-btn"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-kapruka-purple/20 hover:bg-kapruka-purple/40 text-slate-300 hover:text-white border border-kapruka-purple/30 hover:border-kapruka-purple text-xs font-semibold py-2 px-3 rounded-lg transition-all duration-200"
            title="Start a new chat and save current one"
          >
            <span className="text-base leading-none">➕</span> New Chat
          </button>
        </div>

        {/* Feature 3: Past Chats Section */}
        {pastChats.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-800 space-y-2">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Past Chats</h3>
            <div className="space-y-1">
              {pastChats.map((chat) => (
                <div key={chat.key} className="flex items-center gap-1 group">
                  <button
                    onClick={() => handleLoadPastChat(chat)}
                    className="flex-1 text-left text-[11px] text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition-all duration-150 truncate"
                    title={chat.preview}
                  >
                    <span className="block text-[9px] text-slate-500 mb-0.5">
                      {new Date(chat.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="truncate block">{chat.preview.length > 40 ? chat.preview.slice(0, 40) + '…' : chat.preview}</span>
                  </button>
                  <button
                    onClick={() => handleDeletePastChat(chat.key)}
                    className="shrink-0 p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all duration-150"
                    title="Delete this chat"
                    aria-label="Delete past chat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Connection Health indicator */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> {translations[language].backendBridge}:
          </span>
          {apiStatus.checking ? (
            <span className="text-gray-400 font-mono">{translations[language].checking}</span>
          ) : apiStatus.connected ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
              ● {translations[language].connected}
            </span>
          ) : (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                ● {translations[language].disconnected}
              </span>
              {apiStatus.error && (
                <span className="text-[9px] text-slate-500 text-right max-w-[150px] truncate" title={apiStatus.error}>
                  {apiStatus.error}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Side panels (Catalog search & Order tracking) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Catalog Search Panel */}
          <div className="sidebar-section bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <h2 className="text-sm font-semibold font-outfit text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-kapruka-yellow" /> {translations[language].directCatalogQuery}
            </h2>
            <form onSubmit={handleSearchCatalog} className="space-y-2">
              <input 
                type="text" 
                placeholder={translations[language].searchPlaceholder} 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
              />
              <button 
                type="submit" 
                disabled={isSearching}
                className="w-full bg-kapruka-purple hover:bg-kapruka-purple-light text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition duration-200"
              >
                {isSearching ? translations[language].searchingButton : translations[language].searchToolsButton}
              </button>
            </form>
          </div>

          {/* Quick suggestions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">{translations[language].popularGifts}</h3>
            <div className="flex flex-wrap gap-1.5">
              {searchChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip.query)}
                  className="category-chip bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700/60 transition duration-150 flex items-center gap-1"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Order Tracker Summary */}
          <div className="sidebar-section bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <h2 className="text-sm font-semibold font-outfit text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-kapruka-yellow" /> {translations[language].liveOrderTracker}
            </h2>
            <div className="space-y-2">
              <input 
                type="text" 
                placeholder={translations[language].orderNumPlaceholder} 
                value={trackOrderNum}
                onChange={e => setTrackOrderNum(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
              />
              <button
                onClick={async () => {
                  if (!trackOrderNum) return;
                  setIsTrackLoading(true);
                  const startTime = Date.now();
                  try {
                    const res = await fetch(`/api/track?order_number=${trackOrderNum}`);
                    const data = await res.json().catch(() => ({ error: 'Tracking query failed' }));
                    const elapsed = Date.now() - startTime;
                    const delay = Math.max(0, 500 - elapsed);
                    if (delay > 0) {
                      await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    if (res.ok) {
                      setOrderTrackingDetails(data);
                    } else {
                      setOrderTrackingDetails({ text: data.error || 'Order tracking failed.' });
                    }
                  } catch (err) {
                    console.error('Track error:', err);
                    setOrderTrackingDetails({ text: err.message });
                  } finally {
                    setIsTrackLoading(false);
                  }
                }}
                className="w-full border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold py-1.5 px-3 rounded-lg text-xs transition duration-200"
              >
                {isTrackLoading ? translations[language].trackingButton : translations[language].queryTrackerButton}
              </button>
            </div>
            
            {orderTrackingDetails && (
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                {(() => {
                  const resultText = orderTrackingDetails.result || orderTrackingDetails.text || JSON.stringify(orderTrackingDetails);
                  if (typeof resultText === 'string' && (resultText.includes('Error') || resultText.includes('error_not_found'))) {
                    return <p className="font-semibold text-rose-400">{resultText}</p>;
                  }
                  
                  let status = 'Received';
                  const lowerText = typeof resultText === 'string' ? resultText.toLowerCase() : '';
                  if (lowerText.includes('delivered')) status = 'Delivered';
                  else if (lowerText.includes('transit')) status = 'Transit';
                  else if (lowerText.includes('dispatch')) status = 'Dispatch';
                  else if (lowerText.includes('confirmed')) status = 'Confirmed';
                  else if (lowerText.includes('received')) status = 'Received';
                  else if (orderTrackingDetails.status) status = orderTrackingDetails.status;
                  
                  const steps = ['Received', 'Confirmed', 'Dispatch', 'Transit', 'Delivered'];
                  const currentIndex = steps.findIndex(s => s.toLowerCase() === status.toLowerCase());
                  
                  return (
                    <>
                      <p className="font-semibold text-white">{language === 'si' ? 'තත්ත්වය' : 'Status'}: {status}</p>
                      <p>{language === 'si' ? 'බෙදාහැරීම' : 'Dispatch'}: {orderTrackingDetails.dispatch_date || 'Pending'}</p>
                      <p className="mt-1 mb-2 line-clamp-2">{language === 'si' ? 'යාවත්කාලීන කිරීම්' : 'Updates'}: {orderTrackingDetails.last_update || (typeof resultText === 'string' ? resultText : 'In Transit')}</p>
                      <div className="flex flex-col gap-1.5 mt-3 pt-2 border-t border-slate-800/60">
                        {steps.map((step, index) => (
                          <div key={step} className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${index <= currentIndex ? 'bg-kapruka-yellow' : 'bg-slate-700'}`}></div>
                            <span className={index <= currentIndex ? 'text-white font-medium' : 'text-slate-500'}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

        </div>

        {/* Footer Credits */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 text-center text-[10px] text-slate-500">
          Kapruka Agent Challenge v1.0.0
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: Chat Surface + Product Card Panel */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
        {/* Premium radial glowing background */}
        <div className="premium-glow-bg" />

        {/* Main UI Header with Bilingual Selector Toggle */}
        <div className="kapruka-header hidden md:flex bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-4 items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-kapruka-yellow animate-pulse" />
            <span className="text-sm font-bold font-outfit text-white tracking-wide">
              {translations[language].assistantTitle}
            </span>
          </div>
          
          {/* Language Toggle Selector + Dark/Light Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800/80 gap-0.5">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-outfit transition-all duration-150 ${
                  language === 'en'
                    ? 'bg-kapruka-purple text-kapruka-yellow shadow-md shadow-kapruka-purple/30 border border-kapruka-purple-light/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('si')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-150 ${
                  language === 'si'
                    ? 'bg-kapruka-purple text-kapruka-yellow shadow-md shadow-kapruka-purple/30 border border-kapruka-purple-light/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                සිංහල
              </button>
            </div>

            {/* Feature 1: Dark/Light Mode Toggle */}
            <button
              id="dark-mode-toggle"
              onClick={() => setIsDarkMode(prev => !prev)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition-all duration-200 text-base"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark/light mode"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
        
        {rateLimitError && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2 flex items-center justify-between text-xs text-rose-300 z-10">
            <span>⚠️ API Rate Limit Exceeded (60 req/min). Please wait a moment before sending more messages.</span>
            <button onClick={() => setRateLimitError(false)} className="hover:text-rose-100 font-bold" title="Close" aria-label="Close rate limit warning">&times;</button>
          </div>
        )}
        
        {/* Mobile / Tiny Screen Header */}
        <div className="md:hidden p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white mr-1 transition"
              title="Open Menu"
              aria-label="Open Sidebar Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <ShoppingBag className="w-4 h-4 text-kapruka-yellow" />
            <h1 className="text-md font-bold font-outfit text-white">KAPRUKA AI</h1>
          </div>
          <button 
            onClick={() => setIsCartOpen(!isCartOpen)} 
            className="relative p-2 bg-slate-800 rounded-lg text-white"
            title={language === 'si' ? 'කරත්තය විවෘත කරන්න' : 'Toggle Cart'}
            aria-label="Toggle Shopping Cart Drawer"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-kapruka-yellow text-slate-950 font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* Messaging Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10">
          
          {/* Welcome Notification Banner */}
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-kapruka-purple-deep to-slate-900 rounded-xl p-4 border border-kapruka-purple-light/40 flex items-start gap-4 relative overflow-hidden premium-glow-border">
            <Sparkles className="w-6 h-6 text-kapruka-yellow shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs space-y-1 z-10">
              <h4 className="font-bold text-white font-outfit">{translations[language].welcomeTitle}</h4>
              <p className="text-slate-300">{translations[language].welcomeText}</p>
            </div>
          </div>

          {/* Messages Loop */}
          <div className="max-w-2xl mx-auto space-y-4 pt-4">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                {msg.sender === 'agent' && (
                  <div className="w-8 h-8 rounded-lg bg-kapruka-purple flex items-center justify-center border border-kapruka-purple-light text-kapruka-yellow shrink-0 font-bold text-xs">
                    KA
                  </div>
                )}
                
                <div className="flex-1 max-w-[85%] space-y-2">
                  <div className={`rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'chat-bubble-user bg-kapruka-purple text-white rounded-br-none border border-kapruka-purple-light'
                      : 'chat-bubble-ai bg-slate-900/90 text-slate-200 rounded-bl-none border border-slate-800'
                  }`}>
                    {msg.isPlaceholder ? (
                      <div className="flex items-center gap-1.5 py-1 px-1">
                        <span className="w-2 h-2 rounded-full bg-kapruka-yellow animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-kapruka-yellow animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-kapruka-yellow animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-line prose prose-invert">
                        {msg.products && msg.products.length > 0 ? cleanChatText(msg.text) : msg.text}
                      </div>
                    )}
                    {!msg.isPlaceholder && (
                      <span className="text-[10px] text-slate-500 block mt-2 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Inline skeleton loader while search runs */}
                  {msg.isPlaceholder && isSearching && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 max-w-xl animate-pulse">
                      <ProductSkeleton />
                      <ProductSkeleton />
                    </div>
                  )}

                  {/* Inline rich visual product cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 max-w-xl">
                      {msg.products.slice(0, 6).map((product) => (
                        <ProductCard 
                          key={product.product_id || product.id} 
                          product={product} 
                          onAddToCart={addToCart} 
                          language={language}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Visual Product Search Result Grid */}
          {searchResults.length > 0 && (
            <div className="max-w-2xl mx-auto border-t border-slate-800/80 pt-6 mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-outfit text-md font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-kapruka-yellow" /> {translations[language].recommendedGifts}
                </h3>
                <button 
                  onClick={() => setSearchResults([])}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> {translations[language].clearResults}
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {searchResults.slice(0, 6).map((product) => (
                  <ProductCard 
                    key={product.product_id || product.id} 
                    product={product} 
                    onAddToCart={addToCart} 
                    language={language}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 z-10">
          <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-3">
            <input 
              type="text"
              placeholder={translations[language].inputPlaceholder}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-kapruka-purple-light"
            />
            <button 
              type="submit"
              className="bg-kapruka-yellow hover:bg-yellow-dark text-slate-950 font-bold px-5 py-3 rounded-xl transition duration-200 flex items-center justify-center shadow-lg font-outfit"
            >
              {translations[language].sendButton}
            </button>
          </form>
        </div>

      </div>


      {/* 3. CART DRAWER: Visual Shopping Cart & Delivery Checkout Form */}
      {isCartOpen && (
        <div className="kapruka-cart absolute inset-y-0 right-0 z-50 w-full sm:w-96 md:relative md:w-96 bg-slate-900 border-l border-slate-850 flex flex-col h-full text-slate-200">
          
          {/* CART DRAWER CONTENT */}
          {checkoutStep === null ? (
            // Standard Cart Review
            <>
              <div className="p-6 border-b border-slate-850 flex items-center justify-between">
                <h2 className="text-lg font-bold font-outfit text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-kapruka-yellow" /> {translations[language].sidebarHeader}
                </h2>
                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      className="text-[10px] text-rose-400 hover:text-rose-350 font-bold px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
                    >
                      {translations[language].clearCart}
                    </button>
                  )}
                  <span className="bg-kapruka-purple text-white px-2.5 py-0.5 rounded-full text-xs font-bold font-outfit">
                    {cart.reduce((a, b) => a + b.quantity, 0)} {translations[language].itemsBadge}
                  </span>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="md:hidden text-slate-400 hover:text-white p-1"
                    title="Close Cart"
                    aria-label="Close Shopping Cart Drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-60 flex flex-col items-center justify-center text-slate-500 text-center px-4 space-y-2">
                    <ShoppingBag className="w-12 h-12 text-slate-700 animate-bounce" />
                    <p className="text-sm font-semibold">
                      {language === 'si' ? 'ඔබගේ කරත්තය හිස්ය' : language === 'tanglish' ? 'Oyage cart eka empty' : 'Your cart is empty'}
                    </p>
                    <p className="text-xs">
                      {language === 'si' ? 'භාණ්ඩ සෙවීමට සහායකයාගෙන් විමසන්න, නැතහොත් සෙවුම් මෙවලම් භාවිත කරන්න.' : language === 'tanglish' ? 'Agent gen ahanna products hoyanna hari, direct query karන්න...' : 'Ask the agent to find something, or query products directly from the sidebar.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const id = item.product_id || item.id;
                      const title = item.title || item.name || 'Kapruka Gift';
                      const rawPrice = item.price || item.price_lkr;
                      const numPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice || '0').replace(/[^0-9.]/g, '')) || 0;


                      return (
                        <div key={id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 flex gap-3 items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-900 rounded-lg overflow-hidden shrink-0">
                              <img src={item.image || item.image_url || FALLBACK_IMAGE} alt={title} onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE; }} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white line-clamp-1">{title}</h4>
                              <p className="text-kapruka-yellow text-xs font-outfit font-bold">LKR {numPrice.toLocaleString()}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg">
                              <button 
                                onClick={() => updateQuantity(id, -1)} 
                                className="p-1 hover:text-white"
                                title={language === 'si' ? 'ප්‍රමාණය අඩු කරන්න' : 'Decrease quantity'}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold px-2">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(id, 1)} 
                                className="p-1 hover:text-white"
                                title={language === 'si' ? 'ප්‍රමාණය වැඩි කරන්න' : 'Increase quantity'}
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button 
                              onClick={() => removeFromCart(id)} 
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title={language === 'si' ? 'කරත්තයෙන් ඉවත් කරන්න' : 'Remove from cart'}
                              aria-label="Remove item from cart"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Totals & Order Actions */}
              {cart.length > 0 && (
                <div className="p-6 bg-slate-950/80 border-t border-slate-850 space-y-4">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{translations[language].subtotal}</span>
                      <span className="font-bold">LKR {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                      <span>{language === 'si' ? 'භාණ්ඩ එකතුව (තක්සේරුව)' : 'Subtotal Est.'}</span>
                      <span className="font-outfit text-kapruka-yellow text-md">LKR {subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setCheckoutStep(1)}
                    className="w-full font-bold py-3 rounded-xl bg-kapruka-yellow hover:bg-yellow-dark text-slate-950 transition duration-200 shadow-xl text-center block text-sm font-outfit"
                  >
                    {translations[language].proceedToCheckout}
                  </button>
                </div>
              )}
            </>
          ) : (
            // Steps 1 to 4 Wizard Content
            <div className="flex flex-col h-full">
              {/* Header with Step Indicator */}
              <div className="p-6 border-b border-slate-850">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-md font-bold font-outfit text-white">
                    {checkoutStep === 1 && (language === 'si' ? "පියවර 1: ලබන්නා සහ ලිපිනය" : language === 'tanglish' ? "Step 1: Recipient & Address" : "Step 1: Recipient & Address")}
                    {checkoutStep === 2 && (language === 'si' ? "පියවර 2: බෙදා හැරීම සහ තෑග්ග" : language === 'tanglish' ? "Step 2: Delivery & Gift" : "Step 2: Delivery & Gift")}
                    {checkoutStep === 3 && (language === 'si' ? "පියවර 3: යවන්නාගේ තොරතුරු" : language === 'tanglish' ? "Step 3: Sender Details" : "Step 3: Sender Details")}
                    {checkoutStep === 4 && (language === 'si' ? "ඇණවුම තහවුරුයි!" : language === 'tanglish' ? "Order Confirmed!" : "Order Confirmed!")}
                  </h2>
                  {checkoutStep < 4 && (
                    <span className="text-xs text-slate-400 font-semibold font-mono">
                      {language === 'si' ? `පියවර ${checkoutStep} න් 3ක්` : language === 'tanglish' ? `Step ${checkoutStep} of 3` : `Step ${checkoutStep} of 3`}
                    </span>
                  )}
                </div>
                {/* Visual Step Progress Bar */}
                {checkoutStep < 4 && (
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-kapruka-yellow h-full transition-all duration-300"
                      style={{ width: `${(checkoutStep / 3) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Scrollable Wizard Fields */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* STEP 1: Recipient & Address Info */}
                {checkoutStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{translations[language].recipientName}</label>
                      <input 
                        type="text" 
                        placeholder="e.g. John Doe"
                        value={recipientName}
                        onChange={e => setRecipientName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{translations[language].recipientPhone}</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 0771234567"
                        value={recipientPhone}
                        onChange={e => handleRecipientPhoneChange(e.target.value)}
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white focus:outline-none ${
                          recipientPhoneError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-kapruka-purple'
                        }`}
                      />
                      {recipientPhoneError && (
                        <p className="text-[10px] text-rose-400 font-semibold">{recipientPhoneError}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{translations[language].streetAddress}</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 45 Galle Road"
                        value={streetAddress}
                        onChange={e => setStreetAddress(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{translations[language].city}</label>
                        <select 
                          value={isOtherCity ? "other" : (selectedCity || '')}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === "other") {
                              setIsOtherCity(true);
                              setSelectedCity('');
                              setCityQuery('');
                              setCityConfirmed(false);
                            } else {
                              setIsOtherCity(false);
                              setSelectedCity(val);
                              setCityQuery(val);
                              setCityConfirmed(val !== '');
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
                        >
                          <option value="">{language === 'si' ? '-- නගරය තෝරන්න --' : '-- Select City --'}</option>
                          {POPULAR_CITIES.map((c, idx) => (
                            <option key={idx} value={c}>{c}</option>
                          ))}
                          <option value="other">{language === 'si' ? 'වෙනත් නගරයක් සොයන්න...' : 'Search other city...'}</option>
                        </select>
                      </div>

                      {isOtherCity && (
                        <div className="space-y-1 relative animate-fade-in">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {language === 'si' ? 'නගරය සොයන්න' : 'Search City'}
                          </label>
                          <input 
                            type="text" 
                            placeholder={language === 'si' ? 'නම ටයිප් කරන්න (උදා: Colombo)' : 'Type city name...'}
                            value={cityQuery}
                            onChange={e => { 
                              const val = e.target.value;
                              setCityQuery(val); 
                              setCityConfirmed(false);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
                          />
                          {cities.length > 0 && (
                            <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                              {cities.map((city, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCity(city);
                                    setCityQuery(city);
                                    setCities([]);
                                    setCityConfirmed(true);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[11px] text-slate-300 hover:bg-kapruka-purple/20 hover:text-kapruka-yellow border-b border-slate-850"
                                >
                                  {city}
                                </button>
                              ))}
                            </div>
                          )}
                          {!cityConfirmed && cityQuery.length >= 2 && (
                            <p className="text-[9px] text-amber-400 font-semibold mt-1">
                              ⚠️ {language === 'si' ? 'කරුණාකර පහළින් ඇති යෝජනාවලින් එකක් තෝරන්න.' : 'Please click one of the suggestions below to confirm.'}
                            </p>
                          )}
                        </div>
                      )}

                      {!cityConfirmed && (
                        <p className="text-[10px] text-rose-400 font-semibold">
                          ⚠️ {language === 'si' ? 'කරුණාකර වලංගු නගරයක් තෝරන්න.' : 'Please select a valid city from the list.'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{translations[language].locationType}</label>
                      <select
                        value={locationType}
                        onChange={e => setLocationType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
                      >
                        <option value="house">{language === 'si' ? 'නිවස' : 'House'}</option>
                        <option value="apartment">{language === 'si' ? 'මහල් නිවාසය' : 'Apartment'}</option>
                        <option value="office">{language === 'si' ? 'කාර්යාලය' : 'Office'}</option>
                        <option value="other">{language === 'si' ? 'වෙනත්' : 'Other'}</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 2: Delivery Date & Gift Message */}
                {checkoutStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {translations[language].deliveryDate}
                        <span className="ml-1 font-normal text-slate-500 normal-case">(tomorrow – 90 days)</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="date" 
                          min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                          max={(() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString().split('T')[0]; })()}
                          value={deliveryDate}
                          onChange={e => {
                            const val = formatDateToYYYYMMDD(e.target.value);
                            setDeliveryDate(val);
                            validateDeliveryDate(val);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
                        />
                      </div>
                      
                      {deliveryDate && !dateError && (
                        <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                          <span>📅</span>
                          <span>
                            {language === 'si' ? 'තෝරාගත් දිනය: ' : 'Selected: '}
                            {new Date(deliveryDate).toLocaleDateString(language === 'si' ? 'si-LK' : 'en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                        </p>
                      )}

                      {dateError && (
                        <p className="text-[10px] text-rose-400 font-semibold mt-1">
                          {dateError}
                        </p>
                      )}
                    </div>

                    {isCheckingDelivery && (
                      <div className="text-xs text-kapruka-yellow flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-3.5 h-3.5" /> {language === 'si' ? 'බෙදා හැරීමේ ගාස්තු සහ පවතින බව පරීක්ෂා කරමින්...' : language === 'tanglish' ? 'Validating delivery rate and availability...' : 'Validating delivery rate and availability...'}
                      </div>
                    )}

                    {deliveryError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs font-semibold">
                        ⚠️ {deliveryError}
                      </div>
                    )}

                    {deliveryFee !== null && !deliveryError && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold">
                        {language === 'si' ? `✓ බෙදා හැරීම සිදු කළ හැක! ගාස්තුව: LKR ${deliveryFee.toLocaleString()}` : language === 'tanglish' ? `✓ Delivery available! Flat shipping rate: LKR ${deliveryFee.toLocaleString()}` : `✓ Delivery available! Flat shipping rate: LKR ${deliveryFee.toLocaleString()}`}
                      </div>
                    )}

                    {hasPerishableItems() && deliveryDate && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-xs font-semibold">
                        {language === 'si' ? '⚠️ ඉක්මනින් නරක් වන ද්‍රව්‍ය අඩංගු වේ. කරුණාකර ලබන්නා සිටින බව තහවුරු කරගන්න.' : language === 'tanglish' ? '⚠️ Contains perishable items. Please ensure someone is present at the delivery location.' : '⚠️ Contains perishable items. Please ensure someone is present at the delivery location.'}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{translations[language].greetingCard}</label>
                      <textarea 
                        rows={3}
                        placeholder="e.g. Happy Birthday Mom! Wish you a great day."
                        value={giftMessage}
                        onChange={e => setGiftMessage(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{translations[language].deliveryInstructions}</label>
                      <textarea 
                        rows={2}
                        placeholder="e.g. Ring the bell twice / Blue gate / Near the supermarket"
                        value={deliveryInstructions}
                        onChange={e => setDeliveryInstructions(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: Sender Details */}
                {checkoutStep === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
                      <label htmlFor="send-anonymously" className="text-xs cursor-pointer flex-1">
                        <p className="font-bold text-white">{translations[language].sendAnonymously}</p>
                        <p className="text-[10px] text-slate-400">Keep your identity hidden from the recipient</p>
                      </label>
                      <input 
                        type="checkbox" 
                        id="send-anonymously"
                        checked={sendAnonymously}
                        onChange={e => setSendAnonymously(e.target.checked)}
                        className="w-4 h-4 accent-kapruka-yellow"
                        title="Send Anonymously"
                      />
                    </div>

                    {!sendAnonymously && (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{translations[language].senderName}</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Jane Doe"
                            value={senderName}
                            onChange={e => setSenderName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-kapruka-purple"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{translations[language].senderPhone}</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 0777654321"
                            value={senderPhone}
                            onChange={e => handleSenderPhoneChange(e.target.value)}
                            className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white focus:outline-none ${
                              senderPhoneError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-kapruka-purple'
                            }`}
                          />
                          {senderPhoneError && (
                            <p className="text-[10px] text-rose-400 font-semibold">{senderPhoneError}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{translations[language].senderEmail}</label>
                          <input 
                            type="email" 
                            placeholder="e.g. jane@example.com"
                            value={senderEmail}
                            onChange={e => handleSenderEmailChange(e.target.value)}
                            className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-white focus:outline-none ${
                              senderEmailError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-kapruka-purple'
                            }`}
                          />
                          {senderEmailError && (
                            <p className="text-[10px] text-rose-400 font-semibold">{senderEmailError}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Order summary */}
                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2 text-xs">
                      <h4 className="font-bold text-white font-outfit border-b border-slate-800 pb-1.5 mb-2">{translations[language].grandTotalSummary}</h4>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{translations[language].subtotal}</span>
                        <span>LKR {subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{translations[language].deliveryFee}</span>
                        <span className="text-kapruka-yellow">LKR {(deliveryFee || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold text-white">
                        <span>{translations[language].totalPay}</span>
                        <span className="text-kapruka-yellow">LKR {total.toLocaleString()}</span>
                      </div>
                      
                      {/* Notice about shipping rate differences */}
                      <div className="text-[10px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 mt-3 italic leading-normal flex items-start gap-1">
                        <span>💡</span>
                        <span>
                          {language === 'si' 
                            ? 'සටහන: මෙහි පෙන්වා ඇත්තේ සම්මත වාහන ගාස්තුවයි. කුඩා අයිතම සඳහා කප්රුක අවසන් ගෙවීමේ පිටුවේ මීට වඩා අඩු මුදලක් අය විය හැක.' 
                            : language === 'tanglish' 
                              ? 'Note: Methana thiyenne standard vehicle delivery fee eka. Kapruka final payment page eke podi items walata meeta wada adu wenna puluwan.' 
                              : 'Note: The delivery fee listed is the standard flat vehicle quote. The final Kapruka payment page might charge a lower rate for smaller packages.'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Confirmation Screen */}
                {checkoutStep === 4 && confirmedOrder && (
                  <div className="text-center py-6 space-y-5 animate-fade-in">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-3xl">
                      ✓
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold font-outfit text-white">{translations[language].orderCreatedSuccess}</h3>
                      <p className="text-xs text-slate-400">
                        {language === 'si' ? 'ඔබගේ ඇණවුම සාර්ථකව සකස් කර ඇති අතර දැන් ගෙවීම් කළ හැක.' : language === 'tanglish' ? 'Oyage order eka create wela thiyenne, dan pay karanna puluwan.' : 'Your order has been locked and is ready for payment.'}
                      </p>
                    </div>

                    <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3 text-xs text-left">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{language === 'si' ? 'ඇණවුම් අංකය:' : 'Order Reference:'}</span>
                        <span className="font-mono font-bold text-white">{confirmedOrder.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{language === 'si' ? 'මුළු මුදල:' : 'Grand Total:'}</span>
                        <span className="font-bold text-kapruka-yellow">LKR {confirmedOrder.total.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-slate-850 mt-2 pt-2 space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500">Recipient:</span>
                          <span className="text-slate-300">{recipientName}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500">Delivery Address:</span>
                          <span className="text-slate-300 text-right max-w-[150px] truncate">{streetAddress}, {selectedCity}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500">Delivery Date:</span>
                          <span className="text-slate-300">{deliveryDate}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500">Delivery Fee:</span>
                          <span className="text-slate-300">LKR {(deliveryFee || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <ExpirationCountdown minutes={60} />

                    {confirmedOrder.checkout_url ? (
                      <a 
                        href={confirmedOrder.checkout_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-kapruka-yellow hover:bg-yellow-dark text-slate-950 font-bold py-3.5 rounded-xl transition duration-200 shadow-lg text-center block text-sm animate-pulse-yellow font-outfit"
                      >
                        {language === 'si' ? '🛒 දැන් කප්රුකාවේ ගෙවීම් කරන්න' : language === 'tanglish' ? '🛒 Kapruka eke payment karanna' : '🛒 Complete Payment on Kapruka'}
                      </a>
                    ) : (
                      <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                        {language === 'si' ? '✓ ඇණවුම ලබාදී ඇත! ගෙවීම සිදු කිරීමට kapruka.com වෙත පිවිසෙන්න.' : 'Order placed! Please visit kapruka.com to complete payment.'}
                      </p>
                    )}

                    <button
                      onClick={() => {
                        setCheckoutStep(null);
                        setConfirmedOrder(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      {language === 'si' ? 'නැවත සාප්පුව වෙත' : 'Back to Shop'}
                    </button>
                  </div>
                )}

              </div>

              {/* Step Navigation Buttons Footer */}
              {checkoutStep < 4 && (
                <div className="p-6 bg-slate-950/80 border-t border-slate-850 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (checkoutStep === 1) {
                        setCheckoutStep(null);
                      } else {
                        setCheckoutStep(prev => prev - 1);
                      }
                    }}
                    className="flex-1 border border-slate-800 hover:bg-slate-800 font-bold py-2.5 rounded-xl text-xs transition duration-150 text-center text-slate-300"
                  >
                    {checkoutStep === 1 ? translations[language].backToCart : translations[language].back}
                  </button>
                  
                  {checkoutStep === 1 && (
                    <button
                      type="button"
                      disabled={!recipientName || !recipientPhone || !!recipientPhoneError || !streetAddress || !cityQuery || !cityConfirmed}
                      onClick={() => {
                        setCheckoutStep(2);
                      }}
                      className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition duration-150 text-center ${
                        recipientName && recipientPhone && !recipientPhoneError && streetAddress && cityQuery && cityConfirmed
                          ? 'bg-kapruka-yellow text-slate-950 hover:bg-yellow-dark'
                          : 'bg-slate-850 text-slate-500 cursor-not-allowed border border-slate-800'
                      }`}
                    >
                      {translations[language].next}
                    </button>
                  )}

                  {checkoutStep === 2 && (
                    <button
                      type="button"
                      disabled={!deliveryDate || isCheckingDelivery || !!dateError}
                      onClick={() => setCheckoutStep(3)}
                      className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition duration-150 text-center ${
                        deliveryDate && !isCheckingDelivery && !dateError
                          ? 'bg-kapruka-yellow text-slate-950 hover:bg-yellow-dark'
                          : 'bg-slate-850 text-slate-500 cursor-not-allowed border border-slate-800'
                      }`}
                    >
                      {translations[language].next}
                    </button>
                  )}

                  {checkoutStep === 3 && (
                    <button
                      type="button"
                      disabled={isCheckingDelivery || (!sendAnonymously && (!senderName || !!senderPhoneError || !!senderEmailError))}
                      onClick={handlePlaceOrder}
                      className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition duration-150 text-center ${
                        !isCheckingDelivery && (sendAnonymously || (senderName && !senderPhoneError && !senderEmailError))
                          ? 'bg-kapruka-yellow text-slate-950 hover:bg-yellow-dark animate-pulse-yellow'
                          : 'bg-slate-850 text-slate-500 cursor-not-allowed border border-slate-800'
                      }`}
                    >
                      {isCheckingDelivery ? translations[language].placingOrder : translations[language].placeOrder}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
