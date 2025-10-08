import { Course } from '../components/Course/CourseCard';
import { ShareAnalytics } from './shareAnalytics';

export interface ShareData {
  url: string;
  title: string;
  text: string;
  image?: string;
}

export interface ShareOptions {
  platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'email' | 'copy' | 'native';
  data: ShareData;
}

export class ShareService {
  private static baseUrl = window.location.origin;

  /**
   * Generate shareable URL for a course
   */
  static generateCourseUrl(courseId: string): string {
    return `${this.baseUrl}/courses/${courseId}/preview`;
  }

  /**
   * Generate share data for a course
   */
  static generateCourseShareData(course: Course): ShareData {
    const url = this.generateCourseUrl(course.id);
    const title = `${course.title} - Online Course`;
    const text = `Check out this ${course.level.toLowerCase()} level course: "${course.title}" by ${course.instructor.name}. ${course.description.substring(0, 100)}...`;
    
    return {
      url,
      title,
      text,
      image: course.thumbnail
    };
  }

  /**
   * Check if native web share API is available
   */
  static isNativeShareSupported(): boolean {
    return 'share' in navigator && 'canShare' in navigator;
  }

  /**
   * Share using native web share API (mobile devices)
   */
  static async shareNative(data: ShareData): Promise<boolean> {
    try {
      if (!this.isNativeShareSupported()) {
        return false;
      }

      const shareData = {
        title: data.title,
        text: data.text,
        url: data.url
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Native share failed:', error);
      return false;
    }
  }

  /**
   * Copy URL to clipboard
   */
  static async copyToClipboard(url: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      return false;
    }
  }

  /**
   * Share on Twitter
   */
  static shareOnTwitter(data: ShareData): void {
    const text = encodeURIComponent(`${data.text}\n\n${data.url}`);
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    this.openShareWindow(url, 'twitter');
  }

  /**
   * Share on Facebook
   */
  static shareOnFacebook(data: ShareData): void {
    const url = encodeURIComponent(data.url);
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    this.openShareWindow(shareUrl, 'facebook');
  }

  /**
   * Share on LinkedIn
   */
  static shareOnLinkedIn(data: ShareData): void {
    const url = encodeURIComponent(data.url);
    const title = encodeURIComponent(data.title);
    const summary = encodeURIComponent(data.text);
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`;
    this.openShareWindow(shareUrl, 'linkedin');
  }

  /**
   * Share on WhatsApp
   */
  static shareOnWhatsApp(data: ShareData): void {
    const text = encodeURIComponent(`${data.text}\n\n${data.url}`);
    const shareUrl = `https://wa.me/?text=${text}`;
    this.openShareWindow(shareUrl, 'whatsapp');
  }

  /**
   * Share via Email
   */
  static shareViaEmail(data: ShareData): void {
    const subject = encodeURIComponent(data.title);
    const body = encodeURIComponent(`${data.text}\n\nView course: ${data.url}`);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  }

  /**
   * Open sharing popup window
   */
  private static openShareWindow(url: string, platform: string): void {
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2 + window.screenX;
    const top = (window.innerHeight - height) / 2 + window.screenY;
    
    const features = `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`;
    
    window.open(url, `share-${platform}`, features);
  }

  /**
   * Main share function that routes to appropriate sharing method
   */
  static async share(options: ShareOptions): Promise<boolean> {
    const { platform, data } = options;

    try {
      switch (platform) {
        case 'native':
          return await this.shareNative(data);
        
        case 'copy':
          return await this.copyToClipboard(data.url);
        
        case 'twitter':
          this.shareOnTwitter(data);
          return true;
        
        case 'facebook':
          this.shareOnFacebook(data);
          return true;
        
        case 'linkedin':
          this.shareOnLinkedIn(data);
          return true;
        
        case 'whatsapp':
          this.shareOnWhatsApp(data);
          return true;
        
        case 'email':
          this.shareViaEmail(data);
          return true;
        
        default:
          console.error('Unsupported sharing platform:', platform);
          return false;
      }
    } catch (error) {
      console.error(`Sharing on ${platform} failed:`, error);
      return false;
    }
  }

  /**
   * Track sharing events for analytics
   */
  static trackShare(courseId: string, platform: string, course?: Course): void {
    ShareAnalytics.trackShare({
      courseId,
      platform,
      courseTitle: course?.title,
      courseCategory: course?.category,
      courseLevel: course?.level,
      coursePrice: course?.price,
    });
  }

  /**
   * Get available sharing platforms based on device capabilities
   */
  static getAvailablePlatforms(): string[] {
    const platforms = ['twitter', 'facebook', 'linkedin', 'whatsapp', 'email', 'copy'];
    
    if (this.isNativeShareSupported()) {
      platforms.unshift('native');
    }
    
    return platforms;
  }

  /**
   * Get platform display information
   */
  static getPlatformInfo(platform: string): { name: string; icon: string; color: string } {
    const platformInfo = {
      native: { name: 'Share', icon: 'Share', color: '#666' },
      copy: { name: 'Copy Link', icon: 'ContentCopy', color: '#666' },
      twitter: { name: 'Twitter', icon: 'Twitter', color: '#1DA1F2' },
      facebook: { name: 'Facebook', icon: 'Facebook', color: '#1877F2' },
      linkedin: { name: 'LinkedIn', icon: 'LinkedIn', color: '#0A66C2' },
      whatsapp: { name: 'WhatsApp', icon: 'WhatsApp', color: '#25D366' },
      email: { name: 'Email', icon: 'Email', color: '#666' }
    };

    return platformInfo[platform as keyof typeof platformInfo] || { name: platform, icon: 'Share', color: '#666' };
  }
}