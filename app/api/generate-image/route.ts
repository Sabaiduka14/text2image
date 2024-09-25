import { NextResponse } from 'next/server';
import * as fal from "@fal-ai/serverless-client";
import { createClient } from '@supabase/supabase-js';

fal.config({
  credentials: process.env.FAL_KEY,
});

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key is missing');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

interface FalResult {
  images?: { url: string }[];
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: 'Fal AI key is not configured' }, { status: 500 });
    }

    const result = await fal.subscribe("fal-ai/aura-flow", {
      input: {
        prompt: prompt,
        num_images: 1,
        guidance_scale: 3.5,
        num_inference_steps: 50,
        expand_prompt: true
      },
    }) as FalResult;

    if (!result || !result.images || result.images.length === 0) {
      console.error('Unexpected result from Fal AI:', result);
      return NextResponse.json({ error: 'No image was generated' }, { status: 500 });
    }

    const imageUrl = result.images[0].url;

    // Save the image to Supabase
    const { data, error } = await supabase
      .from('generated_images')
      .insert([
        { url: imageUrl, prompt: prompt, created_at: new Date().toISOString() }
      ])
      .select();

    if (error) {
      console.error('Error saving to Supabase:', error);
      return NextResponse.json({ error: `Failed to save image: ${error.message}` }, { status: 500 });
    }

    if (!data) {
      console.error('No data returned from Supabase insert');
      return NextResponse.json({ error: 'Failed to save image: No data returned' }, { status: 500 });
    }

    return NextResponse.json({ url: imageUrl });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('generated_images')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: `Failed to fetch images: ${error.message}` }, { status: 500 });
    }

    if (!data) {
      console.warn('No data returned from Supabase');
      return NextResponse.json([]);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching images:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch images' }, { status: 500 });
  }
}