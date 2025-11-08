import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { EmailTemplates } from './services/email-templates';
import { CaptchaService } from './services/captcha.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EmailService, EmailTemplates, CaptchaService],
  exports: [EmailService, EmailTemplates, CaptchaService],
})
export class CommonModule {}
