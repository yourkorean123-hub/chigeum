-- ============================================================
-- RLS (Row Level Security) ポリシー設定
-- 電話韓国語 チグム / Supabase
--
-- 実行手順:
-- Supabase ダッシュボード > SQL Editor に貼り付けて実行してください。
-- 既存のポリシーがある場合は DROP POLICY 文を先に実行してください。
-- ============================================================


-- ============================================================
-- ヘルパー関数: 現在ユーザーのロールを取得
-- SECURITY DEFINER により、この関数は RLS をバイパスして profiles を参照する。
-- profiles の RLS で再帰呼び出しが起きるのを防ぐために必要。
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;


-- ============================================================
-- profiles テーブル
-- カラム: id, role, coach_id, line_id, course, frequency, duration
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 自分のプロフィール、または管理者は全件閲覧可能
CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- サインアップ直後に自分のプロフィールを作成できる
-- ここでは「認証済みユーザー自身」が自分のレコードを作成できることを明示する
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

CREATE POLICY "profiles_insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
  );

-- 自分のプロフィールを更新可能、管理者は全件更新可能
CREATE POLICY "profiles_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR get_user_role() = 'admin'
  );


-- ============================================================
-- coaches テーブル
-- カラム: id, name, bio, photo_url, availability_text, is_active,
--        display_order, tags, created_at
-- ============================================================
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- ・承認済みコーチ (is_active = true) は未認証を含む誰でも閲覧可能（コーチ一覧ページ）
-- ・コーチ本人は自分のレコードを閲覧可能（承認待ちでも）
-- ・管理者は全件閲覧可能
CREATE POLICY "coaches_select"
  ON public.coaches
  FOR SELECT
  USING (
    is_active = true
    OR id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- コーチ登録時に自分のレコードを作成できる（is_active = false で登録）
CREATE POLICY "coaches_insert"
  ON public.coaches
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- コーチ本人はプロフィールを編集可能、管理者は is_active 含む全フィールドを更新可能
CREATE POLICY "coaches_update"
  ON public.coaches
  FOR UPDATE
  USING (
    id = auth.uid()
    OR get_user_role() = 'admin'
  );


-- ============================================================
-- coach_schedule テーブル
-- カラム: id, coach_id, day_of_week, hour, minute, is_open, updated_at
-- ============================================================
ALTER TABLE public.coach_schedule ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザー全員が閲覧可能（生徒が予約時にコーチの空き時間を確認するため）
CREATE POLICY "coach_schedule_select"
  ON public.coach_schedule
  FOR SELECT
  TO authenticated
  USING (true);

-- コーチは自分のスケジュールを登録できる
CREATE POLICY "coach_schedule_insert"
  ON public.coach_schedule
  FOR INSERT
  WITH CHECK (coach_id = auth.uid());

-- コーチは自分のスケジュールを更新できる（upsert も対象）
CREATE POLICY "coach_schedule_update"
  ON public.coach_schedule
  FOR UPDATE
  USING (coach_id = auth.uid());

-- コーチは自分のスケジュールを削除できる
CREATE POLICY "coach_schedule_delete"
  ON public.coach_schedule
  FOR DELETE
  USING (coach_id = auth.uid());


-- ============================================================
-- lesson_bookings テーブル
-- カラム: id, student_id, coach_id, day_of_week, hour, minute,
--        duration_min, method, contact, status, created_at
-- ============================================================
ALTER TABLE public.lesson_bookings ENABLE ROW LEVEL SECURITY;

-- 生徒は自分の予約を、コーチは担当する予約を、管理者は全件閲覧可能
CREATE POLICY "lesson_bookings_select"
  ON public.lesson_bookings
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR coach_id = auth.uid()
    OR get_user_role() = 'admin'
  );

-- 生徒のみ予約を作成できる（student_id に自分の ID が入っていることを強制）
CREATE POLICY "lesson_bookings_insert"
  ON public.lesson_bookings
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- コーチは担当する予約のステータス（pending/approved/rejected）を変更できる
-- 管理者は全件更新可能
CREATE POLICY "lesson_bookings_update"
  ON public.lesson_bookings
  FOR UPDATE
  USING (
    coach_id = auth.uid()
    OR get_user_role() = 'admin'
  );


-- ============================================================
-- lesson_access テーブル
-- カラム: id, student_id, course_id, lesson_number, status, requested_at
-- ============================================================
ALTER TABLE public.lesson_access ENABLE ROW LEVEL SECURITY;

-- 生徒は自分の申請を閲覧可能
-- コーチは profiles.coach_id 経由で担当生徒の申請のみ閲覧可能
-- 管理者は全件閲覧可能
CREATE POLICY "lesson_access_select"
  ON public.lesson_access
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR get_user_role() = 'admin'
    OR (
      get_user_role() = 'coach'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = lesson_access.student_id
          AND profiles.coach_id = auth.uid()
      )
    )
  );

-- 生徒のみ教材アクセスを申請できる
CREATE POLICY "lesson_access_insert"
  ON public.lesson_access
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- コーチは担当生徒の申請を承認（status 更新）できる
-- 管理者は全件更新可能
CREATE POLICY "lesson_access_update"
  ON public.lesson_access
  FOR UPDATE
  USING (
    get_user_role() = 'admin'
    OR (
      get_user_role() = 'coach'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = lesson_access.student_id
          AND profiles.coach_id = auth.uid()
      )
    )
  );


-- ============================================================
-- Storage: coach-photos バケット
-- ファイル名形式: {userId}.{ext}
-- ============================================================

-- コーチ写真は誰でも閲覧可能（公開バケット相当）
CREATE POLICY "coach_photos_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'coach-photos');

-- 認証済みユーザーが自分の ID で始まるファイルのみアップロード可能
CREATE POLICY "coach_photos_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'coach-photos'
    AND auth.uid() IS NOT NULL
    AND name LIKE auth.uid()::text || '.%'
  );

-- 自分のファイルのみ更新可能
CREATE POLICY "coach_photos_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'coach-photos'
    AND auth.uid() IS NOT NULL
    AND name LIKE auth.uid()::text || '.%'
  );

-- 自分のファイルのみ削除可能（管理者は別途 service_role で対応）
CREATE POLICY "coach_photos_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'coach-photos'
    AND auth.uid() IS NOT NULL
    AND name LIKE auth.uid()::text || '.%'
  );
