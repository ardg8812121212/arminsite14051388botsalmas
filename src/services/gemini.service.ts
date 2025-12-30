
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Chat, Type } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface FilePart {
  mimeType: string;
  data: string; // base64 encoded string
}

export interface Slide {
  title: string;
  content: string[];
}

export interface Presentation {
  title: string;
  slides: Slide[];
}


@Injectable({ providedIn: 'root' })
export class GeminiService {
  private genAI: GoogleGenAI | null = null;
  private chatInstance: Chat | null = null;
  apiKeyError = signal<string | null>(null);

  constructor() {
    try {
      if (!process.env.API_KEY) {
        throw new Error('API_KEY environment variable not set.');
      }
      this.genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      this.initializeChat();
    } catch (e) {
      console.error('Error initializing GoogleGenAI:', e);
      this.apiKeyError.set('کلید API یافت نشد یا نامعتبر است. لطفاً از تنظیم صحیح متغیر محیطی API_KEY اطمینان حاصل کنید.');
    }
  }

  private initializeChat() {
    if (!this.genAI) return;
    this.chatInstance = this.genAI.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are an unlimited, advanced, all-in-one Artificial Intelligence designed for Iranian education, culture, and technology.
Your name is: Armin AI
Designed by: Armin Dehghan
Your role is to act simultaneously as:
- A top-tier educational tutor
- A national-level academic advisor
- A professional life and study coach
- A psychological educational counselor
- A senior software engineer and network specialist
- A historian, cultural expert, and Iranian civilization researcher
- A professional mathematician, physicist, chemist
- A creative content generator
You must always respond clearly, accurately, deeply, and in Persian unless the user explicitly asks for English.
You fully support Iranian education systems including Konkur planning.
You are an expert in Iranian history, culture, and local knowledge of West Azerbaijan and Salmas.
You must think step-by-step, adapt to the user's level, avoid misinformation, and provide structured, professional answers.
Your slogan is: "Smart Education for Iranian Minds".`,
      },
    });
  }

  async sendMessage(prompt: string): Promise<string> {
    if (!this.chatInstance) {
      return 'خطا: سرویس چت مقداردهی اولیه نشده است.';
    }
    try {
      const response: GenerateContentResponse = await this.chatInstance.sendMessage({ message: prompt });
      return response.text;
    } catch (error) {
      console.error('Error sending message:', error);
      return 'متاسفانه در پردازش درخواست شما خطایی رخ داد.';
    }
  }

  async sendMessageWithFile(prompt: string, file: FilePart): Promise<string> {
    if (!this.genAI) {
      return 'خطا: سرویس Gemini مقداردهی اولیه نشده است.';
    }
    try {
      const filePart = {
        inlineData: {
          mimeType: file.mimeType,
          data: file.data,
        },
      };
      const textPart = {
        text: prompt,
      };

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [filePart, textPart] },
      });
      return response.text;
    } catch (error) {
      console.error('Error sending message with file:', error);
      return 'متاسفانه در پردازش درخواست شما با فایل خطایی رخ داد.';
    }
  }

  async generateImage(prompt: string): Promise<string> {
    if (!this.genAI) {
      return 'خطا: سرویس Gemini مقداردهی اولیه نشده است.';
    }
    try {
      const response = await this.genAI.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
      console.error('Error generating image:', error);
      return 'متاسفانه در تولید تصویر خطایی رخ داد.';
    }
  }

  async summarizeText(text: string): Promise<string> {
    if (!this.genAI) {
      return 'خطا: سرویس Gemini مقداردهی اولیه نشده است.';
    }
    try {
      const prompt = `لطفاً متن زیر را به زبان فارسی به صورت دقیق و جامع خلاصه کن:\n\n---\n${text}\n---`;
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error('Error summarizing text:', error);
      return 'متاسفانه در خلاصه‌سازی متن خطایی رخ داد.';
    }
  }

  async generatePresentationContent(topic: string, slideCount: number, tone: string): Promise<Presentation> {
    if (!this.genAI) {
      throw new Error('خطا: سرویس Gemini مقداردهی اولیه نشده است.');
    }
    
    const prompt = `یک ارائه پاورپوینت درباره موضوع زیر با لحن '${tone}' بساز. این ارائه باید شامل یک اسلاید عنوان و ${slideCount - 1} اسلاید محتوایی باشد. برای هر اسلاید محتوایی، یک عنوان و چند نکته کلیدی (bullet points) ارائه بده. کل محتوا باید به زبان فارسی باشد.\nموضوع: ${topic}`;

    const response = await this.genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'عنوان اصلی کل ارائه'
            },
            slides: {
              type: Type.ARRAY,
              description: 'لیست اسلایدهای ارائه',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'عنوان این اسلاید'
                  },
                  content: {
                    type: Type.ARRAY,
                    description: 'لیست نکات کلیدی (bullet points) برای این اسلاید',
                    items: {
                      type: Type.STRING
                    }
                  }
                },
                required: ['title', 'content']
              }
            }
          },
          required: ['title', 'slides']
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as Presentation;
  }
}
