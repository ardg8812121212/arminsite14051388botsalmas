
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ChatMessage, FilePart } from '../../services/gemini.service';

@Component({
  selector: 'app-file-qna',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-qna.component.html',
  styleUrls: ['./file-qna.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileQnaComponent {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  geminiService = inject(GeminiService);

  uploadedFile = signal<({ name: string } & FilePart) | null>(null);
  messages = signal<ChatMessage[]>([]);
  currentMessage = signal('');
  isLoading = signal(false);
  apiKeyError = this.geminiService.apiKeyError;
  fileError = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.messages().length) {
        this.scrollToBottom();
      }
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const file = input.files[0];
    
    if (file.size > 10 * 1024 * 1024) { // 10 MB limit
      this.fileError.set('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.');
      return;
    }

    this.fileError.set(null);
    this.messages.set([]); // Reset chat on new file upload

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64String = e.target.result.split(',')[1];
      this.uploadedFile.set({
        name: file.name,
        mimeType: file.type,
        data: base64String,
      });
    };
    reader.onerror = () => {
        this.fileError.set('خطا در خواندن فایل.');
    };
    reader.readAsDataURL(file);
  }

  async sendMessage() {
    const userMessage = this.currentMessage().trim();
    const fileData = this.uploadedFile();

    if (!userMessage || !fileData || this.isLoading()) return;

    this.messages.update(msgs => [...msgs, { role: 'user', text: userMessage }]);
    this.currentMessage.set('');
    this.isLoading.set(true);
    this.scrollToBottom();

    try {
        const fullPrompt = `با توجه به فایل آپلود شده به نام "${fileData.name}"، به سوال زیر پاسخ بده:\n\n${userMessage}`;
        const responseText = await this.geminiService.sendMessageWithFile(fullPrompt, fileData);
        this.messages.update(msgs => [...msgs, { role: 'model', text: responseText }]);
    } catch (error) {
        this.messages.update(msgs => [...msgs, { role: 'model', text: 'خطا در ارتباط با سرویس' }]);
    } finally {
        this.isLoading.set(false);
        this.scrollToBottom();
    }
  }

  removeFile(): void {
    this.uploadedFile.set(null);
    this.messages.set([]);
    this.currentMessage.set('');
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  }

  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }, 0);
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }
}
