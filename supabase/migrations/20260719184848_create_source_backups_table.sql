CREATE TABLE IF NOT EXISTS source_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  content_base64 text NOT NULL,
  size_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE source_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_source_backups" ON source_backups FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_source_backups" ON source_backups FOR INSERT
  TO authenticated WITH CHECK (true);
