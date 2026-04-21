# MILZ Resend + Supabase Auth mail setup

この実装は **Supabase Auth の確認メール / マジックリンク / パスワード再設定メール** を、
**Resend の SMTP** と **MILZデザインのHTMLテンプレート** で送る前提です。

## 1. Resend 側

1. Resend で送信ドメインを verify する
2. 送信元アドレスを決める
   - 例: `auth@milz.tech`
3. API key を用意する

Resend の SMTP 情報:
- Host: `smtp.resend.com`
- Port: `465` か `587`
- Username: `resend`
- Password: **Resend API Key**

## 2. Supabase 側 SMTP 設定

Supabase Dashboard → Authentication → SMTP Settings

入力例:
- Enable Custom SMTP: ON
- Sender email: `auth@milz.tech`
- Sender name: `MILZ`
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: `YOUR_RESEND_API_KEY`

Supabase はカスタム SMTP に対応していて、認証メールの本文HTMLもカスタマイズできます。
Resend は SMTP 接続で `smtp.resend.com` / username `resend` / password に API key を使います。 citeturn207189view0turn984779search0

## 3. Supabase 側メールテンプレート

Supabase Dashboard → Authentication → Emails

下記テンプレートへ、それぞれ対応ファイルの HTML を貼ってください。

- Confirm signup → `auth-email/confirm-signup.html`
- Magic Link → `auth-email/magic-link.html`
- Reset Password → `auth-email/reset-password.html`

Supabase のメールテンプレートは HTML を使え、`{{ .ConfirmationURL }}` `{{ .Email }}` `{{ .SiteURL }}` などの変数が使えます。 citeturn203926search0turn203926search1

## 4. 件名の例

### Confirm signup
- JP: `MILZ｜メールアドレスを確認してください`
- EN: `MILZ | Confirm your email`

### Magic link
- JP: `MILZ｜サインインリンク`
- EN: `MILZ | Your sign-in link`

### Reset password
- JP: `MILZ｜パスワード再設定`
- EN: `MILZ | Reset your password`

## 5. このコード変更

- サインアップ時に `user_metadata.language` へ `jp / en` を保存
- テンプレート内で `{{ if eq .Data.language "jp" }}` を使って JP / EN を出し分け
- `emailRedirectTo` を `window.location.origin` に設定

## 6. 注意

この変更は **repo を push するだけでは送信見た目は変わりません**。
**Supabase Dashboard で SMTP と Emails の設定反映** が必要です。
