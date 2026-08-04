CREATE TABLE public.ethan_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'personal',
  content text NOT NULL,
  importance smallint NOT NULL DEFAULT 3,
  source text NOT NULL DEFAULT 'chat',
  last_referenced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ethan_memories_category_check CHECK (category IN ('personal','goal','preference','event','training','nutrition','injury')),
  CONSTRAINT ethan_memories_importance_check CHECK (importance BETWEEN 1 AND 5),
  CONSTRAINT ethan_memories_content_len CHECK (char_length(content) BETWEEN 1 AND 500)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ethan_memories TO authenticated;
GRANT ALL ON public.ethan_memories TO service_role;

ALTER TABLE public.ethan_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own Ethan memories"
ON public.ethan_memories FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_ethan_memories_updated
BEFORE UPDATE ON public.ethan_memories
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_ethan_memories_user ON public.ethan_memories (user_id, importance DESC, updated_at DESC);
CREATE UNIQUE INDEX idx_ethan_memories_unique ON public.ethan_memories (user_id, lower(content));

ALTER TABLE public.ethan_messages ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_ethan_messages_user_created ON public.ethan_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ethan_messages_user_active ON public.ethan_messages (user_id, archived, created_at DESC);

ALTER TABLE public.ethan_memory_summaries ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.ethan_memory_summaries ADD COLUMN IF NOT EXISTS covered_through timestamptz;