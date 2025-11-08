import { Injectable } from '@nestjs/common';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailTemplates {
  /**
   * Email verification template
   */
  getVerificationEmail(
    username: string,
    verificationUrl: string,
    lang: 'tr' | 'en' = 'tr',
  ): EmailTemplate {
    if (lang === 'tr') {
      return {
        subject: 'Email Adresinizi Doğrulayın - AsforceS Voice',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .button:hover { background: #5568d3; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎤 AsforceS Voice</h1>
                <p>Hoş Geldiniz!</p>
              </div>
              <div class="content">
                <h2>Merhaba ${username},</h2>
                <p>AsforceS Voice'a kaydolduğunuz için teşekkür ederiz! Hesabınızı aktifleştirmek için email adresinizi doğrulamanız gerekmektedir.</p>
                <p>Aşağıdaki butona tıklayarak email adresinizi doğrulayabilirsiniz:</p>
                <center>
                  <a href="${verificationUrl}" class="button">Email Adresimi Doğrula</a>
                </center>
                <p>Eğer buton çalışmazsa, aşağıdaki linki tarayıcınıza kopyalayabilirsiniz:</p>
                <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                <div class="warning">
                  <strong>⚠️ Güvenlik Uyarısı:</strong>
                  <ul>
                    <li>Bu link 24 saat geçerlidir</li>
                    <li>Bu kaydı siz yapmadıysanız, bu emaili görmezden gelebilirsiniz</li>
                    <li>Şifrenizi asla kimseyle paylaşmayın</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
                <p>© 2025 AsforceS Voice. Tüm hakları saklıdır.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Merhaba ${username},

AsforceS Voice'a kaydolduğunuz için teşekkür ederiz!

Hesabınızı aktifleştirmek için aşağıdaki linke tıklayın:
${verificationUrl}

Bu link 24 saat geçerlidir.

Bu kaydı siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.

© 2025 AsforceS Voice
        `,
      };
    }

    // English version
    return {
      subject: 'Verify Your Email - AsforceS Voice',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background: #5568d3; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎤 AsforceS Voice</h1>
              <p>Welcome!</p>
            </div>
            <div class="content">
              <h2>Hello ${username},</h2>
              <p>Thank you for signing up with AsforceS Voice! To activate your account, you need to verify your email address.</p>
              <p>Click the button below to verify your email:</p>
              <center>
                <a href="${verificationUrl}" class="button">Verify My Email</a>
              </center>
              <p>If the button doesn't work, you can copy this link to your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                  <li>This link is valid for 24 hours</li>
                  <li>If you didn't make this registration, you can ignore this email</li>
                  <li>Never share your password with anyone</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>© 2025 AsforceS Voice. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${username},

Thank you for signing up with AsforceS Voice!

To activate your account, click the link below:
${verificationUrl}

This link is valid for 24 hours.

If you didn't make this registration, you can ignore this email.

© 2025 AsforceS Voice
      `,
    };
  }

  /**
   * Password reset template
   */
  getPasswordResetEmail(
    username: string,
    resetUrl: string,
    lang: 'tr' | 'en' = 'tr',
  ): EmailTemplate {
    if (lang === 'tr') {
      return {
        subject: 'Şifre Sıfırlama Talebi - AsforceS Voice',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .button:hover { background: #c82333; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔒 Şifre Sıfırlama</h1>
              </div>
              <div class="content">
                <h2>Merhaba ${username},</h2>
                <p>Hesabınız için şifre sıfırlama talebi aldık. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
                <center>
                  <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
                </center>
                <p>Eğer buton çalışmazsa, aşağıdaki linki tarayıcınıza kopyalayabilirsiniz:</p>
                <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
                <div class="warning">
                  <strong>⚠️ Önemli Güvenlik Uyarısı:</strong>
                  <ul>
                    <li>Bu link 1 saat geçerlidir</li>
                    <li>Bu talebi siz yapmadıysanız, derhal şifrenizi değiştirin!</li>
                    <li>Link sadece bir kez kullanılabilir</li>
                    <li>Şifrenizi asla kimseyle paylaşmayın</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
                <p>© 2025 AsforceS Voice. Tüm hakları saklıdır.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Merhaba ${username},

Hesabınız için şifre sıfırlama talebi aldık.

Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:
${resetUrl}

Bu link 1 saat geçerlidir ve sadece bir kez kullanılabilir.

Bu talebi siz yapmadıysanız, derhal şifrenizi değiştirin!

© 2025 AsforceS Voice
        `,
      };
    }

    // English version
    return {
      subject: 'Password Reset Request - AsforceS Voice',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background: #c82333; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${username},</h2>
              <p>We received a password reset request for your account. Click the button below to reset your password:</p>
              <center>
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </center>
              <p>If the button doesn't work, you can copy this link to your browser:</p>
              <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <ul>
                  <li>This link is valid for 1 hour</li>
                  <li>If you didn't request this, change your password immediately!</li>
                  <li>This link can only be used once</li>
                  <li>Never share your password with anyone</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>© 2025 AsforceS Voice. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${username},

We received a password reset request for your account.

To reset your password, click the link below:
${resetUrl}

This link is valid for 1 hour and can only be used once.

If you didn't request this, change your password immediately!

© 2025 AsforceS Voice
      `,
    };
  }

  /**
   * 2FA setup template
   */
  get2FASetupEmail(username: string, lang: 'tr' | 'en' = 'tr'): EmailTemplate {
    if (lang === 'tr') {
      return {
        subject: 'İki Faktörlü Kimlik Doğrulama Aktif - AsforceS Voice',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .info { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ 2FA Aktif</h1>
              </div>
              <div class="content">
                <h2>Merhaba ${username},</h2>
                <p>Hesabınız için İki Faktörlü Kimlik Doğrulama (2FA) başarıyla etkinleştirildi.</p>
                <div class="info">
                  <strong>ℹ️ Bilgi:</strong>
                  <ul>
                    <li>Artık giriş yaparken 6 haneli doğrulama kodu girmeniz gerekecek</li>
                    <li>Kurtarma kodlarınızı güvenli bir yerde saklayın</li>
                    <li>Telefonunuzu kaybederseniz, kurtarma kodları ile giriş yapabilirsiniz</li>
                  </ul>
                </div>
                <p>Bu değişikliği siz yapmadıysanız, derhal şifrenizi değiştirin ve destek ekibimizle iletişime geçin!</p>
              </div>
              <div class="footer">
                <p>Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
                <p>© 2025 AsforceS Voice. Tüm hakları saklıdır.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Merhaba ${username},

Hesabınız için İki Faktörlü Kimlik Doğrulama (2FA) başarıyla etkinleştirildi.

Artık giriş yaparken 6 haneli doğrulama kodu girmeniz gerekecek.
Kurtarma kodlarınızı güvenli bir yerde saklayın.

Bu değişikliği siz yapmadıysanız, derhal şifrenizi değiştirin!

© 2025 AsforceS Voice
        `,
      };
    }

    // English version
    return {
      subject: 'Two-Factor Authentication Enabled - AsforceS Voice',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .info { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ 2FA Enabled</h1>
            </div>
            <div class="content">
              <h2>Hello ${username},</h2>
              <p>Two-Factor Authentication (2FA) has been successfully enabled for your account.</p>
              <div class="info">
                <strong>ℹ️ Information:</strong>
                <ul>
                  <li>You will now need to enter a 6-digit verification code when logging in</li>
                  <li>Keep your backup codes in a safe place</li>
                  <li>If you lose your phone, you can use backup codes to log in</li>
                </ul>
              </div>
              <p>If you didn't make this change, change your password immediately and contact our support team!</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>© 2025 AsforceS Voice. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${username},

Two-Factor Authentication (2FA) has been successfully enabled for your account.

You will now need to enter a 6-digit verification code when logging in.
Keep your backup codes in a safe place.

If you didn't make this change, change your password immediately!

© 2025 AsforceS Voice
      `,
    };
  }

  /**
   * 2FA disabled template
   */
  get2FADisabledEmail(username: string, lang: 'tr' | 'en' = 'tr'): EmailTemplate {
    if (lang === 'tr') {
      return {
        subject: 'İki Faktörlü Kimlik Doğrulama Devre Dışı - AsforceS Voice',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ 2FA Devre Dışı</h1>
              </div>
              <div class="content">
                <h2>Merhaba ${username},</h2>
                <p>Hesabınız için İki Faktörlü Kimlik Doğrulama (2FA) devre dışı bırakıldı.</p>
                <div class="warning">
                  <strong>⚠️ Güvenlik Uyarısı:</strong>
                  <p>2FA kapalı olduğunda hesabınız daha az güvenlidir. Hesabınızı korumak için 2FA'yı tekrar etkinleştirmenizi öneririz.</p>
                </div>
                <p>Bu değişikliği siz yapmadıysanız, derhal şifrenizi değiştirin ve destek ekibimizle iletişime geçin!</p>
              </div>
              <div class="footer">
                <p>Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.</p>
                <p>© 2025 AsforceS Voice. Tüm hakları saklıdır.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Merhaba ${username},

Hesabınız için İki Faktörlü Kimlik Doğrulama (2FA) devre dışı bırakıldı.

UYARI: 2FA kapalı olduğunda hesabınız daha az güvenlidir.

Bu değişikliği siz yapmadıysanız, derhal şifrenizi değiştirin!

© 2025 AsforceS Voice
        `,
      };
    }

    // English version
    return {
      subject: 'Two-Factor Authentication Disabled - AsforceS Voice',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ 2FA Disabled</h1>
            </div>
            <div class="content">
              <h2>Hello ${username},</h2>
              <p>Two-Factor Authentication (2FA) has been disabled for your account.</p>
              <div class="warning">
                <strong>⚠️ Security Warning:</strong>
                <p>Your account is less secure with 2FA disabled. We recommend re-enabling 2FA to protect your account.</p>
              </div>
              <p>If you didn't make this change, change your password immediately and contact our support team!</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>© 2025 AsforceS Voice. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${username},

Two-Factor Authentication (2FA) has been disabled for your account.

WARNING: Your account is less secure with 2FA disabled.

If you didn't make this change, change your password immediately!

© 2025 AsforceS Voice
      `,
    };
  }

  /**
   * Welcome email template
   */
  getWelcomeEmail(username: string, lang: 'tr' | 'en' = 'tr'): EmailTemplate {
    if (lang === 'tr') {
      return {
        subject: 'AsforceS Voice\'a Hoş Geldiniz! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .button:hover { background: #5568d3; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .feature { margin: 15px 0; padding: 15px; background: white; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎤 AsforceS Voice</h1>
                <p>Hoş Geldiniz!</p>
              </div>
              <div class="content">
                <h2>Merhaba ${username},</h2>
                <p>AsforceS Voice ailesine katıldığınız için çok mutluyuz! 🎉</p>
                <p>Hesabınız başarıyla oluşturuldu ve artık yüksek kaliteli sesli iletişimin tadını çıkarabilirsiniz.</p>
                
                <h3>🚀 Öne Çıkan Özellikler:</h3>
                <div class="feature">
                  <strong>🎙️ Push-to-Talk:</strong> Düşük gecikmeli sesli iletişim
                </div>
                <div class="feature">
                  <strong>💬 Anlık Mesajlaşma:</strong> Ses sırasında metin sohbeti
                </div>
                <div class="feature">
                  <strong>📹 Kamera & Ekran Paylaşımı:</strong> Görüntülü görüşme ve ekran paylaşımı
                </div>
                <div class="feature">
                  <strong>🔒 Güvenli:</strong> End-to-end şifreleme ile güvenli iletişim
                </div>
                
                <p>Hemen başlamak için uygulamaya giriş yapın:</p>
                <center>
                  <a href="https://app.asforces.com" class="button">Uygulamaya Giriş Yap</a>
                </center>
              </div>
              <div class="footer">
                <p>Herhangi bir sorunuz varsa, bizimle iletişime geçmekten çekinmeyin!</p>
                <p>© 2025 AsforceS Voice. Tüm hakları saklıdır.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Merhaba ${username},

AsforceS Voice ailesine katıldığınız için çok mutluyuz! 🎉

Hesabınız başarıyla oluşturuldu ve artık yüksek kaliteli sesli iletişimin tadını çıkarabilirsiniz.

Öne Çıkan Özellikler:
- Push-to-Talk: Düşük gecikmeli sesli iletişim
- Anlık Mesajlaşma: Ses sırasında metin sohbeti
- Kamera & Ekran Paylaşımı: Görüntülü görüşme ve ekran paylaşımı
- Güvenli: End-to-end şifreleme ile güvenli iletişim

Hemen başlamak için: https://app.asforces.com

© 2025 AsforceS Voice
        `,
      };
    }

    // English version
    return {
      subject: 'Welcome to AsforceS Voice! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background: #5568d3; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .feature { margin: 15px 0; padding: 15px; background: white; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎤 AsforceS Voice</h1>
              <p>Welcome!</p>
            </div>
            <div class="content">
              <h2>Hello ${username},</h2>
              <p>We're thrilled to have you join the AsforceS Voice family! 🎉</p>
              <p>Your account has been successfully created and you can now enjoy high-quality voice communication.</p>
              
              <h3>🚀 Key Features:</h3>
              <div class="feature">
                <strong>🎙️ Push-to-Talk:</strong> Low-latency voice communication
              </div>
              <div class="feature">
                <strong>💬 Instant Messaging:</strong> Text chat during voice calls
              </div>
              <div class="feature">
                <strong>📹 Camera & Screen Sharing:</strong> Video calls and screen sharing
              </div>
              <div class="feature">
                <strong>🔒 Secure:</strong> End-to-end encrypted communication
              </div>
              
              <p>Get started by logging into the app:</p>
              <center>
                <a href="https://app.asforces.com" class="button">Login to App</a>
              </center>
            </div>
            <div class="footer">
              <p>If you have any questions, don't hesitate to contact us!</p>
              <p>© 2025 AsforceS Voice. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${username},

We're thrilled to have you join the AsforceS Voice family! 🎉

Your account has been successfully created and you can now enjoy high-quality voice communication.

Key Features:
- Push-to-Talk: Low-latency voice communication
- Instant Messaging: Text chat during voice calls
- Camera & Screen Sharing: Video calls and screen sharing
- Secure: End-to-end encrypted communication

Get started: https://app.asforces.com

© 2025 AsforceS Voice
      `,
    };
  }
}
