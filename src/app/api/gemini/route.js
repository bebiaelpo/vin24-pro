import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const payload = await req.json();
    
    // Grabs the hidden API key securely from Vercel's server environment
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Uses the exact model endpoint your original frontend code relied on
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI Route Error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI' }, { status: 500 });
  }
}