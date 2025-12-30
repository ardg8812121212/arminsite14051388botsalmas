
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-image-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-generator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageGeneratorComponent {
  geminiService = inject(GeminiService);
  prompt = signal('');
  imageUrl = signal<string | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  apiKeyError = this.geminiService.apiKeyError;

  async generateImage() {
    const userPrompt = this.prompt().trim();
    if (!userPrompt || this.isLoading()) return;

    this.isLoading.set(true);
    this.imageUrl.set(null);
    this.error.set(null);

    try {
      const result = await this.geminiService.generateImage(userPrompt);
      if (result.startsWith('data:image')) {
        this.imageUrl.set(result);
      } else {
        this.error.set(result);
      }
    } catch (e) {
      this.error.set('یک خطای غیرمنتظره رخ داد.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
