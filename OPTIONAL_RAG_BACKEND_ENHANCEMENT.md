# OPTIONAL: Enhanced RAG Backend for AI Area Analyst

## Overview

This document describes **OPTIONAL** backend enhancements to improve the RAG (Retrieval-Augmented Generation) system for the AI Area Analyst. These are **NOT required** - the current implementation works perfectly with direct database queries.

**Current Implementation:** Works by directly querying `area_journals` table and injecting data as system context.

**Optional Enhancement:** Adds vector search for semantic similarity, enabling the AI to find relevant content even when user questions don't match exact keywords.

---

## OPTIONAL SQL Migration

```sql
-- ============================================
-- OPTIONAL: Enhanced RAG with Vector Search
-- ============================================
-- This is OPTIONAL - only add if you want semantic search
-- Current RAG implementation works without this

-- Step 1: Enable pgvector extension (Supabase supports this)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column to area_journals
-- This stores vector embeddings of journal content
ALTER TABLE area_journals 
ADD COLUMN IF NOT EXISTS embedding vector(1536); -- OpenAI embeddings are 1536 dimensions

-- Step 3: Add embedding column to area_journal_contributions
ALTER TABLE area_journal_contributions
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 4: Create indexes for fast similarity search
CREATE INDEX IF NOT EXISTS area_journals_embedding_idx 
ON area_journals 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100); -- Adjust lists based on your data size

CREATE INDEX IF NOT EXISTS area_journal_contributions_embedding_idx 
ON area_journal_contributions 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 5: Create function to generate embeddings (requires OpenAI API)
-- This would be called via Edge Function or API route
-- Function signature:
-- generate_embedding(text_content: text) -> vector(1536)

-- Step 6: Create function to find similar content
CREATE OR REPLACE FUNCTION find_similar_area_content(
  query_embedding vector(1536),
  area_slug_param text,
  similarity_threshold float DEFAULT 0.7,
  result_limit int DEFAULT 5
)
RETURNS TABLE (
  content_type text,
  content_text text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  -- Search in journal content
  SELECT 
    'journal'::text,
    (aj.driving_factors::text || ' ' || COALESCE(aj.risks::text, '') || ' ' || COALESCE(aj.takeaway, '')),
    1 - (aj.embedding <=> query_embedding) as similarity
  FROM area_journals aj
  WHERE aj.slug = area_slug_param
    AND aj.embedding IS NOT NULL
    AND 1 - (aj.embedding <=> query_embedding) > similarity_threshold
  
  UNION ALL
  
  -- Search in contributor notes
  SELECT 
    'contribution'::text,
    ajc.note,
    1 - (ajc.embedding <=> query_embedding) as similarity
  FROM area_journal_contributions ajc
  WHERE ajc.area_slug = area_slug_param
    AND ajc.verified = true
    AND ajc.embedding IS NOT NULL
    AND 1 - (ajc.embedding <=> query_embedding) > similarity_threshold
  
  ORDER BY similarity DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_similar_area_content TO authenticated;
```

---

## OPTIONAL Edge Function (Supabase)

If you want to generate embeddings automatically, create a Supabase Edge Function:

**File:** `supabase/functions/generate-embeddings/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  try {
    const { journalId, content } = await req.json();
    
    // Generate embedding using OpenAI
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small", // or text-embedding-ada-002
        input: content,
      }),
    });
    
    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;
    
    // Store embedding in database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    await supabase
      .from("area_journals")
      .update({ embedding })
      .eq("id", journalId);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

---

## OPTIONAL API Route Enhancement

**File:** `app/api/chat/route.ts` (enhanced version)

```typescript
// OPTIONAL: Enhanced RAG with vector search
// Only use this if you've set up vector embeddings

if (areaContext && openaiApiKey) {
  try {
    // Generate embedding for user query
    const queryEmbeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: message,
      }),
    });
    
    const queryEmbeddingData = await queryEmbeddingResponse.json();
    const queryEmbedding = queryEmbeddingData.data[0].embedding;
    
    // Find similar content using vector search
    const { data: similarContent } = await supabase.rpc(
      "find_similar_area_content",
      {
        query_embedding: queryEmbedding,
        area_slug_param: areaContext.areaSlug,
        similarity_threshold: 0.7,
        result_limit: 5,
      }
    );
    
    // Build enhanced system context with similar content
    let enhancedContext = systemContext;
    if (similarContent && similarContent.length > 0) {
      enhancedContext += "\n\nRELEVANT CONTENT:\n";
      similarContent.forEach((item: any) => {
        enhancedContext += `- ${item.content_type}: ${item.content_text}\n`;
      });
    }
    
    // Use enhanced context with OpenAI...
  } catch (error) {
    // Fallback to direct query method
  }
}
```

---

## When to Use This

**Use vector search if:**
- You have many areas with extensive content
- Users ask questions in varied ways
- You want semantic understanding (not just keyword matching)
- You're willing to generate and store embeddings

**Stick with current implementation if:**
- You have a manageable number of areas
- Direct database queries work well
- You want simplicity
- You don't want to manage embeddings

---

## Cost Considerations

- **OpenAI Embeddings:** ~$0.0001 per 1K tokens
- **Storage:** Vector columns add ~6KB per journal entry
- **Compute:** Vector similarity search is fast with indexes

**Current implementation has zero additional cost** - it uses existing database queries.

---

## Summary

**Current RAG:** ✅ Works perfectly, zero cost, simple
**Optional Enhancement:** More powerful, requires setup, adds cost

Choose based on your needs. The current implementation is production-ready and provides excellent results.

