
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ChatMessage } from '../../services/gemini.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  geminiService = inject(GeminiService);
  
  messages = signal<ChatMessage[]>([]);
  currentMessage = signal('');
  isLoading = signal(false);
  apiKeyError = this.geminiService.apiKeyError;

  constructor() {
    effect(() => {
      if (this.messages().length) {
        this.scrollToBottom();
      }
    });
  }

  async sendMessage() {
    const userMessage = this.currentMessage().trim();
    if (!userMessage || this.isLoading()) return;

    // Add user message to chat
    this.messages.update(msgs => [...msgs, { role: 'user', text: userMessage }]);
    this.currentMessage.set('');
    this.isLoading.set(true);

    this.scrollToBottom();
    
    // Get AI response
    try {
      const responseText = await this.geminiService.sendMessage(userMessage);
      this.messages.update(msgs => [...msgs, { role: 'model', text: responseText }]);
    } catch (error) {
      this.messages.update(msgs => [...msgs, { role: 'model', text: 'خطا در ارتباط با سرویس' }]);
    } finally {
      this.isLoading.set(false);
      this.scrollToBottom();
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
