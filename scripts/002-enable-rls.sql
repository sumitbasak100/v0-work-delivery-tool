-- Enable Row Level Security on all tables

-- Users table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own data
CREATE POLICY "Users can view own data" ON users 
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own data" ON users 
  FOR UPDATE USING (auth.uid() = id);
  
CREATE POLICY "Users can insert own data" ON users 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects table RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own projects
CREATE POLICY "Users can view own projects" ON projects 
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can create own projects" ON projects 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own projects" ON projects 
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own projects" ON projects 
  FOR DELETE USING (auth.uid() = user_id);

-- Public access to active projects via share_id (for clients)
CREATE POLICY "Public can view active shared projects" ON projects 
  FOR SELECT USING (is_active = true);

-- Files table RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Users can manage files in their own projects
CREATE POLICY "Users can view files in own projects" ON files 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = files.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create files in own projects" ON files 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = files.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update files in own projects" ON files 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = files.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete files in own projects" ON files 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = files.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Public can view files in active shared projects
CREATE POLICY "Public can view files in shared projects" ON files 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = files.project_id 
      AND projects.is_active = true
    )
  );

-- Public can update file status (for approvals)
CREATE POLICY "Public can update file status" ON files 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = files.project_id 
      AND projects.is_active = true
    )
  );

-- File versions table RLS
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;

-- Users can manage versions of files in their own projects
CREATE POLICY "Users can view versions in own projects" ON file_versions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM files 
      JOIN projects ON projects.id = files.project_id 
      WHERE files.id = file_versions.file_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions in own projects" ON file_versions 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM files 
      JOIN projects ON projects.id = files.project_id 
      WHERE files.id = file_versions.file_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete versions in own projects" ON file_versions 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM files 
      JOIN projects ON projects.id = files.project_id 
      WHERE files.id = file_versions.file_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Public can view versions in active shared projects
CREATE POLICY "Public can view versions in shared projects" ON file_versions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM files 
      JOIN projects ON projects.id = files.project_id 
      WHERE files.id = file_versions.file_id 
      AND projects.is_active = true
    )
  );

-- Feedback table RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can view feedback on files in their own projects
CREATE POLICY "Users can view feedback in own projects" ON feedback 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM files 
      JOIN projects ON projects.id = files.project_id 
      WHERE files.id = feedback.file_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Users can delete feedback on files in their own projects
CREATE POLICY "Users can delete feedback in own projects" ON feedback 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM files 
      JOIN projects ON projects.id = files.project_id 
      WHERE files.id = feedback.file_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Public can add feedback to files in active shared projects
CREATE POLICY "Public can add feedback to shared projects" ON feedback 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM files 
      JOIN projects ON projects.id = files.project_id 
      WHERE files.id = feedback.file_id 
      AND projects.is_active = true
    )
  );

-- Public can view feedback in active shared projects
CREATE POLICY "Public can view feedback in shared projects" ON feedback 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM files 
      JOIN projects ON projects.id = files.project_id 
      WHERE files.id = feedback.file_id 
      AND projects.is_active = true
    )
  );
